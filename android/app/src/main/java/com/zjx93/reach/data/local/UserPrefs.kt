package com.zjx93.reach.data.local

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "reach_prefs")

/** 本地持久化（DataStore）：服务器地址、登录令牌、应用设置。
 *  令牌与设置都不落服务端，仅在本机。 */
object UserPrefs {

    data class AppSettings(
        val focusMinutes: Int = 25,
        val weekStart: String = "sun",       // "sun" | "mon"
        val timezone: String = "",            // IANA，空=跟随系统
        val lunarSource: String = "backend",  // "backend" | "custom"
        val lunarApiBase: String = "",
        val holidayApiBase: String = "",
        val lunarApiKey: String = "",
    )

    private val SERVER_URL = stringPreferencesKey("server_url")
    private val TOKEN = stringPreferencesKey("token")
    private val FOCUS_MIN = intPreferencesKey("focus_minutes")
    private val WEEK_START = stringPreferencesKey("week_start")
    private val TIMEZONE = stringPreferencesKey("timezone")
    private val LUNAR_SOURCE = stringPreferencesKey("lunar_source")
    private val LUNAR_API = stringPreferencesKey("lunar_api_base")
    private val HOLIDAY_API = stringPreferencesKey("holiday_api_base")
    private val LUNAR_KEY = stringPreferencesKey("lunar_api_key")

    private lateinit var ctx: Context
    fun init(context: Context) {
        ctx = context.applicationContext
    }

    // 注意：必须在 init(ctx) 之后才能访问 ctx。改用 by lazy，
    // 让这些 Flow 在首次被读取时（即 Application 初始化之后）才求值，
    // 避免 object 类初始化器 <clinit> 期触碰尚未赋值的 lateinit ctx，
    // 否则会抛 ExceptionInInitializerError 并污染整个 UserPrefs 对象导致闪退。
    val serverUrlFlow: Flow<String> by lazy {
        ctx.dataStore.data.map { it[SERVER_URL] ?: "http://192.168.9.3:8000" }
    }
    val tokenFlow: Flow<String> by lazy {
        ctx.dataStore.data.map { it[TOKEN] ?: "" }
    }
    val settingsFlow: Flow<AppSettings> by lazy {
        ctx.dataStore.data.map { p ->
            AppSettings(
                focusMinutes = p[FOCUS_MIN] ?: 25,
                weekStart = p[WEEK_START] ?: "sun",
                timezone = p[TIMEZONE] ?: "",
                lunarSource = p[LUNAR_SOURCE] ?: "backend",
                lunarApiBase = p[LUNAR_API] ?: "",
                holidayApiBase = p[HOLIDAY_API] ?: "",
                lunarApiKey = p[LUNAR_KEY] ?: "",
            )
        }
    }

    suspend fun setServerUrl(v: String) = ctx.dataStore.edit { it[SERVER_URL] = v }
    suspend fun setToken(v: String) = ctx.dataStore.edit { it[TOKEN] = v }
    suspend fun clearToken() = ctx.dataStore.edit { it.remove(TOKEN) }

    suspend fun setFocusMinutes(v: Int) = ctx.dataStore.edit { it[FOCUS_MIN] = v }
    suspend fun setWeekStart(v: String) = ctx.dataStore.edit { it[WEEK_START] = v }
    suspend fun setTimezone(v: String) = ctx.dataStore.edit { it[TIMEZONE] = v }
    suspend fun setLunarSource(v: String) = ctx.dataStore.edit { it[LUNAR_SOURCE] = v }
    suspend fun setLunarApiBase(v: String) = ctx.dataStore.edit { it[LUNAR_API] = v }
    suspend fun setHolidayApiBase(v: String) = ctx.dataStore.edit { it[HOLIDAY_API] = v }
    suspend fun setLunarApiKey(v: String) = ctx.dataStore.edit { it[LUNAR_KEY] = v }
}
