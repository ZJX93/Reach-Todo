package com.zjx93.reach

import android.app.Application
import android.content.Context
import android.util.Log
import com.zjx93.reach.data.local.UserPrefs
import com.zjx93.reach.data.remote.Session
import com.zjx93.reach.util.FcmHelper
import com.zjx93.reach.util.NotificationHelper

class ReachApplication : Application() {
    companion object {
        lateinit var appContext: Context
            private set
    }

    override fun onCreate() {
        super.onCreate()
        installCrashLogger()
        try {
            appContext = this
            UserPrefs.init(this)
            Session.bootstrap()
            NotificationHelper.ensureChannel(this)
            // 已登录则注册设备以接收推送（登录成功时也会触发，这里覆盖“重启后仍登录”的场景）
            FcmHelper.registerCurrentDevice(this)
        } catch (e: Throwable) {
            // 任何初始化异常（含 Error 子类如 NoClassDefFoundError）都绝不能让 Application 创建失败，否则会直接闪退
            Log.e("ReachApplication", "启动初始化异常（已降级，App 仍可进入登录页）", e)
        }
    }

    /** 全局未捕获异常落盘：即便仍崩溃，也能在 filesDir/crash.log 拿到精确堆栈，便于定位。 */
    private fun installCrashLogger() {
        val prev = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                val sb = StringBuilder()
                sb.append("time=").append(System.currentTimeMillis()).append("\n")
                sb.append("thread=").append(thread.name).append("\n")
                sb.append(Log.getStackTraceString(throwable)).append("\n----\n")
                applicationContext.openFileOutput("crash.log", MODE_APPEND).use {
                    it.write(sb.toString().toByteArray())
                }
            } catch (_: Throwable) {
                // 记录失败也不影响崩溃流程
            }
            prev?.uncaughtException(thread, throwable)
        }
    }
}
