package dev.tomorrowtools.resume

import android.util.Log
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.Dns
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.TimeUnit
import javax.net.SocketFactory

val appJson = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = true }

fun buildOkHttp(tokenProvider: () -> String?): OkHttpClient {
    val auth = Interceptor { chain ->
        val t = tokenProvider()
        val req = if (!t.isNullOrBlank()) {
            chain.request().newBuilder().header("Authorization", "Bearer $t").build()
        } else chain.request()
        chain.proceed(req)
    }
    val log = HttpLoggingInterceptor { msg -> Log.d("ResumeHttp", msg) }.apply {
        level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
        else HttpLoggingInterceptor.Level.BASIC
    }
    return OkHttpClient.Builder()
        .dns(PreferIpv4Dns)
        .socketFactory(Ipv4SocketFactory)
        .addInterceptor(auth)
        .addInterceptor(log)
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(240, TimeUnit.SECONDS)
        .writeTimeout(240, TimeUnit.SECONDS)
        .build()
}

/** A records only when present — skip broken emulator IPv6 routes to Cloudflare. */
object PreferIpv4Dns : Dns {
    override fun lookup(hostname: String): List<InetAddress> {
        val all = Dns.SYSTEM.lookup(hostname)
        val v4 = all.filterIsInstance<Inet4Address>()
        return v4.ifEmpty { all }
    }
}

/**
 * Bind sockets to 0.0.0.0 so connect() does not use dual-stack `::` sources
 * (ENETUNREACH to IPv4 Cloudflare on some AVDs).
 */
object Ipv4SocketFactory : SocketFactory() {
    private fun ipv4Socket(): Socket =
        Socket().also { it.bind(InetSocketAddress(Inet4Address.getByName("0.0.0.0"), 0)) }

    override fun createSocket(): Socket = ipv4Socket()

    override fun createSocket(host: String, port: Int): Socket =
        ipv4Socket().also { it.connect(InetSocketAddress(host, port)) }

    override fun createSocket(
        host: String,
        port: Int,
        localHost: InetAddress,
        localPort: Int,
    ): Socket =
        Socket().also {
            it.bind(InetSocketAddress(localHost, localPort))
            it.connect(InetSocketAddress(host, port))
        }

    override fun createSocket(host: InetAddress, port: Int): Socket =
        ipv4Socket().also { it.connect(InetSocketAddress(host, port)) }

    override fun createSocket(
        address: InetAddress,
        port: Int,
        localAddress: InetAddress,
        localPort: Int,
    ): Socket =
        Socket().also {
            it.bind(InetSocketAddress(localAddress, localPort))
            it.connect(InetSocketAddress(address, port))
        }
}

fun buildRetrofit(baseUrl: String, client: OkHttpClient): Retrofit {
    val contentType = "application/json".toMediaType()
    return Retrofit.Builder()
        .baseUrl(baseUrl.trimEnd('/') + "/")
        .client(client)
        .addConverterFactory(appJson.asConverterFactory(contentType))
        .build()
}
