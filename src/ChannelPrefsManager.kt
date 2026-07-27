package com.karachi.iptvplayer

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Favoritos, canales ocultos ("el truco para borrar los que no te gustan
 * para siempre") y preferencias de la interfaz del reproductor (tamaño de
 * los botones). No se toca el M3U original: solo se recuerda qué URLs
 * marcó el usuario, así que sigue funcionando aunque recargue la lista.
 */
class ChannelPrefsManager(context: Context, profileId: String = ProfileManager.DEFAULT_PROFILE_ID) {

    // El perfil por defecto usa el mismo nombre de siempre, para no perder
    // los datos de quien actualice la app sin haber usado nunca perfiles.
    private val prefs = context.getSharedPreferences(
        if (profileId == ProfileManager.DEFAULT_PROFILE_ID) "iptv_karachi_prefs" else "iptv_karachi_prefs_$profileId",
        Context.MODE_PRIVATE
    )

    // ---------------- Favoritos ----------------

    fun getFavorites(): Set<String> = getSet(KEY_FAVORITES)

    fun isFavorite(channelUrl: String): Boolean = channelUrl in getFavorites()

    fun toggleFavorite(channelUrl: String) {
        val current = getFavorites().toMutableSet()
        if (!current.add(channelUrl)) current.remove(channelUrl)
        saveSet(KEY_FAVORITES, current)
    }

    /** A diferencia de toggleFavorite, esto no se invierte si ya estaba —
     * seguro para restaurar una copia de ajustes sin desmarcar nada. */
    fun setFavorite(channelUrl: String, favorite: Boolean) {
        val current = getFavorites().toMutableSet()
        if (favorite) current.add(channelUrl) else current.remove(channelUrl)
        saveSet(KEY_FAVORITES, current)
    }

    // ---------------- Canales ocultos para siempre ----------------

    /** Devuelve un mapa url -> nombre, para poder mostrarlos si el usuario quiere recuperarlos. */
    fun getHidden(): Map<String, String> {
        val raw = prefs.getString(KEY_HIDDEN, "{}") ?: "{}"
        val obj = JSONObject(raw)
        val map = mutableMapOf<String, String>()
        obj.keys().forEach { key -> map[key] = obj.getString(key) }
        return map
    }

    fun isHidden(channelUrl: String): Boolean = channelUrl in getHidden()

    fun hideChannel(channel: Channel) {
        hideChannelRaw(channel.url, channel.name)
    }

    /** Igual que hideChannel, pero sin necesitar el objeto Channel completo
     * (útil al restaurar una copia de ajustes, donde solo tenemos url+nombre). */
    fun hideChannelRaw(url: String, name: String) {
        val obj = JSONObject(prefs.getString(KEY_HIDDEN, "{}") ?: "{}")
        obj.put(url, name)
        prefs.edit().putString(KEY_HIDDEN, obj.toString()).apply()
    }

    fun unhideChannel(channelUrl: String) {
        val obj = JSONObject(prefs.getString(KEY_HIDDEN, "{}") ?: "{}")
        obj.remove(channelUrl)
        prefs.edit().putString(KEY_HIDDEN, obj.toString()).apply()
    }

    fun unhideAll() {
        prefs.edit().putString(KEY_HIDDEN, "{}").apply()
    }

    // ---------------- Vistos recientemente ----------------

    // ---------------- Orden personalizado (mover/reordenar canales) ----------------

    /** Lista de URLs en el orden que el usuario haya elegido a mano, de más arriba a más abajo. */
    fun getCustomOrder(): List<String> {
        val raw = prefs.getString(KEY_CUSTOM_ORDER, "[]") ?: "[]"
        val arr = JSONArray(raw)
        val list = mutableListOf<String>()
        for (i in 0 until arr.length()) list.add(arr.getString(i))
        return list
    }

    fun saveCustomOrder(orderedUrls: List<String>) {
        val arr = JSONArray()
        orderedUrls.forEach { arr.put(it) }
        prefs.edit().putString(KEY_CUSTOM_ORDER, arr.toString()).apply()
    }

    /** Vuelve al orden original de la lista, deshaciendo cualquier "subir/bajar" hecho a mano. */
    fun clearCustomOrder() {
        prefs.edit().remove(KEY_CUSTOM_ORDER).apply()
    }

    fun getRecentChannelUrls(): List<String> {
        val raw = prefs.getString(KEY_RECENT, "[]") ?: "[]"
        val arr = JSONArray(raw)
        val list = mutableListOf<String>()
        for (i in 0 until arr.length()) list.add(arr.getString(i))
        return list
    }

    fun addRecentChannel(channelUrl: String) {
        val current = getRecentChannelUrls().toMutableList()
        current.remove(channelUrl)
        current.add(0, channelUrl)
        while (current.size > MAX_RECENT) current.removeAt(current.size - 1)
        val arr = JSONArray()
        current.forEach { arr.put(it) }
        prefs.edit().putString(KEY_RECENT, arr.toString()).apply()
    }

    // ---------------- Control parental ----------------

    fun getParentalPin(): String? = prefs.getString(KEY_PIN, null)

    fun setParentalPin(pin: String?) {
        prefs.edit().putString(KEY_PIN, pin).apply()
    }

    fun getLockedCategories(): Set<String> = getSet(KEY_LOCKED_CATEGORIES)

    fun setLockedCategories(categories: Set<String>) {
        saveSet(KEY_LOCKED_CATEGORIES, categories)
    }

    fun isCategoryLocked(category: String): Boolean =
        !getParentalPin().isNullOrBlank() && category in getLockedCategories()

    // ---------------- Tamaño de los controles del reproductor ----------------

    fun getControlScale(): Float = prefs.getFloat(KEY_CONTROL_SCALE, 1.0f)

    fun setControlScale(scale: Float) {
        prefs.edit().putFloat(KEY_CONTROL_SCALE, scale).apply()
    }

    // ---------------- Helpers ----------------

    private fun getSet(key: String): Set<String> {
        val raw = prefs.getString(key, "[]") ?: "[]"
        val arr = JSONArray(raw)
        val set = mutableSetOf<String>()
        for (i in 0 until arr.length()) set.add(arr.getString(i))
        return set
    }

    private fun saveSet(key: String, set: Set<String>) {
        val arr = JSONArray()
        set.forEach { arr.put(it) }
        prefs.edit().putString(key, arr.toString()).apply()
    }

    companion object {
        private const val KEY_FAVORITES = "favorite_channels"
        private const val KEY_HIDDEN = "hidden_channels_map"
        private const val KEY_CONTROL_SCALE = "player_control_scale"
        private const val KEY_PIN = "parental_pin"
        private const val KEY_LOCKED_CATEGORIES = "parental_locked_categories"
        private const val KEY_RECENT = "recent_channel_urls"
        private const val KEY_CUSTOM_ORDER = "custom_channel_order"
        private const val MAX_RECENT = 10

        /**
         * Borra POR COMPLETO los datos de un perfil (favoritos, ocultos, PIN,
         * orden, todo). Sin esto, borrar un perfil y crear otro nuevo con el
         * MISMO nombre después resucitaría en silencio los datos del
         * perfil "borrado" — incluido un PIN que el usuario ya daba por
         * eliminado. Nunca se llama para el perfil por defecto: ese usa el
         * mismo almacenamiento de siempre y no se puede borrar.
         */
        fun wipeProfileData(context: Context, profileId: String) {
            if (profileId == ProfileManager.DEFAULT_PROFILE_ID) return
            context.getSharedPreferences("iptv_karachi_prefs_$profileId", Context.MODE_PRIVATE)
                .edit().clear().apply()
        }

        /** Clave estable para identificar un canal: su URL de stream. */
        fun keyOf(channel: Channel): String = channel.url
    }
}
