package dev.tomorrowtools.resume

import android.util.Log
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.Dns
import okhttp3.Interceptor
import okio.Buffer
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okhttp3.logging.HttpLoggingInterceptor
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.Retrofit
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.TimeUnit
import javax.net.SocketFactory
import java.security.MessageDigest
import java.io.IOException

val appJson = Json {
    ignoreUnknownKeys = true
    isLenient = true
    encodeDefaults = true
    explicitNulls = false
}

fun buildOkHttp(tokenProvider: () -> String?): OkHttpClient {
    val auth = Interceptor { chain ->
        val t = tokenProvider()
        val req = if (!t.isNullOrBlank()) {
            chain.request().newBuilder().header("Authorization", "Bearer $t").build()
        } else chain.request()
        chain.proceed(req)
    }
    // Release: never BODY-log. Debug may BODY-log locally but redacts bearer/tokens.
    val log = HttpLoggingInterceptor { msg ->
        Log.d("ResumeHttp", redactHttpLog(msg))
    }.apply {
        level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
        else HttpLoggingInterceptor.Level.NONE
    }
    val idempotency = Interceptor { chain ->
        val request = chain.request()
        if (request.method == "POST" && request.body != null &&
            request.header("x-idempotency-key") == null) {
            val buffer = Buffer()
            request.body!!.writeTo(buffer)
            val digest = MessageDigest.getInstance("SHA-256")
                .digest(buffer.readByteArray())
                .joinToString("") { "%02x".format(it) }
            chain.proceed(request.newBuilder().header("x-idempotency-key", digest).build())
        } else {
            chain.proceed(request)
        }
    }
    val recoveryPolling = Interceptor { chain ->
        var response = chain.proceed(chain.request())
        if (response.code != 202) return@Interceptor response
        val queuedBody = response.body?.string().orEmpty()
        val jobId = runCatching {
            appJson.parseToJsonElement(queuedBody).jsonObject["recoveryJobId"]
                ?.jsonPrimitive?.contentOrNull
        }.getOrNull() ?: return@Interceptor response.newBuilder()
            .body(queuedBody.toResponseBody(response.body?.contentType()))
            .build()
        response.close()
        repeat(180) {
            Thread.sleep(500)
            val pollUrl = chain.request().url.newBuilder()
                .encodedPath("/api/recovery/jobs/$jobId")
                .query(null)
                .build()
            val pollRequest = chain.request().newBuilder()
                .url(pollUrl)
                .get()
                .removeHeader("Content-Type")
                .build()
            response = chain.proceed(pollRequest)
            val pollText = response.body?.string().orEmpty()
            val job = runCatching {
                appJson.parseToJsonElement(pollText).jsonObject["job"]?.jsonObject
            }.getOrNull()
            val status = job?.get("status")?.jsonPrimitive?.contentOrNull
            if (status == "completed") {
                val result = job["result"] ?: error("Recovery completed without a result")
                response.close()
                return@Interceptor Response.Builder()
                    .request(chain.request())
                    .protocol(response.protocol)
                    .code(200)
                    .message("Recovered")
                    .headers(response.headers)
                    .body(result.toString().toResponseBody("application/json".toMediaType()))
                    .build()
            }
            if (status == "failed" || status == "cancelled") {
                val detail = job["error"]?.jsonPrimitive?.contentOrNull ?: "Recovery job failed"
                response.close()
                throw IOException(detail)
            }
            response.close()
        }
        throw IOException("Recovery is still reconciling. Reopen this action to resume status.")
    }
    return OkHttpClient.Builder()
        .dns(PreferIpv4Dns)
        .socketFactory(Ipv4SocketFactory)
        .addInterceptor(auth)
        .addInterceptor(idempotency)
        .addInterceptor(recoveryPolling)
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

/** Redact bearer tokens from OkHttp debug logs (release still uses Level.NONE). */
internal fun redactHttpLog(msg: String): String =
    msg
        .replace(Regex("""(?i)Authorization:\s*Bearer\s+\S+"""), "Authorization: Bearer [redacted]")
        .replace(Regex("""(?i)"token"\s*:\s*"[^"]+""""), """"token":"[redacted]"""")
        .replace(Regex("""(?i)"password"\s*:\s*"[^"]+""""), """"password":"[redacted]"""")

