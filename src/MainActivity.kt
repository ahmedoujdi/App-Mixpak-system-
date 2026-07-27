package com.karachi.iptvplayer

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import com.karachi.iptvplayer.databinding.ActivityMainBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

private enum class LoadMode { WEB, STREAM, PLAYLIST, XTREAM }

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var playlistManager: PlaylistManager
    private lateinit var channelAdapter: ChannelAdapter
    private lateinit var channelRowAdapter: ChannelRowAdapter
    private lateinit var playlistAdapter: PlaylistAdapter
    private lateinit var channelPrefsManager: ChannelPrefsManager
    private lateinit var epgManager: EpgManager
    private lateinit var profileManager: ProfileManager
    private var lastXtreamCredentials: XtreamClient.Credentials? = null

    private var allChannels: List<Channel> = emptyList()
    private var currentMode: LoadMode = LoadMode.WEB
    private var selectedCategory: String? = null

    private var recoveringPlaylist: PlaylistManager.SavedPlaylist? = null

    /** URI del archivo local actualmente cargado, solo si tenemos permiso de
     * ESCRITURA sobre él (para poder ofrecer "Guardar en el archivo original"). */
    private var writableLocalFileUri: Uri? = null

    private val filePicker =
        registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.OpenDocument()) { uri ->
            uri?.let {
                // Sin esto, Android retira el permiso de lectura pasado un
                // tiempo o al reiniciar la app, y las listas locales
                // guardadas fallan con "Permission Denial". Pedimos también
                // ESCRITURA para poder ofrecer "Guardar en el archivo
                // original"; si el proveedor de archivos no la concede
                // (algunos gestores no la dan), simplemente no se ofrecerá
                // esa opción para este archivo y solo quedará "Exportar como
                // nuevo M3U", que funciona siempre.
                val gotWrite = runCatching {
                    contentResolver.takePersistableUriPermission(
                        it,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    )
                }.isSuccess
                if (!gotWrite) {
                    runCatching { contentResolver.takePersistableUriPermission(it, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
                }
                val recovering = recoveringPlaylist
                recoveringPlaylist = null
                if (recovering != null) {
                    playlistManager.replacePlaylistUri(recovering.sourceUri, it.toString())
                    playlistAdapter.updateData(playlistManager.getSavedPlaylists())
                }
                writableLocalFileUri = if (gotWrite) it else null
                loadPlaylistFromLocalUri(it, existingPlaylist = recovering)
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        playlistManager = PlaylistManager(this)
        profileManager = ProfileManager(this)
        channelPrefsManager = ChannelPrefsManager(this, profileManager.getCurrentProfile())
        epgManager = EpgManager(this)

        channelAdapter = ChannelAdapter(
            emptyList(),
            prefsManager = channelPrefsManager,
            epgManager = epgManager,
            onLongClick = { position -> showChannelOptionsMenu(channelAdapter.getChannelAt(position)) },
            onSelectionChanged = { count -> updateSelectionActionBar(count) }
        ) { position -> openPlayer(channelAdapter.getChannelAt(position)) }
        binding.channelRecycler.layoutManager = GridLayoutManager(this, spanCountForScreen())
        binding.channelRecycler.adapter = channelAdapter

        channelRowAdapter = ChannelRowAdapter(
            emptyList(),
            prefsManager = channelPrefsManager,
            epgManager = epgManager,
            onChannelClick = { channel -> openPlayer(channel) },
            onChannelLongClick = { channel -> showChannelOptionsMenu(channel, allowMultiSelect = false) }
        )
        binding.channelRowsRecycler.layoutManager =
            androidx.recyclerview.widget.LinearLayoutManager(this)
        binding.channelRowsRecycler.adapter = channelRowAdapter

        playlistAdapter = PlaylistAdapter(
            playlists = playlistManager.getSavedPlaylists(),
            onClick = { openSavedPlaylist(it) },
            onRename = { showRenameDialog(it) },
            onDelete = { deletePlaylist(it) }
        )
        binding.playlistRecycler.layoutManager =
            androidx.recyclerview.widget.LinearLayoutManager(this)
        binding.playlistRecycler.adapter = playlistAdapter

        setupModeSelector()
        setupSelectionActionBar()

        binding.btnLoadUrl.setOnClickListener { onLoadUrlClicked() }
        binding.btnPickFile.setOnClickListener {
            filePicker.launch(arrayOf("audio/x-mpegurl", "application/x-mpegurl", "*/*"))
        }

        binding.searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                applyFilters(s?.toString().orEmpty())
            }
            override fun afterTextChanged(s: Editable?) {}
        })
        // En Android TV el foco (mando a distancia) o el clic no abren el teclado
        // en pantalla por sí solos: hay que pedírselo explícitamente al sistema.
        KeyboardUtils.attachTvKeyboardFix(this, binding.searchInput)
        KeyboardUtils.attachTvKeyboardFix(this, binding.urlInput)
        KeyboardUtils.attachTvKeyboardFix(this, binding.xtreamServer)
        KeyboardUtils.attachTvKeyboardFix(this, binding.xtreamUser)
        KeyboardUtils.attachTvKeyboardFix(this, binding.xtreamPass)

        binding.btnSettings.setOnClickListener { showAppSettingsMenu() }
        binding.profileNameLabel.setOnClickListener { showProfileSwitcher() }
        updateProfileLabel()

        updatePlaylistsVisibility()
        if (!handleViewIntent(intent)) {
            loadLastPlaylistIfAny()
        }
        checkForAppUpdate()
    }

    /**
     * Si la app se abrió mediante "Abrir con" (un archivo .m3u/.m3u8 desde el
     * gestor de archivos, o un enlace http(s) que acabe en esa extensión),
     * carga esa lista directamente en vez de restaurar la última que tenías
     * abierta. Devuelve true si había algo que abrir así.
     */
    private fun handleViewIntent(intent: Intent): Boolean {
        if (intent.action != Intent.ACTION_VIEW) return false
        val uri = intent.data ?: return false
        return when (uri.scheme?.lowercase()) {
            "http", "https" -> {
                loadPlaylistFromUrl(uri.toString())
                true
            }
            "content", "file" -> {
                // No todos los gestores de archivos conceden permiso
                // persistente; si no se puede, seguimos igual con el permiso
                // puntual que ya viene con este intent. Aquí solo pedimos
                // lectura, así que "Guardar en el archivo original" no
                // estará disponible para un archivo abierto así.
                runCatching {
                    contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                writableLocalFileUri = null
                loadPlaylistFromLocalUri(uri)
                true
            }
            else -> false
        }
    }

    private fun updateSelectionActionBar(count: Int) {
        if (count <= 0) {
            binding.selectionActionBar.visibility = View.GONE
            return
        }
        binding.selectionActionBar.visibility = View.VISIBLE
        binding.selectionCountLabel.text = if (count == 1) "1 canal seleccionado" else "$count canales seleccionados"
    }

    private fun setupSelectionActionBar() {
        binding.btnSelectionCancel.setOnClickListener {
            channelAdapter.exitSelectionMode()
            binding.selectionActionBar.visibility = View.GONE
        }
        binding.btnSelectionFavorite.setOnClickListener {
            val selected = channelAdapter.getSelectedChannels()
            selected.forEach { channel ->
                if (!channelPrefsManager.isFavorite(ChannelPrefsManager.keyOf(channel))) {
                    channelPrefsManager.toggleFavorite(ChannelPrefsManager.keyOf(channel))
                }
            }
            Toast.makeText(this, "${selected.size} canales añadidos a favoritos", Toast.LENGTH_SHORT).show()
            channelAdapter.exitSelectionMode()
            binding.selectionActionBar.visibility = View.GONE
            applyFilters(binding.searchInput.text?.toString().orEmpty())
        }
        binding.btnSelectionHide.setOnClickListener {
            val selected = channelAdapter.getSelectedChannels()
            AlertDialog.Builder(this)
                .setTitle("Ocultar canales")
                .setMessage("¿Ocultar ${selected.size} canales seleccionados para siempre? Podrás recuperarlos desde Ajustes.")
                .setPositiveButton("Ocultar") { _, _ ->
                    selected.forEach { channelPrefsManager.hideChannel(it) }
                    channelAdapter.exitSelectionMode()
                    binding.selectionActionBar.visibility = View.GONE
                    applyFilters(binding.searchInput.text?.toString().orEmpty())
                    Toast.makeText(this, "${selected.size} canales ocultados", Toast.LENGTH_SHORT).show()
                }
                .setNegativeButton(R.string.cancel, null)
                .show()
        }
    }

    private val isTv: Boolean by lazy {
        (getSystemService(UI_MODE_SERVICE) as android.app.UiModeManager)
            .currentModeType == android.content.res.Configuration.UI_MODE_TYPE_TELEVISION
    }

    private fun spanCountForScreen(): Int {
        if (isTv) return 5
        // En móvil ahora se puede navegar tanto en vertical como en horizontal
        // (antes estaba forzado a horizontal), así que las columnas se ajustan
        // al ancho real en vez de quedar fijas en 3 siempre.
        val widthDp = resources.configuration.screenWidthDp
        return (widthDp / 160).coerceIn(2, 4)
    }

    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        // Al girar el móvil recalculamos las columnas del grid de canales.
        (binding.channelRecycler.layoutManager as? GridLayoutManager)?.spanCount = spanCountForScreen()
    }

    // ---------------------- Selector de modo ----------------------

    private fun setupModeSelector() {
        binding.modeUrlWeb.setOnClickListener { selectMode(LoadMode.WEB) }
        binding.modeStream.setOnClickListener { selectMode(LoadMode.STREAM) }
        binding.modePlaylist.setOnClickListener { selectMode(LoadMode.PLAYLIST) }
        binding.modeXtream.setOnClickListener { selectMode(LoadMode.XTREAM) }
        binding.btnXtreamConnect.setOnClickListener { onXtreamConnectClicked() }
        selectMode(LoadMode.WEB)
    }

    private fun selectMode(mode: LoadMode) {
        currentMode = mode
        val chips = listOf(
            binding.modeUrlWeb to LoadMode.WEB,
            binding.modeStream to LoadMode.STREAM,
            binding.modePlaylist to LoadMode.PLAYLIST,
            binding.modeXtream to LoadMode.XTREAM
        )
        chips.forEach { (view, chipMode) ->
            val active = chipMode == mode
            view.setBackgroundResource(if (active) R.drawable.bg_chip_active_selector else R.drawable.bg_chip_inactive_selector)
            view.setTextColor(
                resources.getColor(
                    if (active) R.color.text_primary else R.color.text_secondary,
                    theme
                )
            )
        }
        binding.simpleUrlRow.visibility = if (mode == LoadMode.XTREAM) View.GONE else View.VISIBLE
        binding.xtreamRow.visibility = if (mode == LoadMode.XTREAM) View.VISIBLE else View.GONE
        binding.urlInput.hint = when (mode) {
            LoadMode.WEB -> getString(R.string.web_url_hint)
            LoadMode.STREAM -> getString(R.string.stream_url_hint)
            LoadMode.PLAYLIST -> getString(R.string.playlist_url_hint)
            LoadMode.XTREAM -> ""
        }
    }

    private fun onLoadUrlClicked() {
        val url = binding.urlInput.text.toString().trim()
        if (url.isEmpty()) {
            Toast.makeText(this, R.string.playlist_url_hint, Toast.LENGTH_SHORT).show()
            return
        }
        when (currentMode) {
            LoadMode.STREAM -> playDirectStream(url)
            LoadMode.WEB, LoadMode.PLAYLIST -> loadPlaylistFromUrl(url)
            LoadMode.XTREAM -> Unit
        }
    }

    private fun onXtreamConnectClicked() {
        val server = binding.xtreamServer.text?.toString()?.trim().orEmpty()
        val user = binding.xtreamUser.text?.toString()?.trim().orEmpty()
        val pass = binding.xtreamPass.text?.toString()?.trim().orEmpty()
        if (server.isEmpty() || user.isEmpty() || pass.isEmpty()) {
            Toast.makeText(this, "Rellena servidor, usuario y contraseña", Toast.LENGTH_SHORT).show()
            return
        }
        connectXtream(XtreamClient.Credentials(server, user, pass), saveName = null)
    }

    private fun connectXtream(credentials: XtreamClient.Credentials, saveName: String?) {
        lastXtreamCredentials = credentials
        binding.progress.visibility = View.VISIBLE
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val channels = XtreamClient.fetchLiveChannels(credentials)
                withContext(Dispatchers.Main) {
                    onChannelsLoaded(channels)
                    val name = saveName ?: "Xtream: ${credentials.username}@${credentials.server}"
                    playlistManager.addPlaylist(name, credentials.toSourceUri(), channels.size)
                    playlistAdapter.updateData(playlistManager.getSavedPlaylists())
                    updatePlaylistsVisibility()
                    // El propio panel Xtream suele traer su propia guía EPG.
                    if (epgManager.getSavedEpgUrl().isNullOrBlank()) {
                        epgManager.saveEpgUrl(XtreamClient.epgUrlFor(credentials))
                    }
                }
                runCatching { XtreamClient.fetchAccountInfo(credentials) }.getOrNull()?.let { info ->
                    withContext(Dispatchers.Main) { showXtreamAccountStatus(info) }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.progress.visibility = View.GONE
                    Toast.makeText(this@MainActivity, "Error Xtream: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    // ---------------------- Carga de contenido ----------------------

    private fun playDirectStream(url: String) {
        writableLocalFileUri = null
        val channel = Channel(name = "Stream directo", url = url, group = "Directo")
        val intent = Intent(this, PlayerActivity::class.java).apply {
            putStringArrayListExtra(
                PlayerActivity.EXTRA_CHANNELS_SIMPLE,
                arrayListOf("${channel.name}|||${channel.url}|||${channel.group}")
            )
            putExtra(PlayerActivity.EXTRA_START_INDEX, 0)
        }
        startActivity(intent)
    }

    private fun loadPlaylistFromUrl(url: String, playlistName: String? = null) {
        writableLocalFileUri = null
        binding.progress.visibility = View.VISIBLE
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val channels = M3UParser.parseFromUrl(url)
                withContext(Dispatchers.Main) {
                    onChannelsLoaded(channels)
                    playlistManager.addPlaylist(
                        playlistName ?: "Lista ${playlistManager.getSavedPlaylists().size + 1}",
                        url,
                        channels.size
                    )
                    playlistAdapter.updateData(playlistManager.getSavedPlaylists())
                    updatePlaylistsVisibility()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.progress.visibility = View.GONE
                    Toast.makeText(this@MainActivity, "Error al cargar la lista: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun loadPlaylistFromLocalUri(uri: Uri, existingPlaylist: PlaylistManager.SavedPlaylist? = null) {
        binding.progress.visibility = View.VISIBLE
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val inputStream = contentResolver.openInputStream(uri)
                    ?: throw IllegalStateException("No se pudo abrir el archivo")
                val channels = M3UParser.parse(inputStream)
                withContext(Dispatchers.Main) {
                    onChannelsLoaded(channels)
                    if (existingPlaylist != null) {
                        // Ya estaba guardada: solo refrescamos su recuento de canales.
                        playlistManager.addPlaylist(existingPlaylist.name, uri.toString(), channels.size)
                    } else {
                        playlistManager.addPlaylist(
                            "Archivo local ${playlistManager.getSavedPlaylists().size + 1}",
                            uri.toString(),
                            channels.size
                        )
                    }
                    playlistAdapter.updateData(playlistManager.getSavedPlaylists())
                    updatePlaylistsVisibility()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.progress.visibility = View.GONE
                    val isPermissionError = e is SecurityException ||
                        e.message?.contains("Permission Denial", ignoreCase = true) == true
                    if (isPermissionError && existingPlaylist != null) {
                        offerToReselectFile(existingPlaylist)
                    } else {
                        Toast.makeText(this@MainActivity, "Error al leer el archivo: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }

    private fun offerToReselectFile(playlist: PlaylistManager.SavedPlaylist) {
        AlertDialog.Builder(this)
            .setTitle("Ya no tienes acceso a este archivo")
            .setMessage("\"${playlist.name}\" se guardó hace tiempo y Android retiró el permiso para leerlo. Selecciónalo de nuevo y quedará arreglado para siempre.")
            .setPositiveButton("Seleccionar de nuevo") { _, _ ->
                recoveringPlaylist = playlist
                filePicker.launch(arrayOf("audio/x-mpegurl", "application/x-mpegurl", "*/*"))
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun loadLastPlaylistIfAny() {
        val saved = playlistManager.getSavedPlaylists()
        if (saved.isEmpty()) {
            binding.emptyState.visibility = View.VISIBLE
            return
        }
        openSavedPlaylist(saved.last())
    }

    private fun openSavedPlaylist(item: PlaylistManager.SavedPlaylist) {
        val xtreamCreds = XtreamClient.Credentials.fromSourceUri(item.sourceUri)
        when {
            xtreamCreds != null -> {
                writableLocalFileUri = null
                connectXtream(xtreamCreds, saveName = item.name)
            }
            item.sourceUri.startsWith("http") -> loadPlaylistFromUrl(item.sourceUri)
            else -> {
                val uri = Uri.parse(item.sourceUri)
                // No basta con que sea un archivo local: hay que comprobar si
                // Android todavía nos tiene concedido el permiso de ESCRITURA
                // sobre esa URI en concreto (se pidió al elegirlo la primera vez).
                val hasWrite = contentResolver.persistedUriPermissions.any { it.uri == uri && it.isWritePermission }
                writableLocalFileUri = if (hasWrite) uri else null
                loadPlaylistFromLocalUri(uri, existingPlaylist = item)
            }
        }
    }

    private fun showRenameDialog(item: PlaylistManager.SavedPlaylist) {
        val input = EditText(this)
        input.setText(item.name)
        KeyboardUtils.attachTvKeyboardFix(this, input)
        val dialog = AlertDialog.Builder(this)
            .setTitle(R.string.rename_playlist)
            .setView(input)
            .setPositiveButton(R.string.save) { _, _ ->
                val newName = input.text.toString().trim()
                if (newName.isNotEmpty()) {
                    playlistManager.renamePlaylist(item.sourceUri, newName)
                    playlistAdapter.updateData(playlistManager.getSavedPlaylists())
                }
            }
            .setNegativeButton(android.R.string.cancel, null)
            .create()
        dialog.setOnShowListener { KeyboardUtils.showKeyboard(this, input) }
        dialog.show()
    }

    private fun deletePlaylist(item: PlaylistManager.SavedPlaylist) {
        playlistManager.removePlaylist(item.sourceUri)
        playlistAdapter.updateData(playlistManager.getSavedPlaylists())
        updatePlaylistsVisibility()
    }

    private fun updatePlaylistsVisibility() {
        val hasPlaylists = playlistManager.getSavedPlaylists().isNotEmpty()
        binding.myPlaylistsLabel.visibility = if (hasPlaylists) View.VISIBLE else View.GONE
    }

    // ---------------------- Canales / categorías / búsqueda ----------------------

    private fun onChannelsLoaded(channels: List<Channel>) {
        binding.progress.visibility = View.GONE
        binding.emptyState.visibility = if (channels.isEmpty()) View.VISIBLE else View.GONE
        binding.searchInput.visibility = if (channels.isEmpty()) View.GONE else View.VISIBLE
        allChannels = channels
        selectedCategory = null
        buildCategoryChips(channels)
        applyFilters(binding.searchInput.text?.toString().orEmpty())
        maybeLoadEpg()
    }

    /** Carga la guía EPG en segundo plano: usa la que venga indicada en la propia
     * lista M3U si la trae, o si no, la que el usuario haya configurado a mano. */
    private fun maybeLoadEpg() {
        val epgUrl = M3UParser.lastDetectedEpgUrl ?: epgManager.getSavedEpgUrl() ?: return
        if (M3UParser.lastDetectedEpgUrl != null) {
            epgManager.saveEpgUrl(epgUrl)
        }
        CoroutineScope(Dispatchers.IO).launch {
            runCatching { epgManager.loadIfNeeded(epgUrl) }
            withContext(Dispatchers.Main) {
                channelAdapter.notifyDataSetChanged()
            }
        }
    }

    private fun buildCategoryChips(channels: List<Channel>) {
        val container = binding.categoryContainer
        container.removeAllViews()

        if (channels.isEmpty()) {
            binding.categoryScroll.visibility = View.GONE
            return
        }
        binding.categoryScroll.visibility = View.VISIBLE

        val groups = channels.map { it.group }.distinct().sorted()
        val inflater = layoutInflater

        fun addChip(label: String, isAll: Boolean, isFavorites: Boolean = false, isRecent: Boolean = false, isArabic: Boolean = false) {
            val chip = inflater.inflate(R.layout.item_category_chip, container, false) as TextView
            val locked = !isAll && !isFavorites && !isRecent && !isArabic && channelPrefsManager.isCategoryLocked(label)
            chip.text = if (locked) "🔒 $label" else label
            val isSelected = when {
                isAll -> selectedCategory == null
                isFavorites -> selectedCategory == FAVORITES_CATEGORY
                isRecent -> selectedCategory == RECENT_CATEGORY
                isArabic -> selectedCategory == ARABIC_CATEGORY
                else -> selectedCategory == label
            }
            chip.setBackgroundResource(if (isSelected) R.drawable.bg_chip_active_selector else R.drawable.bg_chip_inactive_selector)
            chip.setOnClickListener {
                val target = when {
                    isAll -> null
                    isFavorites -> FAVORITES_CATEGORY
                    isRecent -> RECENT_CATEGORY
                    isArabic -> ARABIC_CATEGORY
                    else -> label
                }
                fun applySelection() {
                    selectedCategory = target
                    buildCategoryChips(allChannels)
                    applyFilters(binding.searchInput.text?.toString().orEmpty())
                }
                if (locked) requirePinThen { applySelection() } else applySelection()
            }
            container.addView(chip)
        }

        addChip(getString(R.string.all_categories), isAll = true)
        addChip("★ " + getString(R.string.favorites), isAll = false, isFavorites = true)
        if (channelPrefsManager.getRecentChannelUrls().isNotEmpty()) {
            addChip("🕐 Recientes", isAll = false, isRecent = true)
        }
        // Filtro rápido: solo aparece si la lista cargada trae canales en árabe
        // (detectado por el propio texto, sin depender de que el group-title lo indique).
        if (channels.any { PublicSourcesCatalog.containsArabicScript(it.name) || PublicSourcesCatalog.containsArabicScript(it.group) }) {
            addChip("🕌 Árabe", isAll = false, isArabic = true)
        }
        groups.forEach { group -> addChip(group, isAll = false) }
    }

    private fun applyFilters(query: String) {
        var filtered = allChannels.filterNot { channelPrefsManager.isHidden(ChannelPrefsManager.keyOf(it)) }
        when (selectedCategory) {
            null -> Unit
            FAVORITES_CATEGORY -> filtered = filtered.filter {
                channelPrefsManager.isFavorite(ChannelPrefsManager.keyOf(it))
            }
            RECENT_CATEGORY -> {
                val recentUrls = channelPrefsManager.getRecentChannelUrls()
                filtered = filtered.filter { it.url in recentUrls }
                    .sortedBy { recentUrls.indexOf(it.url) }
            }
            ARABIC_CATEGORY -> filtered = filtered.filter {
                PublicSourcesCatalog.containsArabicScript(it.name) || PublicSourcesCatalog.containsArabicScript(it.group)
            }
            else -> filtered = filtered.filter { it.group == selectedCategory }
        }
        // Los números de canal se calculan sobre la lista completa (sin
        // ocultos, en tu orden), para que buscar "5" encuentre el mismo
        // canal número 5 que ves en pantalla, sea cual sea la categoría o
        // el filtro que tengas activo ahora mismo.
        val numbers = channelNumbersByUrl()
        if (query.isNotBlank()) {
            val queryAsNumber = query.trim().toIntOrNull()
            filtered = filtered.filter {
                it.name.contains(query, ignoreCase = true) ||
                    (queryAsNumber != null && numbers[it.url] == queryAsNumber)
            }
        }

        // "Recientes" ya tiene su propio orden con sentido (más reciente primero);
        // en el resto de vistas respetamos el orden que el usuario haya elegido a
        // mano con "Subir/Bajar puesto".
        if (selectedCategory != RECENT_CATEGORY) {
            filtered = applyCustomOrder(filtered)
        }

        val showRows = isTv && selectedCategory == null && query.isBlank()
        if (showRows) {
            binding.channelRecycler.visibility = View.GONE
            binding.channelRowsRecycler.visibility = View.VISIBLE
            updateChannelRows(filtered, numbers)
        } else {
            binding.channelRowsRecycler.visibility = View.GONE
            binding.channelRecycler.visibility = View.VISIBLE
            channelAdapter.updateData(filtered, numbers)
        }
    }

    /** Reordena según lo que el usuario haya movido a mano; los canales sin mover mantienen su orden original. */
    private fun applyCustomOrder(list: List<Channel>): List<Channel> {
        val customOrder = channelPrefsManager.getCustomOrder()
        if (customOrder.isEmpty()) return list
        val customIndex = customOrder.withIndex().associate { (i, url) -> url to i }
        val originalIndex = allChannels.withIndex().associate { (i, ch) -> ch.url to i }
        return list.sortedBy { ch -> customIndex[ch.url] ?: (customOrder.size + (originalIndex[ch.url] ?: 0)) }
    }

    /** El orden completo de "Todos" (sin filtrar) tal como se ve ahora mismo, para poder mover un canal dentro de él. */
    private fun effectiveFullOrder(): List<String> = effectiveChannelList().map { it.url }

    /** Número de canal (1, 2, 3…) de cada URL según el orden efectivo actual, para mostrarlo como un receptor real. */
    private fun channelNumbersByUrl(): Map<String, Int> =
        effectiveChannelList().withIndex().associate { (i, ch) -> ch.url to (i + 1) }

    /** Sube o baja un canal un puesto dentro del orden general (independiente de qué categoría/búsqueda esté activa ahora mismo). */
    private fun moveChannelInOrder(channel: Channel, delta: Int) {
        val order = effectiveFullOrder().toMutableList()
        val from = order.indexOf(channel.url)
        if (from < 0) return
        val to = (from + delta).coerceIn(0, order.size - 1)
        if (to == from) return
        order.removeAt(from)
        order.add(to, channel.url)
        channelPrefsManager.saveCustomOrder(order)
        applyFilters(binding.searchInput.text?.toString().orEmpty())
    }

    private fun confirmResetChannelOrder() {
        AlertDialog.Builder(this)
            .setTitle("Restablecer orden de canales")
            .setMessage("¿Deshacer todos los \"Subir/Bajar puesto\" y volver al orden original de la lista?")
            .setPositiveButton("Restablecer") { _, _ ->
                channelPrefsManager.clearCustomOrder()
                applyFilters(binding.searchInput.text?.toString().orEmpty())
                Toast.makeText(this, "Orden restablecido", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    /**
     * Reordena todos los canales de la A a la Z de golpe (como un "truco"
     * rápido para tener algo de orden en listas grandes sin mover uno a
     * uno). Se guarda igual que si lo hubieras hecho a mano con
     * "Subir/Bajar puesto", así que después puedes seguir ajustando algún
     * canal suelto sin perder el orden alfabético del resto.
     */
    private fun confirmSortAlphabetically() {
        if (allChannels.isEmpty()) {
            Toast.makeText(this, "Carga una lista de canales primero", Toast.LENGTH_SHORT).show()
            return
        }
        AlertDialog.Builder(this)
            .setTitle("Ordenar de la A a la Z")
            .setMessage("Esto reordena todos tus canales alfabéticamente, sustituyendo el orden que tengas ahora. Luego puedes seguir moviendo canales sueltos con \"Subir/Bajar puesto\" sin perder este orden.")
            .setPositiveButton("Ordenar") { _, _ ->
                val sortedUrls = effectiveChannelList()
                    .sortedWith(compareBy(String.CASE_INSENSITIVE_ORDER) { it.name })
                    .map { it.url }
                channelPrefsManager.saveCustomOrder(sortedUrls)
                applyFilters(binding.searchInput.text?.toString().orEmpty())
                Toast.makeText(this, "Canales ordenados de la A a la Z", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    /** Agrupa los canales visibles por categoría para la vista de filas de TV. */
    private fun updateChannelRows(channels: List<Channel>, numbers: Map<String, Int>) {
        val grouped = channels.groupBy { it.group }
            .toSortedMap()
            .map { (group, list) -> group to list }
        if (!::channelRowAdapter.isInitialized) return
        channelRowAdapter.setChannelNumbers(numbers)
        channelRowAdapter.updateData(grouped)
    }

    private fun showChannelOptionsMenu(channel: Channel, allowMultiSelect: Boolean = true) {
        val key = ChannelPrefsManager.keyOf(channel)
        val isFav = channelPrefsManager.isFavorite(key)
        // Lista de (etiqueta, acción): así añadir/quitar opciones condicionales
        // (multi-selección, catch-up) no puede descuadrar los índices de las demás.
        val entries = mutableListOf<Pair<String, () -> Unit>>(
            (if (isFav) "★ Quitar de favoritos" else "☆ Marcar como favorito") to {
                channelPrefsManager.toggleFavorite(key)
                applyFilters(binding.searchInput.text?.toString().orEmpty())
            },
            "🚫 Ocultar este canal para siempre" to { confirmHideChannel(channel) }
        )
        if (allowMultiSelect) {
            entries.add("☑️ Seleccionar varios…" to { channelAdapter.enterSelectionMode(channel.url) })
        }
        entries.add("⬆️ Subir un puesto" to { moveChannelInOrder(channel, -1) })
        entries.add("⬇️ Bajar un puesto" to { moveChannelInOrder(channel, 1) })
        if (channel.supportsCatchup) {
            entries.add("⏪ Ver hacia atrás" to {
                if (channelPrefsManager.isCategoryLocked(channel.group)) {
                    requirePinThen { showCatchupDialog(channel) }
                } else {
                    showCatchupDialog(channel)
                }
            })
        }
        AlertDialog.Builder(this)
            .setTitle(channel.name)
            .setItems(entries.map { it.first }.toTypedArray()) { _, which -> entries[which].second.invoke() }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    /** Abre la guía EPG en formato parrilla con los canales que hay cargados ahora mismo. */
    private fun openEpgGrid() {
        if (allChannels.isEmpty()) {
            Toast.makeText(this, "Carga una lista de canales primero", Toast.LENGTH_SHORT).show()
            return
        }
        // Igual que al abrir un canal normal: sin los ocultos, en tu orden.
        startActivity(EpgGridActivity.buildIntent(this, effectiveChannelList(), profileManager.getCurrentProfile()))
    }

    /**
     * Lista los programas ya emitidos (dentro de los días de archivo que
     * permite el panel Xtream) para reproducir uno desde el principio.
     */
    private fun showCatchupDialog(channel: Channel) {
        if (!channel.supportsCatchup) return
        val programmes = epgManager.getRecentProgrammes(channel.epgId, channel.archiveDays)
        if (programmes.isEmpty()) {
            Toast.makeText(
                this,
                "No hay guía EPG de \"${channel.name}\" en los últimos ${channel.archiveDays} días",
                Toast.LENGTH_LONG
            ).show()
            return
        }
        val dateFormat = java.text.SimpleDateFormat("dd/MM HH:mm", java.util.Locale.getDefault())
        val labels = programmes.map { "${dateFormat.format(java.util.Date(it.startMs))} · ${it.title}" }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle("⏪ Ver hacia atrás · ${channel.name}")
            .setItems(labels) { _, which ->
                val programme = programmes[which]
                val duration = CatchupUtils.durationMinutesBetween(programme.startMs, programme.stopMs)
                val catchupUrl = CatchupUtils.buildUrl(channel, programme.startMs, duration)
                if (catchupUrl == null) {
                    Toast.makeText(this, "No se pudo generar el enlace de reproducción", Toast.LENGTH_SHORT).show()
                    return@setItems
                }
                val replayIntent = Intent(this, PlayerActivity::class.java).apply {
                    putStringArrayListExtra(
                        PlayerActivity.EXTRA_CHANNELS_SIMPLE,
                        arrayListOf("${channel.name} · ${programme.title}|||$catchupUrl|||${channel.group}")
                    )
                    putExtra(PlayerActivity.EXTRA_START_INDEX, 0)
                    putExtra(PlayerActivity.EXTRA_PROFILE_ID, profileManager.getCurrentProfile())
                }
                startActivity(replayIntent)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun confirmHideChannel(channel: Channel) {
        AlertDialog.Builder(this)
            .setTitle("Ocultar canal")
            .setMessage("\"${channel.name}\" no volverá a aparecer en tus listas. Puedes recuperarlo luego desde el menú de ajustes (⚙) > Canales ocultos.")
            .setPositiveButton("Ocultar") { _, _ ->
                channelPrefsManager.hideChannel(channel)
                applyFilters(binding.searchInput.text?.toString().orEmpty())
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun updateProfileLabel() {
        binding.profileNameLabel.text = profileManager.getCurrentProfile()
    }

    private fun showProfileSwitcher() {
        val profiles = profileManager.getProfiles()
        val current = profileManager.getCurrentProfile()
        val items = profiles.map { if (it == current) "✓ $it" else it }.toMutableList()
        items.add("➕ Nuevo perfil…")
        if (current != ProfileManager.DEFAULT_PROFILE_ID) {
            items.add("🗑 Eliminar perfil \"$current\"")
        }
        AlertDialog.Builder(this)
            .setTitle("Perfiles")
            .setItems(items.toTypedArray()) { _, which ->
                when {
                    which < profiles.size -> {
                        val target = profiles[which]
                        if (target != current) {
                            // Si el perfil ACTUAL tiene PIN puesto, hace falta
                            // para cambiar a otro — si no, cualquiera podría
                            // saltarse todo el control parental simplemente
                            // cambiando a un perfil sin restricciones.
                            requirePinThen { switchToProfile(target) }
                        }
                    }
                    items[which].startsWith("➕") -> promptNewProfile()
                    items[which].startsWith("🗑") -> requirePinThen { confirmDeleteProfile(current) }
                }
            }
            .show()
    }

    private fun switchToProfile(name: String) {
        if (name == profileManager.getCurrentProfile()) return
        profileManager.setCurrentProfile(name)
        channelPrefsManager = ChannelPrefsManager(this, name)
        channelAdapter.setPrefsManager(channelPrefsManager)
        channelRowAdapter.setPrefsManager(channelPrefsManager)
        updateProfileLabel()
        selectedCategory = null
        buildCategoryChips(allChannels)
        applyFilters(binding.searchInput.text?.toString().orEmpty())
        Toast.makeText(this, "Perfil: $name", Toast.LENGTH_SHORT).show()
    }

    private fun promptNewProfile() {
        val input = EditText(this).apply { hint = "Nombre del perfil (ej. Papá, Niños…)" }
        KeyboardUtils.attachTvKeyboardFix(this, input)
        val dialog = AlertDialog.Builder(this)
            .setTitle("Nuevo perfil")
            .setView(input)
            .setPositiveButton("Crear") { _, _ ->
                val name = input.text?.toString().orEmpty()
                if (profileManager.addProfile(name)) {
                    switchToProfile(name.trim())
                } else {
                    Toast.makeText(this, "Ese nombre no vale o ya existe", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .create()
        dialog.setOnShowListener { KeyboardUtils.showKeyboard(this, input) }
        dialog.show()
    }

    private fun confirmDeleteProfile(name: String) {
        AlertDialog.Builder(this)
            .setTitle("Eliminar perfil")
            .setMessage("Se borrarán los favoritos, ocultos y el PIN de \"$name\". Esto no se puede deshacer.")
            .setPositiveButton("Eliminar") { _, _ ->
                profileManager.removeProfile(name)
                ChannelPrefsManager.wipeProfileData(this, name)
                switchToProfile(ProfileManager.DEFAULT_PROFILE_ID)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun showAppSettingsMenu() {
        val hiddenCount = channelPrefsManager.getHidden().size
        // Lista de (etiqueta, acción): así insertar la opción condicional de
        // "guardar en el original" no puede descuadrar los índices de las demás.
        val entries = mutableListOf<Pair<String, () -> Unit>>(
            "💬 Asistente de ayuda" to { startActivity(Intent(this, AssistantActivity::class.java)) },
            "📡 Canales públicos (legal)" to { showPublicSourcesDialog() },
            "🗓️ Guía por parrilla" to { openEpgGrid() },
            "Canales ocultos ($hiddenCount)" to { showHiddenChannelsDialog() },
            "↕️ Restablecer orden de canales" to { confirmResetChannelOrder() },
            "🔤 Ordenar de la A a la Z" to { confirmSortAlphabetically() },
            "💾 Exportar mi lista como M3U" to { exportCuratedM3u() }
        )
        if (writableLocalFileUri != null) {
            entries.add("✏️ Guardar en el archivo original" to { saveChangesToOriginalFile() })
        }
        entries.addAll(
            listOf(
                "Comprobar canales caídos" to { checkDeadChannels() },
                "Guía EPG (XMLTV)" to { showEpgConfigDialog() },
                "Control parental" to { showParentalControlMenu() },
                "Mi cuenta Xtream" to { checkXtreamAccountStatus() },
                "Exportar mis ajustes" to { exportSettings() },
                // Importar puede traer un PIN o unas categorías bloqueadas
                // distintas dentro del archivo — sin este candado, alguien
                // podría "colar" un ajustes.json que quite el bloqueo o
                // ponga un PIN que él mismo eligió, sin saber el PIN actual.
                "Importar ajustes" to { requirePinThen { importSettings() } }
            )
        )
        AlertDialog.Builder(this)
            .setTitle("Ajustes")
            .setItems(entries.map { it.first }.toTypedArray()) { _, which ->
                entries[which].second.invoke()
            }
            .show()
    }

    /**
     * Catálogo de listas M3U públicas y legales (proyecto iptv-org): solo
     * canales que sus propios dueños ya emiten gratis y en abierto. Al
     * elegir una, se descarga y se añade como una lista guardada más.
     */
    private fun showPublicSourcesDialog() {
        val sources = PublicSourcesCatalog.all()
        val labels = sources.map { it.label }.toTypedArray()
        Toast.makeText(
            this,
            "Listas del proyecto open-source iptv-org: canales que sus dueños ya emiten gratis y en abierto. Sin canales de pago.",
            Toast.LENGTH_LONG
        ).show()
        AlertDialog.Builder(this)
            .setTitle("📡 Canales públicos (legal)")
            .setItems(labels) { _, which ->
                val source = sources[which]
                Toast.makeText(this, "Descargando \"${source.label}\"…", Toast.LENGTH_SHORT).show()
                loadPlaylistFromUrl(source.url, playlistName = source.label)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun showEpgConfigDialog() {
        val input = android.widget.EditText(this).apply {
            hint = "https://servidor.com/epg.xml o .xml.gz"
            setText(epgManager.getSavedEpgUrl().orEmpty())
            setTextColor(getColor(R.color.text_primary))
        }
        KeyboardUtils.attachTvKeyboardFix(this, input)
        val dialog = AlertDialog.Builder(this)
            .setTitle("Guía EPG (XMLTV)")
            .setMessage("Pega aquí la URL de una guía XMLTV para ver \"ahora / después\" en tus canales. Si tu lista M3U ya trae su propia guía, se detecta sola.")
            .setView(input)
            .setPositiveButton("Guardar") { _, _ ->
                val url = input.text?.toString()?.trim().orEmpty()
                if (url.isNotBlank()) {
                    epgManager.saveEpgUrl(url)
                    epgManager.clearCache()
                    Toast.makeText(this, "Cargando guía EPG…", Toast.LENGTH_SHORT).show()
                    CoroutineScope(Dispatchers.IO).launch {
                        val ok = runCatching { epgManager.loadIfNeeded(url) }.isSuccess
                        withContext(Dispatchers.Main) {
                            channelAdapter.notifyDataSetChanged()
                            Toast.makeText(
                                this@MainActivity,
                                if (ok) "Guía EPG cargada" else "No se pudo cargar la guía EPG",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .create()
        dialog.setOnShowListener { KeyboardUtils.showKeyboard(this, input) }
        dialog.show()
    }

    private fun checkForAppUpdate() {
        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                val client = okhttp3.OkHttpClient()
                val request = okhttp3.Request.Builder()
                    .url("https://api.github.com/repos/${BuildConfig.UPDATE_CHECK_REPO}/releases/latest")
                    .build()
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@runCatching
                    val body = response.body?.string() ?: return@runCatching
                    val json = org.json.JSONObject(body)
                    val latestVersion = json.optString("tag_name", "").removePrefix("v")
                    val currentVersion = packageManager.getPackageInfo(packageName, 0).versionName
                    val htmlUrl = json.optString("html_url", "")
                    if (latestVersion.isNotBlank() && latestVersion != currentVersion) {
                        withContext(Dispatchers.Main) { showUpdateAvailableDialog(latestVersion, htmlUrl) }
                    }
                }
            }
        }
    }

    private fun showUpdateAvailableDialog(version: String, url: String) {
        if (isFinishing) return
        AlertDialog.Builder(this)
            .setTitle("Nueva versión disponible")
            .setMessage("Hay una versión ($version) más reciente que la que tienes instalada.")
            .setPositiveButton("Ver en GitHub") { _, _ ->
                if (url.isNotBlank()) startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            }
            .setNegativeButton("Ahora no", null)
            .show()
    }

    private fun showParentalControlMenu() {
        val hasPin = !channelPrefsManager.getParentalPin().isNullOrBlank()
        val items = if (hasPin) {
            arrayOf("Cambiar PIN", "Elegir categorías bloqueadas", "Quitar control parental")
        } else {
            arrayOf("Establecer PIN")
        }
        AlertDialog.Builder(this)
            .setTitle("Control parental")
            .setItems(items) { _, which ->
                val label = items[which]
                when (label) {
                    // Al establecerlo por primera vez no hay PIN que pedir.
                    "Establecer PIN" -> promptNewPin()
                    // Cambiarlo o quitarlo si requiere el PIN actual — si no,
                    // cualquiera podría desactivar el control parental sin
                    // saber el PIN, dejándolo completamente inútil.
                    "Cambiar PIN" -> requirePinThen { promptNewPin() }
                    "Elegir categorías bloqueadas" -> requirePinThen { showLockCategoriesDialog() }
                    "Quitar control parental" -> requirePinThen {
                        channelPrefsManager.setParentalPin(null)
                        channelPrefsManager.setLockedCategories(emptySet())
                        Toast.makeText(this, "Control parental desactivado", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }

    private fun promptNewPin() {
        val input = EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "PIN de 4 dígitos"
        }
        KeyboardUtils.attachTvKeyboardFix(this, input)
        val dialog = AlertDialog.Builder(this)
            .setTitle("Nuevo PIN")
            .setView(input)
            .setPositiveButton("Guardar") { _, _ ->
                val pin = input.text?.toString().orEmpty()
                if (pin.length < 4) {
                    Toast.makeText(this, "El PIN debe tener al menos 4 dígitos", Toast.LENGTH_SHORT).show()
                } else {
                    channelPrefsManager.setParentalPin(pin)
                    Toast.makeText(this, "PIN guardado. Ahora elige qué categorías bloquear.", Toast.LENGTH_LONG).show()
                    showLockCategoriesDialog()
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .create()
        dialog.setOnShowListener { KeyboardUtils.showKeyboard(this, input) }
        dialog.show()
    }

    private fun showLockCategoriesDialog() {
        val groups = allChannels.map { it.group }.distinct().sorted()
        if (groups.isEmpty()) {
            Toast.makeText(this, "Carga primero una lista de canales.", Toast.LENGTH_SHORT).show()
            return
        }
        val locked = channelPrefsManager.getLockedCategories()
        val checked = groups.map { it in locked }.toBooleanArray()
        AlertDialog.Builder(this)
            .setTitle("Categorías bloqueadas")
            .setMultiChoiceItems(groups.toTypedArray(), checked) { _, which, isChecked -> checked[which] = isChecked }
            .setPositiveButton("Guardar") { _, _ ->
                val newLocked = groups.filterIndexed { i, _ -> checked[i] }.toSet()
                channelPrefsManager.setLockedCategories(newLocked)
                buildCategoryChips(allChannels)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    /** Pide el PIN si hace falta antes de ejecutar una acción (abrir canal / categoría protegida). */
    private fun requirePinThen(onSuccess: () -> Unit) {
        val pin = channelPrefsManager.getParentalPin()
        if (pin.isNullOrBlank()) {
            onSuccess()
            return
        }
        val input = EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "PIN"
        }
        KeyboardUtils.attachTvKeyboardFix(this, input)
        val dialog = AlertDialog.Builder(this)
            .setTitle("Contenido protegido")
            .setMessage("Introduce el PIN para continuar")
            .setView(input)
            .setPositiveButton("Entrar") { _, _ ->
                if (input.text?.toString() == pin) onSuccess()
                else Toast.makeText(this, "PIN incorrecto", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton(R.string.cancel, null)
            .create()
        dialog.setOnShowListener { KeyboardUtils.showKeyboard(this, input) }
        dialog.show()
    }

    // ---------------------- Exportar / importar ajustes ----------------------

    private val exportPicker =
        registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.CreateDocument("application/json")) { uri ->
            uri?.let { writeExportedSettings(it) }
        }

    private val importPicker =
        registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.OpenDocument()) { uri ->
            uri?.let { readImportedSettings(it) }
        }

    private val exportM3uPicker =
        registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.CreateDocument("audio/x-mpegurl")) { uri ->
            uri?.let { writeCuratedM3u(it) }
        }

    /**
     * Genera un archivo .m3u REAL a partir de tu lista tal como la tienes
     * ahora mismo en la app: sin los canales que ocultaste, y en el orden
     * que hayas elegido a mano con "Subir/Bajar puesto". A diferencia de
     * "ocultar" (que solo se aplica dentro de esta app), este archivo lo
     * puedes abrir en cualquier otro reproductor, compartirlo, o volver a
     * cargarlo aquí como una lista nueva ya limpia.
     */
    private fun exportCuratedM3u() {
        if (allChannels.isEmpty()) {
            Toast.makeText(this, "Carga una lista de canales primero", Toast.LENGTH_SHORT).show()
            return
        }
        exportM3uPicker.launch("mi_lista_iptv.m3u")
    }

    private fun writeCuratedM3u(uri: Uri) {
        val curated = effectiveChannelList()
        runCatching {
            val text = M3UParser.serialize(curated)
            contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray()) }
        }.onSuccess {
            Toast.makeText(this, "Lista guardada: ${curated.size} canales", Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(this, "No se pudo guardar el archivo: ${it.message}", Toast.LENGTH_LONG).show()
        }
    }

    /**
     * A diferencia de "Exportar como nuevo M3U" (que crea una copia), esto
     * SOBRESCRIBE de verdad el archivo local original con tu lista curada
     * (sin ocultos, en tu orden). Solo aparece cuando la lista actual se
     * cargó como archivo local y Android nos dejó permiso de escritura sobre
     * él — con listas por URL o Xtream no existe ningún archivo al que
     * escribir, así que ahí esta opción no puede aparecer.
     */
    private fun saveChangesToOriginalFile() {
        val uri = writableLocalFileUri ?: return
        val curated = effectiveChannelList()
        AlertDialog.Builder(this)
            .setTitle("Guardar en el archivo original")
            .setMessage("Esto sobrescribe tu archivo .m3u original con la lista tal como la ves ahora (${curated.size} canales, sin los ocultos). No se puede deshacer. ¿Continuar?")
            .setPositiveButton("Sobrescribir") { _, _ ->
                runCatching {
                    val text = M3UParser.serialize(curated)
                    // "wt": trunca el archivo antes de escribir, para que no
                    // queden restos del contenido anterior si la lista nueva
                    // es más corta que la original.
                    contentResolver.openOutputStream(uri, "wt")?.use { it.write(text.toByteArray()) }
                }.onSuccess {
                    Toast.makeText(this, "Archivo original actualizado: ${curated.size} canales", Toast.LENGTH_SHORT).show()
                }.onFailure {
                    Toast.makeText(this, "No se pudo escribir el archivo: ${it.message}", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun exportSettings() {
        exportPicker.launch("iptv_karachi_ajustes.json")
    }

    private fun importSettings() {
        importPicker.launch(arrayOf("application/json", "*/*"))
    }

    private fun writeExportedSettings(uri: Uri) {
        runCatching {
            val json = org.json.JSONObject().apply {
                put("playlists", org.json.JSONArray(playlistManager.getSavedPlaylists().map {
                    org.json.JSONObject().apply {
                        put("name", it.name)
                        put("uri", it.sourceUri)
                        put("count", it.channelCount)
                    }
                }))
                put("favorites", org.json.JSONArray(channelPrefsManager.getFavorites().toList()))
                put("hidden", org.json.JSONObject(channelPrefsManager.getHidden()))
                put("customOrder", org.json.JSONArray(channelPrefsManager.getCustomOrder()))
                put("controlScale", channelPrefsManager.getControlScale().toDouble())
                put("epgUrl", epgManager.getSavedEpgUrl() ?: "")
                put("parentalPin", channelPrefsManager.getParentalPin() ?: "")
                put("lockedCategories", org.json.JSONArray(channelPrefsManager.getLockedCategories().toList()))
            }
            contentResolver.openOutputStream(uri)?.use { it.write(json.toString(2).toByteArray()) }
        }.onSuccess {
            Toast.makeText(this, "Ajustes exportados correctamente", Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(this, "No se pudo exportar: ${it.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun readImportedSettings(uri: Uri) {
        runCatching {
            val text = contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                ?: throw IllegalStateException("Archivo vacío")
            val json = org.json.JSONObject(text)

            val playlists = json.optJSONArray("playlists")
            if (playlists != null) {
                for (i in 0 until playlists.length()) {
                    val item = playlists.getJSONObject(i)
                    playlistManager.addPlaylist(item.getString("name"), item.getString("uri"), item.optInt("count", 0))
                }
            }
            json.optJSONArray("favorites")?.let { arr ->
                for (i in 0 until arr.length()) channelPrefsManager.setFavorite(arr.getString(i), true)
            }
            json.optJSONObject("hidden")?.let { obj ->
                obj.keys().forEach { url -> channelPrefsManager.hideChannelRaw(url, obj.getString(url)) }
            }
            json.optJSONArray("customOrder")?.let { arr ->
                val order = mutableListOf<String>()
                for (i in 0 until arr.length()) order.add(arr.getString(i))
                if (order.isNotEmpty()) channelPrefsManager.saveCustomOrder(order)
            }
            if (json.has("controlScale")) {
                channelPrefsManager.setControlScale(json.optDouble("controlScale", 1.0).toFloat())
            }
            json.optString("epgUrl").takeIf { it.isNotBlank() }?.let { epgManager.saveEpgUrl(it) }
            json.optString("parentalPin").takeIf { it.isNotBlank() }?.let { channelPrefsManager.setParentalPin(it) }
            json.optJSONArray("lockedCategories")?.let { arr ->
                val set = mutableSetOf<String>()
                for (i in 0 until arr.length()) set.add(arr.getString(i))
                channelPrefsManager.setLockedCategories(set)
            }

            playlistAdapter.updateData(playlistManager.getSavedPlaylists())
            updatePlaylistsVisibility()
            buildCategoryChips(allChannels)
            applyFilters(binding.searchInput.text?.toString().orEmpty())
        }.onSuccess {
            Toast.makeText(this, "Ajustes importados correctamente", Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(this, "No se pudo importar: ${it.message}", Toast.LENGTH_LONG).show()
        }
    }
    private fun showXtreamAccountStatus(info: XtreamClient.AccountInfo, alwaysShow: Boolean = false) {
        val expiry = info.expiryEpochSeconds
        if (expiry == null) {
            if (alwaysShow) Toast.makeText(this, "El panel no informa de la fecha de caducidad.", Toast.LENGTH_SHORT).show()
            return
        }
        val now = System.currentTimeMillis() / 1000
        val daysLeft = ((expiry - now) / 86400).toInt()
        val dateText = java.text.SimpleDateFormat("d MMM yyyy", java.util.Locale("es", "ES"))
            .format(java.util.Date(expiry * 1000))
        val connectionsText = if (info.activeConnections != null && info.maxConnections != null) {
            "\nConexiones: ${info.activeConnections}/${info.maxConnections}"
        } else ""

        val message = when {
            daysLeft < 0 -> "⚠️ Tu suscripción Xtream caducó el $dateText.$connectionsText"
            daysLeft == 0 -> "⚠️ Tu suscripción Xtream caduca HOY ($dateText).$connectionsText"
            daysLeft <= 7 -> "⚠️ Tu suscripción Xtream caduca en $daysLeft días ($dateText).$connectionsText"
            else -> if (alwaysShow) "✅ Suscripción activa hasta el $dateText ($daysLeft días).$connectionsText" else null
        }
        message?.let {
            if (alwaysShow) {
                AlertDialog.Builder(this).setTitle("Mi cuenta Xtream").setMessage(it).setPositiveButton("OK", null).show()
            } else {
                Toast.makeText(this, it, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun checkXtreamAccountStatus() {
        val credentials = lastXtreamCredentials
        if (credentials == null) {
            Toast.makeText(this, "Conéctate primero a un panel Xtream Codes.", Toast.LENGTH_SHORT).show()
            return
        }
        CoroutineScope(Dispatchers.IO).launch {
            val info = runCatching { XtreamClient.fetchAccountInfo(credentials) }.getOrNull()
            withContext(Dispatchers.Main) {
                if (info != null) showXtreamAccountStatus(info, alwaysShow = true)
                else Toast.makeText(this@MainActivity, "No se pudo consultar el estado de la cuenta.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun checkDeadChannels() {
        if (allChannels.isEmpty()) {
            Toast.makeText(this, "Carga primero una lista de canales.", Toast.LENGTH_SHORT).show()
            return
        }
        var job: Job? = null
        val progressDialog = AlertDialog.Builder(this)
            .setTitle("Comprobando canales…")
            .setMessage("0 / ${allChannels.size}")
            .setCancelable(false)
            .setNegativeButton("Cancelar") { _, _ -> job?.cancel() }
            .create()
        progressDialog.show()

        job = CoroutineScope(Dispatchers.IO).launch {
            val client = okhttp3.OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(5, TimeUnit.SECONDS)
                .build()
            val semaphore = Semaphore(20)
            val checked = AtomicInteger(0)
            val deadChannels = java.util.Collections.synchronizedList(mutableListOf<Channel>())

            val jobs = allChannels.map { channel ->
                async {
                    semaphore.withPermit {
                        val alive = runCatching {
                            val request = okhttp3.Request.Builder()
                                .url(channel.url)
                                .header("Range", "bytes=0-2048")
                                .build()
                            client.newCall(request).execute().use { it.isSuccessful }
                        }.getOrDefault(false)
                        if (!alive) deadChannels.add(channel)
                        val done = checked.incrementAndGet()
                        withContext(Dispatchers.Main) {
                            if (progressDialog.isShowing) {
                                progressDialog.setMessage("$done / ${allChannels.size}")
                            }
                        }
                    }
                }
            }
            jobs.awaitAll()

            withContext(Dispatchers.Main) {
                if (!progressDialog.isShowing) return@withContext // se canceló
                progressDialog.dismiss()
                if (deadChannels.isEmpty()) {
                    Toast.makeText(this@MainActivity, "Todos los canales responden bien.", Toast.LENGTH_SHORT).show()
                } else {
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("Canales caídos encontrados")
                        .setMessage("${deadChannels.size} de ${allChannels.size} canales no responden. ¿Quieres ocultarlos?")
                        .setPositiveButton("Ocultar todos") { _, _ ->
                            deadChannels.forEach { channelPrefsManager.hideChannel(it) }
                            applyFilters(binding.searchInput.text?.toString().orEmpty())
                            Toast.makeText(this@MainActivity, "Canales ocultados", Toast.LENGTH_SHORT).show()
                        }
                        .setNegativeButton("No, dejarlos", null)
                        .show()
                }
            }
        }
        progressDialog.setOnDismissListener { job?.cancel() }
    }

    private fun showHiddenChannelsDialog() {
        val hidden = channelPrefsManager.getHidden()
        if (hidden.isEmpty()) {
            Toast.makeText(this, "No tienes canales ocultos.", Toast.LENGTH_SHORT).show()
            return
        }
        val urls = hidden.keys.toList()
        val names = urls.map { hidden.getValue(it) }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle("Toca un canal para mostrarlo de nuevo")
            .setItems(names) { _, which ->
                channelPrefsManager.unhideChannel(urls[which])
                applyFilters(binding.searchInput.text?.toString().orEmpty())
                Toast.makeText(this, "Canal recuperado", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun openPlayer(channel: Channel) {
        if (channelPrefsManager.isCategoryLocked(channel.group)) {
            requirePinThen { openPlayerInternal(channel) }
        } else {
            openPlayerInternal(channel)
        }
    }

    private fun openPlayerInternal(channel: Channel) {
        // El reproductor recibe la lista "efectiva" (sin ocultos, en tu orden
        // personalizado si has movido algo) — así el número de canal que ves
        // aquí es el mismo que ves dentro del reproductor, y los ocultos no
        // aparecen al navegar con siguiente/anterior o la lista de canales.
        val effectiveChannels = effectiveChannelList()
        val realIndex = effectiveChannels.indexOf(channel)
        channelPrefsManager.addRecentChannel(channel.url)

        // Pasamos los canales como strings simples separados por "|||" para
        // evitar tener que implementar Parcelable en el modelo. Los últimos
        // 4 campos son opcionales (solo Xtream con archivo activado).
        val serialized = ArrayList(effectiveChannels.map {
            "${it.name}|||${it.url}|||${it.group}|||${it.logoUrl.orEmpty()}|||${it.epgId.orEmpty()}|||" +
                "${it.streamId.orEmpty()}|||${it.archiveDays}|||${it.catchupUrlPrefix.orEmpty()}|||${it.catchupTimezone}"
        })

        val intent = Intent(this, PlayerActivity::class.java).apply {
            putStringArrayListExtra(PlayerActivity.EXTRA_CHANNELS_SIMPLE, serialized)
            putExtra(PlayerActivity.EXTRA_START_INDEX, realIndex)
            putExtra(PlayerActivity.EXTRA_PROFILE_ID, profileManager.getCurrentProfile())
        }
        startActivity(intent)
    }

    /** La lista tal como se ve de verdad: sin canales ocultos, en el orden que hayas elegido a mano. */
    private fun effectiveChannelList(): List<Channel> =
        applyCustomOrder(allChannels.filterNot { channelPrefsManager.isHidden(ChannelPrefsManager.keyOf(it)) })

    companion object {
        private const val FAVORITES_CATEGORY = "__FAVORITES__"
        private const val RECENT_CATEGORY = "__RECENT__"
        private const val ARABIC_CATEGORY = "__ARABIC__"
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (::channelAdapter.isInitialized && channelAdapter.selectionMode) {
            channelAdapter.exitSelectionMode()
            binding.selectionActionBar.visibility = View.GONE
        } else {
            super.onBackPressed()
        }
    }
}
