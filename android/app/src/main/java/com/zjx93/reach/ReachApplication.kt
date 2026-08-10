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
        try {
            appContext = this
            UserPrefs.init(this)
            Session.bootstrap()
            NotificationHelper.ensureChannel(this)
            // 已登录则注册设备以接收推送（登录成功时也会触发，这里覆盖“重启后仍登录”的场景）
            FcmHelper.registerCurrentDevice(this)
        } catch (e: Exception) {
            // 任何初始化异常都绝不能让 Application 创建失败，否则会直接闪退
            Log.e("ReachApplication", "启动初始化异常（已降级，App 仍可进入登录页）", e)
        }
    }
}
