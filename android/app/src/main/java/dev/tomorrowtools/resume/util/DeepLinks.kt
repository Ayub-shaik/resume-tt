package dev.tomorrowtools.resume.util

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri

/** Prefer sibling app scheme; fall back to https host. */
fun openSiblingOrWeb(context: Context, appUri: String, webUrl: String) {
    try {
        context.startActivity(
            Intent(Intent.ACTION_VIEW, Uri.parse(appUri)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
        )
    } catch (_: ActivityNotFoundException) {
        context.startActivity(
            Intent(Intent.ACTION_VIEW, Uri.parse(webUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
        )
    } catch (_: Exception) {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(webUrl)))
    }
}
