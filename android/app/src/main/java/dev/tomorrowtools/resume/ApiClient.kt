package dev.tomorrowtools.resume

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

val appJson = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = true }

fun buildOkHttp(tokenProvider: () -> String?): OkHttpClient {
    val auth = Interceptor { chain ->
        val t = tokenProvider()
        val req = if (!t.isNullOrBlank()) {
            chain.request().newBuilder().header("Authorization", "Bearer $t").build()
        } else chain.request()
        chain.proceed(req)
    }
    return OkHttpClient.Builder()
        .addInterceptor(auth)
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(180, TimeUnit.SECONDS)
        .writeTimeout(180, TimeUnit.SECONDS)
        .build()
}

fun buildRetrofit(baseUrl: String, client: OkHttpClient): Retrofit {
    val contentType = "application/json".toMediaType()
    return Retrofit.Builder()
        .baseUrl(baseUrl.trimEnd('/') + "/")
        .client(client)
        .addConverterFactory(appJson.asConverterFactory(contentType))
        .build()
}
