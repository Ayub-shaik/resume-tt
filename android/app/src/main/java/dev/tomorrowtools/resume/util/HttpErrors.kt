package dev.tomorrowtools.resume.util

import android.util.Log
import org.json.JSONObject
import retrofit2.HttpException
import java.net.ConnectException
import java.net.UnknownHostException
import java.io.IOException

fun Throwable.toUserMessage(tag: String = "ResumeApi"): String {
    Log.e(tag, message ?: javaClass.simpleName, this)
    return when (this) {
        is HttpException -> {
            // Recoverable server/job states must never surface as user-facing errors.
            if (code() in setOf(409, 502, 503, 504, 524)) return ""
            val raw = try {
                response()?.errorBody()?.string()
            } catch (_: Exception) {
                null
            }
            val detail = extractErrorDetail(raw)
            // Validation/auth issues: keep quiet in UI; log only (caller may retry or no-op).
            if (code() in setOf(400, 401, 422)) return ""
            if (detail != null) "HTTP ${code()}: $detail"
            else "HTTP ${code()}${raw?.take(200)?.let { ": $it" } ?: ""}"
        }
        is IOException -> {
            val msg = message ?: "connection failed"
            if (
                this is UnknownHostException ||
                this is ConnectException ||
                msg.contains("Unable to resolve host", ignoreCase = true) ||
                msg.contains("No address associated", ignoreCase = true) ||
                msg.contains("Network is unreachable", ignoreCase = true) ||
                msg.contains("No route to host", ignoreCase = true) ||
                msg.contains("Failed to connect", ignoreCase = true) ||
                msg.contains("timeout", ignoreCase = true) ||
                msg.contains("Software caused connection abort", ignoreCase = true)
            ) {
                "Waiting for network / laptop connection…"
            } else {
                "Waiting for network / laptop connection…"
            }
        }
        else -> {
            val msg = message.orEmpty()
            if (
                msg.contains("timed out", ignoreCase = true) ||
                msg.contains("busy", ignoreCase = true) ||
                msg.contains("HTTP 409") ||
                msg.contains("HTTP 502") ||
                msg.contains("HTTP 503") ||
                msg.contains("HTTP 504") ||
                msg.contains("HTTP 524") ||
                msg.contains("Invalid body", ignoreCase = true) ||
                msg.contains("expected string", ignoreCase = true)
            ) {
                ""
            } else {
                msg.ifBlank { "" }
            }
        }
    }
}

/** True when the client should silently wait/retry instead of showing an error. */
fun Throwable.isSilentRecoverable(): Boolean {
    if (this is HttpException && code() in setOf(400, 401, 409, 422, 502, 503, 504, 524)) return true
    val msg = message.orEmpty()
    return msg.contains("timed out", ignoreCase = true) ||
        msg.contains("busy", ignoreCase = true) ||
        msg.contains("HTTP 409") ||
        msg.contains("HTTP 502") ||
        msg.contains("HTTP 503") ||
        msg.contains("HTTP 504") ||
        msg.contains("HTTP 524") ||
        msg.contains("Invalid body", ignoreCase = true) ||
        msg.contains("expected string", ignoreCase = true) ||
        msg.contains("AI_JOB_ACTIVE", ignoreCase = true)
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
