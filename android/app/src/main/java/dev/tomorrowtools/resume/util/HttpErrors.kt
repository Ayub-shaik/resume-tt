package dev.tomorrowtools.resume.util

import android.util.Log
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException

fun Throwable.toUserMessage(tag: String = "ResumeApi"): String {
    Log.e(tag, message ?: javaClass.simpleName, this)
    return when (this) {
        is HttpException -> {
            val raw = try {
                response()?.errorBody()?.string()
            } catch (_: Exception) {
                null
            }
            val detail = extractErrorDetail(raw)
            if (detail != null) "HTTP ${code()}: $detail"
            else "HTTP ${code()}${raw?.take(200)?.let { ": $it" } ?: ""}"
        }
        is IOException -> "Network error: ${message ?: "connection failed"}"
        else -> message ?: toString()
    }
}

fun extractErrorDetail(raw: String?): String? {
    if (raw.isNullOrBlank()) return null
    return try {
        val o = JSONObject(raw)
        sequenceOf("error", "message", "detail")
            .mapNotNull { key -> o.optString(key).takeIf { it.isNotBlank() } }
            .firstOrNull()
            ?: raw.take(280)
    } catch (_: Exception) {
        raw.take(280)
    }
}
