package com.zjx93.reach

import android.app.Application
import com.zjx93.reach.data.local.UserPrefs
import com.zjx93.reach.data.remote.Session

class ReachApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        UserPrefs.init(this)
        Session.bootstrap()
    }
}
