package dev.tomorrowtools.resume

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

/** Techbytes-style: open Google sign-in in a Custom Tab, return via deep link. */
fun startGoogleBrowserLogin(context: Context) {
    val callback = Uri.encode("/api/auth/mobile/bridge?scheme=ttresume")
    val url = BuildConfig.API_BASE_URL.trimEnd('/') +
        "/api/auth/signin/google?callbackUrl=$callback"
    CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
}
