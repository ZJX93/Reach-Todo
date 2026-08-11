package com.zjx93.reach.util

import android.app.DownloadManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Context.RECEIVER_NOT_EXPORTED
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File

/**
 * 应用内「一键升级」：
 * 1. 拉取 GitHub 最新 Release（tag 形如 Reach-Todo.APP-v0.0.7），解析语义化版本与 APK 下载地址；
 * 2. 与本地 versionName 做语义化比对，判断是否有更新；
 * 3. 有更新时通过系统 DownloadManager 下载 APK，下载完成后用 PackageInstaller 会话安装。
 *
 * 走系统下载器（而非 OkHttp 直写）的好处：自带通知/进度、断点续传、后台下载，
 * 且无需额外存储权限（下载到 app 私有外部目录）。
 *
 * 关键修复（针对「下到一半退出 / 不能连续下载」）：
 * - 同一 URL 的下载可复用（断点续传）：再次点击不会删除已下部分从头重来；
 * - 系统将下载 PAUSED 时自动 resume 并继续轮询，不再把暂停误判为「退出」；
 * - 下载完成通过 APP 级广播接收器触发安装，脱离设置页 UI 生命周期。
 */
object AppUpdater {
    private const val TAG = "AppUpdater"
    private const val REPO = "ZJX93/Reach-Todo"
    private const val RELEASES_LATEST = "https://api.github.com/repos/$REPO/releases/latest"
    const val FILE_PROVIDER_AUTHORITY = "com.zjx93.reach.fileprovider"
    private const val APK_FILE_NAME = "reach-update.apk"
    private const val ACTION_INSTALL_STATUS = "com.zjx93.reach.action.INSTALL_STATUS"

    /** 活跃下载的持久化（跨界面 / 进程重启）。用独立 SharedPreferences，便于非 suspend 的广播接收器读写。 */
    private const val PREFS = "reach_update"
    private const val K_ID = "dl_id"
    private const val K_URL = "dl_url"
    private const val K_VERSION = "dl_version"

    // 内存中的活跃下载记录（进程内快速判断，避免每次都读 SP）
    private var activeId: Long = -1L
    private var activeUrl: String? = null
    private var activeVersion: String? = null

    /** 已调起安装（防重复弹窗）的下载 id 集合。仅代表「已尝试调起安装器」，不代表安装成功。
     *  安装成功由 PACKAGE_ADDED 广播确认，失败/取消由界面超时复位；两者都会移除该 id，允许重试。 */
    private val triggeredIds = mutableSetOf<Long>()

    /** 移除已调起标记，允许对同一下载重新调起安装（用于安装失败 / 取消后重试）。 */
    fun resetInstallTrigger(id: Long) {
        triggeredIds.remove(id)
    }

    data class ReleaseInfo(
        val version: String,   // 去掉前缀后的语义化版本，如 "0.0.7"
        val tagName: String,   // 原始 tag，如 "Reach-Todo.APP-v0.0.7"
        val apkUrl: String?,   // APK 浏览器下载地址
        val apkName: String?   // APK 文件名
    )

    private val client = OkHttpClient.Builder().build()

    /** 拉取最新 Release 并解析版本号与 APK 地址。 */
    suspend fun fetchLatest(): ReleaseInfo = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(RELEASES_LATEST)
            .header("Accept", "application/vnd.github+json")
            .build()
        client.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) throw RuntimeException("GitHub API 返回 ${resp.code}")
            val json = JSONObject(resp.body!!.string())
            val tagName = json.optString("tag_name")
            val version = tagName.removePrefix("Reach-Todo.APP-").removePrefix("v")
            var apkUrl: String? = null
            var apkName: String? = null
            val assets = json.optJSONArray("assets")
            if (assets != null) {
                for (i in 0 until assets.length()) {
                    val a = assets.getJSONObject(i)
                    val name = a.optString("name")
                    if (name.endsWith(".apk", ignoreCase = true)) {
                        apkUrl = a.optString("browser_download_url")
                        apkName = name
                        break
                    }
                }
            }
            ReleaseInfo(version, tagName, apkUrl, apkName)
        }.also {
            Log.d(TAG, "fetchLatest tag=${it.tagName} version=${it.version} hasApk=${it.apkUrl != null}")
        }
    }

    /** 语义化版本比较：remote 比 current 新则返回 true。 */
    fun isNewer(current: String, remote: String): Boolean {
        val c = parseVersion(current)
        val r = parseVersion(remote)
        if (c[0] != r[0]) return r[0] > c[0]
        if (c[1] != r[1]) return r[1] > c[1]
        return r[2] > c[2]
    }

    private fun parseVersion(v: String): IntArray {
        val parts = v.split('.')
        return intArrayOf(
            parts.getOrNull(0)?.toIntOrNull() ?: 0,
            parts.getOrNull(1)?.toIntOrNull() ?: 0,
            parts.getOrNull(2)?.toIntOrNull() ?: 0
        )
    }

    /** Android 8+ 需要用户为该应用开启「安装未知应用」权限。 */
    fun canInstallUnknownSources(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    /** 跳转到本应用的「安装未知应用」授权页。 */
    fun unknownSourcesIntent(context: Context): Intent =
        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))

    /** 下载目标文件（app 私有外部目录，FileProvider 暴露）。 */
    fun updateFile(context: Context): File =
        File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), APK_FILE_NAME)

    // ----------------------------------------------------------------------------
    // 活跃下载的持久化与恢复
    // ----------------------------------------------------------------------------

    /** 进程启动时调用：从 SharedPreferences 恢复活跃下载记录，供广播接收器 / 界面续接使用。 */
    fun restoreActive(context: Context) {
        val sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val id = sp.getLong(K_ID, -1L)
        val url = sp.getString(K_URL, null)
        val ver = sp.getString(K_VERSION, null)
        if (id >= 0 && url != null && ver != null) {
            activeId = id
            activeUrl = url
            activeVersion = ver
            Log.d(TAG, "restoreActive id=$id version=$ver")
        }
    }

    private fun persistActive(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().apply {
            putLong(K_ID, activeId)
            putString(K_URL, activeUrl)
            putString(K_VERSION, activeVersion)
            apply()
        }
    }

    /** 清理活跃下载记录（下载完成安装后 / 失败 / 找不到时）。 */
    fun clearActive(context: Context) {
        activeId = -1L
        activeUrl = null
        activeVersion = null
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().apply {
            remove(K_ID); remove(K_URL); remove(K_VERSION)
            apply()
        }
    }

    /** 当前是否有活跃下载。 */
    fun isActive(): Boolean = activeId >= 0

    /** 返回活跃下载 (id, url, version)；无则返回 null。供界面续接进度使用。 */
    fun getActive(): Triple<Long, String, String>? =
        if (activeId >= 0 && activeUrl != null && activeVersion != null)
            Triple(activeId, activeUrl!!, activeVersion!!) else null

    // ----------------------------------------------------------------------------
    // 下载：开始 / 复用 / 恢复
    // ----------------------------------------------------------------------------

    /**
     * 开始下载或复用已有的活跃下载（断点续传）。
     * - 若已存在同一 url 的活跃下载（运行中 / 已暂停 / 排队中），直接复用其 id 并恢复（不删除已下部分、不重新排队）；
     * - 否则删除残留文件、排队新下载，并记录为活跃下载。
     * 返回 DownloadManager 的下载 id。
     */
    fun startOrResume(context: Context, apkUrl: String, version: String): Long {
        val appCtx = context.applicationContext
        // 新一轮「开始 / 恢复」尝试：清空已调起守卫，允许本次重新触发安装（含用户此前取消安装后重试）
        triggeredIds.clear()
        // 复用同一 url 的活跃下载
        if (activeId >= 0 && activeUrl == apkUrl) {
            val st = getDownloadStatus(appCtx, activeId)
            if (st == DownloadManager.STATUS_PENDING ||
                st == DownloadManager.STATUS_RUNNING ||
                st == DownloadManager.STATUS_PAUSED
            ) {
                // 系统暂停的下载会由其自动恢复，这里直接复用同一 id（不删已下部分、不重新排队）
                Log.d(TAG, "reuse active download id=$activeId status=$st")
                return activeId
            }
            if (st == DownloadManager.STATUS_SUCCESSFUL) {
                // 已下载完成：若文件仍在，直接复用并交给调用方安装，绝不删文件从头重下（破除「再点又重复下载」死循环）
                val f = updateFile(appCtx)
                if (f.exists() && f.length() > 0) {
                    Log.d(TAG, "reuse completed download id=$activeId -> ${f.absolutePath}")
                    return activeId
                }
                // 文件丢失，清理后重建
                clearActive(appCtx)
            } else {
                // FAILED / 找不到 → 清理后重建
                clearActive(appCtx)
            }
        }
        // 新下载
        val file = updateFile(appCtx)
        if (file.exists()) file.delete()
        val dm = appCtx.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val req = DownloadManager.Request(Uri.parse(apkUrl)).apply {
            setTitle("抵达 Reach 更新")
            setDescription("正在下载新版本…")
            setMimeType("application/vnd.android.package-archive")
            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            setDestinationInExternalFilesDir(appCtx, Environment.DIRECTORY_DOWNLOADS, APK_FILE_NAME)
        }
        val id = dm.enqueue(req)
        activeId = id
        activeUrl = apkUrl
        activeVersion = version
        persistActive(appCtx)
        Log.d(TAG, "enqueue download id=$id url=$apkUrl -> ${file.absolutePath}")
        return id
    }

    /** 查询下载状态（DownloadManager.STATUS_*），未找到返回 -1。 */
    fun getDownloadStatus(context: Context, id: Long): Int {
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val cursor = dm.query(DownloadManager.Query().setFilterById(id)) ?: return -1
        cursor.use {
            if (!it.moveToFirst()) return -1
            return it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
        }
    }

    /**
     * 下载完成后触发安装：同一下载 id 只会真正调起一次安装器（靠 [triggeredIds] 去重，
     * 避免设置页轮询与后台广播重复弹安装界面）。
     *
     * 注意：ACTION_VIEW 启动安装器是异步的，startActivity 成功仅代表「已尝试调起」，并不代表安装成功
     * （安装器后续可能因签名冲突 / 解析失败 / 用户取消而失败，这些是系统层、拿不到异常）。
     * 因此这里 **不** 立刻清理 active / 标记最终成功，而把最终确认交给调用方：
     * - 成功 → 由 PACKAGE_ADDED 广播确认后 clearActive；
     * - 失败 / 取消 → 由界面超时复位后 clearActive 并允许重试。
     *
     * @return true 表示已成功调起安装界面（或可重试）；false 表示文件未就绪，调用方应保留 active 供下一轮重试。
     */
    fun finishDownload(context: Context, id: Long): Boolean {
        if (triggeredIds.contains(id)) {
            Log.d(TAG, "install already triggered for id=$id, skip duplicate")
            return true
        }
        val file = updateFile(context)
        if (!file.exists() || file.length() <= 0) {
            Log.w(TAG, "apk not ready for id=$id (missing/empty), skip")
            return false
        }
        val ok = installApk(context, file)
        if (ok) {
            triggeredIds.add(id)
            Log.d(TAG, "finishDownload install triggered id=$id size=${file.length()}")
        } else {
            Log.w(TAG, "finishDownload failed to trigger install id=$id")
        }
        return ok
    }

    /**
     * 查询下载进度，返回 0f~1f；无法获取（找不到 / 失败）时返回 -1f。
     * 注意：PAUSED 也返回当前已下比例（便于界面显示「已下到 X%」而非误判退出）。
     */
    fun queryProgress(context: Context, id: Long): Float {
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val cursor = dm.query(DownloadManager.Query().setFilterById(id)) ?: return -1f
        cursor.use {
            if (!it.moveToFirst()) return -1f
            val status = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            if (status == DownloadManager.STATUS_FAILED) return -1f
            val downloaded = it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            val total = it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            if (total <= 0) return 0f
            return (downloaded.toFloat() / total.toFloat()).coerceIn(0f, 1f)
        }
    }

    // ----------------------------------------------------------------------------
    // 安装
    // ----------------------------------------------------------------------------

    /**
     * 安装 APK。兼容性优先：
     * 1. 先尝试 `ACTION_VIEW` + FileProvider content URI（MIUI/ColorOS/OriginOS 等国产 ROM 最稳）；
     * 2. 失败再回退 PackageInstaller 会话（Pixel/类原生 / Android 模拟器稳）；
     * 3. 最后兜底 `ACTION_INSTALL_PACKAGE`（旧系统）。
     *
     * @return true 表示成功调起安装界面；false 表示全部方式都失败。
     */
    fun installApk(context: Context, file: File): Boolean {
        Log.d(TAG, "install apk: ${file.absolutePath} size=${file.length()}")

        // 方式 1：ACTION_VIEW + content URI（通用性最好，国产 ROM 基本都能弹）
        try {
            installViaViewIntent(context, file)
            return true
        } catch (e: Exception) {
            Log.w(TAG, "ACTION_VIEW install failed, fallback", e)
        }

        // 方式 2：PackageInstaller 会话（API 21+，适合原生/类原生）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                installViaSession(context, file)
                return true
            } catch (e: Exception) {
                Log.w(TAG, "PackageInstaller session failed, fallback", e)
            }
        }

        // 方式 3：ACTION_INSTALL_PACKAGE（旧系统兜底）
        try {
            installViaInstallPackage(context, file)
            return true
        } catch (e: Exception) {
            Log.e(TAG, "ACTION_INSTALL_PACKAGE install failed", e)
        }
        return false
    }

    /** 最通用：调起系统「打开方式」/安装器，用户可见安装弹窗。 */
    private fun installViaViewIntent(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(context, FILE_PROVIDER_AUTHORITY, file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    /** 兜底：ACTION_INSTALL_PACKAGE（必须同时设 data 和 type）。 */
    private fun installViaInstallPackage(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(context, FILE_PROVIDER_AUTHORITY, file)
        val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    /** 通过 PackageInstaller 会话写入并提交流安装（最小 SDK 26，API 21 符号均可用）。 */
    private fun installViaSession(context: Context, file: File) {
        val installer = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        // 关联到本包，使系统将其识别为「自我更新」并弹出安装确认
        try {
            params.setAppPackageName(context.packageName)
        } catch (_: Exception) { /* 部分系统不允许，忽略后仍能提交 */ }
        val sessionId = installer.createSession(params)
        installer.openSession(sessionId).use { session ->
            file.inputStream().use { input ->
                session.openWrite("reach-update", 0, file.length()).use { out ->
                    input.copyTo(out)
                    session.fsync(out)
                }
            }
            // 提交后系统会自行弹出安装确认界面并完成安装
            val statusIntent = Intent(ACTION_INSTALL_STATUS)
            val sender = PendingIntent.getBroadcast(
                context, 0, statusIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            ).intentSender
            session.commit(sender)
        }
    }

    // ----------------------------------------------------------------------------
    // 下载完成广播接收器（APP 级，脱离 UI 生命周期）
    // ----------------------------------------------------------------------------

    /**
     * 在 [ReachApplication.onCreate] 中注册。下载完成（无论设置页是否打开）即调起安装；
     * 安装成功调起才清理活跃记录，失败则保留 active 让用户重试而不重新下载。
     */
    class DownloadCompleteReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (context == null || intent?.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) return
            val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
            if (id != activeId) return
            val appCtx = context.applicationContext
            when (getDownloadStatus(appCtx, id)) {
                DownloadManager.STATUS_SUCCESSFUL -> {
                    Log.d(TAG, "download complete, installing")
                    if (finishDownload(appCtx, id)) {
                        clearActive(appCtx)
                    }
                }
                else -> {
                    Log.w(TAG, "download failed/unknown, clearing active")
                    clearActive(appCtx)
                }
            }
        }
    }

    /** 注册下载完成广播接收器（在 Application.onCreate 调用）。 */
    fun registerReceiver(context: Context) {
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(DownloadCompleteReceiver(), filter, RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            context.registerReceiver(DownloadCompleteReceiver(), filter)
        }
    }
}
