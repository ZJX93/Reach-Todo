package com.zjx93.reach.service

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.zjx93.reach.data.remote.Session
import com.zjx93.reach.util.FcmHelper
import com.zjx93.reach.util.NotificationHelper

/** 处理 FCM：令牌轮换时重新上报；收到消息时弹出系统通知。 */
class ReachFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // 令牌轮换：已登录则立即重新上报
        if (Session.token.isNotEmpty()) {
            FcmHelper.registerCurrentDevice(applicationContext)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val notif = message.notification
        val title = notif?.title ?: message.data["title"] ?: "抵达 · Reach"
        val body = notif?.body ?: message.data["body"] ?: ""
        NotificationHelper.show(applicationContext, title, body)
    }
}
