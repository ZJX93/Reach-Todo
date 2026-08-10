package com.zjx93.reach

import android.app.Application
import android.content.Context
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
        appContext = this
        UserPrefs.init(this)
        Session.bootstrap()
        NotificationHelper.ensureChannel(this)
        // 已登录则注册设备以接收推送（登录成功时也会触发，这里覆盖“重启后仍登录”的场景）
        FcmHelper.registerCurrentDevice(this)
    }
}
