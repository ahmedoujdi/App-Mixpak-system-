package com.karachi.iptvplayer

import android.content.Intent
import android.os.Bundle
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Guía de programación en parrilla: canales en filas, horas en columnas,
 * como una tele normal. Toca un programa pasado para verlo con "ver hacia
 * atrás" (si el canal lo soporta), el que está en emisión para verlo en
 * directo, o uno futuro para ver de qué trata.
 */
class EpgGridActivity : AppCompatActivity() {

    private lateinit var epgManager: EpgManager
    private lateinit var prefsManager: ChannelPrefsManager
    private lateinit var channels: List<Channel>
    private lateinit var syncGroup: HScrollSyncGroup
    private var profileId: String = ProfileManager.DEFAULT_PROFILE_ID

    private var windowStartMs: Long = 0
    private var windowEndMs: Long = 0

    private lateinit var rowsRecycler: RecyclerView
    private lateinit var timeHeaderContainer: android.widget.LinearLayout
    private lateinit var emptyLabel: TextView

    private val pxPerMinuteDp = 2.6f

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_epg_grid)

        epgManager = EpgManager(this)
        syncGroup = HScrollSyncGroup()
        profileId = intent.getStringExtra(PlayerActivity.EXTRA_PROFILE_ID) ?: ProfileManager.DEFAULT_PROFILE_ID
        prefsManager = ChannelPrefsManager(this, profileId)

        val simple = intent.getStringArrayListExtra(PlayerActivity.EXTRA_CHANNELS_SIMPLE) ?: arrayListOf()
        channels = simple.map {
            val parts = it.split("|||")
            Channel(
                name = parts[0],
                url = parts[1],
                group = parts.getOrElse(2) { "General" },
                logoUrl = parts.getOrNull(3)?.ifBlank { null },
                epgId = parts.getOrNull(4)?.ifBlank { null },
                streamId = parts.getOrNull(5)?.ifBlank { null },
                archiveDays = parts.getOrNull(6)?.toIntOrNull() ?: 0,
                catchupUrlPrefix = parts.getOrNull(7)?.ifBlank { null },
                catchupTimezone = parts.getOrNull(8)?.ifBlank { null } ?: "UTC"
            )
        }

        val now = System.currentTimeMillis()
        windowStartMs = now - 60 * 60_000L
        windowEndMs = now + 5 * 60 * 60_000L

        rowsRecycler = findViewById(R.id.epgRowsRecycler)
        timeHeaderContainer = findViewById(R.id.epgTimeHeaderContainer)
        emptyLabel = findViewById(R.id.epgEmptyLabel)

        findViewById<android.widget.ImageButton>(R.id.btnEpgBack).setOnClickListener { finish() }
        findViewById<TextView>(R.id.btnEpgNow).setOnClickListener { scrollToNow() }
        findViewById<android.widget.HorizontalScrollView>(R.id.epgTimeHeaderScroll).let { syncGroup.register(it) }

        buildTimeHeader()
        loadEpgAndSetup()
    }

    private fun loadEpgAndSetup() {
        val url = epgManager.getSavedEpgUrl()
        if (url.isNullOrBlank()) {
            showEmpty()
            return
        }
        CoroutineScope(Dispatchers.IO).launch {
            val ok = runCatching { epgManager.loadIfNeeded(url) }.isSuccess
            withContext(Dispatchers.Main) {
                if (ok && epgManager.hasAnyData()) {
                    setupGrid()
                } else {
                    showEmpty()
                }
            }
        }
    }

    private fun showEmpty() {
        emptyLabel.visibility = android.view.View.VISIBLE
        rowsRecycler.visibility = android.view.View.GONE
    }

    private fun setupGrid() {
        emptyLabel.visibility = android.view.View.GONE
        rowsRecycler.visibility = android.view.View.VISIBLE
        rowsRecycler.layoutManager = LinearLayoutManager(this)
        rowsRecycler.adapter = EpgGridAdapter(
            channels = channels,
            epgManager = epgManager,
            windowStartMs = windowStartMs,
            windowEndMs = windowEndMs,
            pxPerMinute = pxPerMinuteDp,
            syncGroup = syncGroup,
            onChannelClick = { channel -> playChannelLive(channel) },
            onProgrammeClick = { channel, programme -> onProgrammeTapped(channel, programme) }
        )
        rowsRecycler.post { scrollToNow() }
    }

    private fun scrollToNow() {
        val now = System.currentTimeMillis()
        val minutesFromStart = (now - windowStartMs) / 60_000.0
        // Deja un poco de contexto a la izquierda de "ahora" en vez de dejarlo pegado al borde.
        val leadInDp = 60
        val x = (minutesFromStart * pxPerMinuteDp).toInt() - dp(leadInDp)
        syncGroup.scrollAllTo(x.coerceAtLeast(0))
    }

    private fun buildTimeHeader() {
        timeHeaderContainer.removeAllViews()
        val format = SimpleDateFormat("HH:mm", Locale.getDefault())
        var t = windowStartMs
        val stepMinutes = 30
        while (t < windowEndMs) {
            val label = TextView(this).apply {
                text = format.format(Date(t))
                setTextColor(getColor(R.color.text_muted))
                textSize = 11f
                setPadding(dp(4), 0, 0, 0)
            }
            val widthPx = (stepMinutes * pxPerMinuteDp).toInt()
            label.layoutParams = android.widget.LinearLayout.LayoutParams(
                widthPx,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT
            )
            timeHeaderContainer.addView(label)
            t += stepMinutes * 60_000L
        }
    }

    private fun onProgrammeTapped(channel: Channel, programme: EpgManager.Programme) {
        val now = System.currentTimeMillis()
        when {
            now in programme.startMs until programme.stopMs -> playChannelLive(channel)
            programme.stopMs <= now -> {
                if (!channel.supportsCatchup) {
                    Toast.makeText(this, "Este canal no permite \"ver hacia atrás\"", Toast.LENGTH_SHORT).show()
                    return
                }
                requirePinThen(channel) { playCatchup(channel, programme) }
            }
            else -> {
                val format = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault())
                AlertDialog.Builder(this)
                    .setTitle(programme.title.ifBlank { channel.name })
                    .setMessage("${channel.name}\n${format.format(Date(programme.startMs))} - ${format.format(Date(programme.stopMs))}")
                    .setPositiveButton("Cerrar", null)
                    .show()
            }
        }
    }

    private fun playCatchup(channel: Channel, programme: EpgManager.Programme) {
        val duration = CatchupUtils.durationMinutesBetween(programme.startMs, programme.stopMs)
        val url = CatchupUtils.buildUrl(channel, programme.startMs, duration)
        if (url == null) {
            Toast.makeText(this, "No se pudo generar el enlace de reproducción", Toast.LENGTH_SHORT).show()
            return
        }
        val intent = Intent(this, PlayerActivity::class.java).apply {
            putStringArrayListExtra(
                PlayerActivity.EXTRA_CHANNELS_SIMPLE,
                arrayListOf("${channel.name} · ${programme.title}|||$url|||${channel.group}")
            )
            putExtra(PlayerActivity.EXTRA_START_INDEX, 0)
            putExtra(PlayerActivity.EXTRA_PROFILE_ID, profileId)
        }
        startActivity(intent)
    }

    /** Pide el PIN si la categoría de este canal está bloqueada; si no, ejecuta directamente. */
    private fun requirePinThen(channel: Channel, onSuccess: () -> Unit) {
        val pin = prefsManager.getParentalPin()
        if (pin.isNullOrBlank() || !prefsManager.isCategoryLocked(channel.group)) {
            onSuccess()
            return
        }
        val input = android.widget.EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "PIN"
        }
        AlertDialog.Builder(this)
            .setTitle("Contenido protegido")
            .setMessage("Introduce el PIN para continuar")
            .setView(input)
            .setPositiveButton("Entrar") { _, _ ->
                if (input.text?.toString() == pin) onSuccess()
                else Toast.makeText(this, "PIN incorrecto", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun playChannelLive(channel: Channel) {
        requirePinThen(channel) { playChannelLiveInternal(channel) }
    }

    private fun playChannelLiveInternal(channel: Channel) {
        val index = channels.indexOfFirst { it.url == channel.url }.coerceAtLeast(0)
        val serialized = ArrayList(channels.map {
            "${it.name}|||${it.url}|||${it.group}|||${it.logoUrl.orEmpty()}|||${it.epgId.orEmpty()}|||" +
                "${it.streamId.orEmpty()}|||${it.archiveDays}|||${it.catchupUrlPrefix.orEmpty()}|||${it.catchupTimezone}"
        })
        val intent = Intent(this, PlayerActivity::class.java).apply {
            putStringArrayListExtra(PlayerActivity.EXTRA_CHANNELS_SIMPLE, serialized)
            putExtra(PlayerActivity.EXTRA_START_INDEX, index)
            putExtra(PlayerActivity.EXTRA_PROFILE_ID, profileId)
        }
        startActivity(intent)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        /** Construye el intent para abrir la parrilla con una lista de canales ya cargada. */
        fun buildIntent(activity: AppCompatActivity, channels: List<Channel>, profileId: String): Intent {
            val serialized = ArrayList(channels.map {
                "${it.name}|||${it.url}|||${it.group}|||${it.logoUrl.orEmpty()}|||${it.epgId.orEmpty()}|||" +
                    "${it.streamId.orEmpty()}|||${it.archiveDays}|||${it.catchupUrlPrefix.orEmpty()}|||${it.catchupTimezone}"
            })
            return Intent(activity, EpgGridActivity::class.java).apply {
                putStringArrayListExtra(PlayerActivity.EXTRA_CHANNELS_SIMPLE, serialized)
                putExtra(PlayerActivity.EXTRA_PROFILE_ID, profileId)
            }
        }
    }
}
