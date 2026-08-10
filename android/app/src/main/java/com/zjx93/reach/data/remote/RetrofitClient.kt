package com.zjx93.reach.data.remote

import com.google.gson.GsonBuilder
import com.zjx93.reach.data.local.UserPrefs
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.atomic.AtomicReference

/** 进程内令牌镜像：AuthInterceptor 在请求时同步读取，避免每次请求都走 DataStore 异步。 */
object Session {
    private val _token = AtomicReference("")
    var token: String
        get() = _token.get()
        set(v) = _token.set(v)

    fun bootstrap() {
        // 应用启动时从持久化层同步读取一次；任何异常都降级为「未登录」，绝不阻断启动
        token = try {
            runBlocking { UserPrefs.tokenFlow.first() }
        } catch (e: Exception) {
            android.util.Log.w("Session", "读取本地令牌失败，已降级为未登录", e)
            ""
        }
    }
}

class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
        val req = chain.request()
        val t = Session.token
        return if (t.isNotEmpty()) {
            chain.proceed(req.newBuilder().header("Authorization", "Bearer $t").build())
        } else {
            chain.proceed(req)
        }
    }
}

object RetrofitClient {
    private val gson = GsonBuilder().setLenient().create()
    private val client = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor())
        .build()

    private var baseUrl: String = ""
    private var apiService: ApiService? = null

    /** 按当前服务器地址取 ApiService；地址变化时才重建 Retrofit。 */
    fun api(serverUrl: String): ApiService {
        // 空白地址降级到默认后端，避免 Retrofit baseUrl("") 抛 IllegalArgumentException 导致崩溃
        val clean = if (serverUrl.isBlank()) "http://192.168.9.3:8000" else serverUrl
        val url = if (clean.endsWith("/")) clean else "$clean/"
        synchronized(this) {
            if (url != baseUrl || apiService == null) {
                baseUrl = url
                apiService = Retrofit.Builder()
                    .baseUrl(url)
                    .client(client)
                    .addConverterFactory(GsonConverterFactory.create(gson))
                    .build()
                    .create(ApiService::class.java)
            }
            return apiService!!
        }
    }
}
