package com.zjx93.reach.util

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.content.ContextCompat
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
 * 3. 有更新时通过系统 DownloadManager 下载 APK，下载完成后用 FileProvider 调起安装。
 *
 * 走系统下载器（而非 OkHttp 直写）的好处：自带通知/进度、断点续传、后台下载，
 * 且无需额外存储权限（下载到 app 私有外部目录）。
 */
object AppUpdater {
    private const val REPO = "ZJX93/Reach-Todo"
    private const val RELEASES_LATEST = "https://api.github.com/repos/$REPO/releases/latest"
    const val FILE_PROVIDER_AUTHORITY = "com.zjx93.reach.fileprovider"
    private const val APK_FILE_NAME = "reach-update.apk"

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

    /**
     * 用 DownloadManager 下载 APK，完成后自动调起安装。
     * 返回 DownloadManager 的下载 id，可配合 [queryProgress] 轮询进度。
     * 进度/安装通过应用上下文的广播接收器处理，故不受界面销毁影响。
     */
    fun downloadAndInstall(context: Context, apkUrl: String): Long {
        val appCtx = context.applicationContext
        val file = updateFile(appCtx)
        // 清除上一次残留，避免写入冲突
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

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                val recvId = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) ?: -1
                if (recvId != id) return
                try {
                    appCtx.unregisterReceiver(this)
                } catch (_: IllegalArgumentException) {
                    // 已注销，忽略
                }
                val cursor = dm.query(DownloadManager.Query().setFilterById(id))
                cursor.use {
                    if (it.moveToFirst()) {
                        val status = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                        if (status == DownloadManager.STATUS_SUCCESSFUL) {
                            installApk(appCtx, file)
                        }
                    }
                }
            }
        }
        ContextCompat.registerReceiver(
            appCtx,
            receiver,
            IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        return id
    }

    /** 查询下载进度，返回 0f~1f；无法获取时返回 -1f。 */
    fun queryProgress(context: Context, id: Long): Float {
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val cursor = dm.query(DownloadManager.Query().setFilterById(id)) ?: return -1f
        cursor.use {
            if (!it.moveToFirst()) return -1f
            val status = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            if (status != DownloadManager.STATUS_RUNNING && status != DownloadManager.STATUS_PENDING) return -1f
            val downloaded = it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            val total = it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            if (total <= 0) return 0f
            return (downloaded.toFloat() / total.toFloat()).coerceIn(0f, 1f)
        }
    }

    /** 通过 FileProvider 调起系统安装界面。 */
    fun installApk(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(context, FILE_PROVIDER_AUTHORITY, file)
        val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
            data = uri
            flags = Intent.FLAG_GRANT_READ_URI_PERMISSION
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }
}
