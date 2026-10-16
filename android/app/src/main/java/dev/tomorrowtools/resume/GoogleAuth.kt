package dev.tomorrowtools.resume

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

/**
 * Open the mobile bridge in a Custom Tab. The bridge starts Google OAuth
 * (Auth.js CSRF-safe server signIn) and returns via ttresume://oauth/callback.
 */
fun startGoogleBrowserLogin(context: Context) {
    val url = BuildConfig.API_BASE_URL.trimEnd('/') +
        "/api/auth/mobile/bridge?scheme=ttresume"
    CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
}
