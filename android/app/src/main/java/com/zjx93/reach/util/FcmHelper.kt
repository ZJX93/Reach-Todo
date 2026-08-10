package com.zjx93.reach.util

import android.content.Context
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.zjx93.reach.data.local.UserPrefs
import com.zjx93.reach.data.model.DeviceRegister
import com.zjx93.reach.data.remote.RetrofitClient
import com.zjx93.reach.data.remote.Session
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

/** FCM 设备令牌注册：把当前设备的推送 token 上报给后端 /api/devices/register。 */
object FcmHelper {
    private const val TAG = "FcmHelper"

    /** 若已登录，获取 FCM token 并上报后端；未登录则跳过（登录成功后会再次调用）。 */
    fun registerCurrentDevice(context: Context, platform: String = "android") {
        if (Session.token.isEmpty()) return
        try {
            // Firebase 未正确初始化（如占位 google-services.json / 设备无 Play 服务）时跳过，绝不崩
            if (FirebaseApp.getApps(context).isEmpty()) {
                Log.w(TAG, "Firebase 未初始化，跳过设备注册")
                return
            }
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    Log.w(TAG, "获取 FCM token 失败", task.exception)
                    return@addOnCompleteListener
                }
                val token = task.result ?: return@addOnCompleteListener
                val serverUrl = runBlocking { UserPrefs.serverUrlFlow.first() }
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        RetrofitClient.api(serverUrl)
                            .registerDevice(DeviceRegister(token = token, platform = platform))
                    } catch (e: Exception) {
                        Log.w(TAG, "上报设备 token 失败: ${e.message}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "FCM 设备注册异常（不影响启动）", e)
        }
    }

    /** 注销设备令牌（退出登录时调用）。 */
    fun unregister(context: Context, token: String? = null) {
        val t = token ?: return
        if (Session.token.isEmpty()) return
        try {
            if (FirebaseApp.getApps(context).isEmpty()) return
        } catch (_: Exception) { return }
        val serverUrl = runBlocking { UserPrefs.serverUrlFlow.first() }
        CoroutineScope(Dispatchers.IO).launch {
            try {
                RetrofitClient.api(serverUrl).unregisterDevice(DeviceRegister(token = t))
            } catch (_: Exception) {
            }
        }
    }
}
