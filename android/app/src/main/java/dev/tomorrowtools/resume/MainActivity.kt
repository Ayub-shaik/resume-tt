package dev.tomorrowtools.resume

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import dev.tomorrowtools.resume.ui.AuthScreen
import dev.tomorrowtools.resume.ui.StudioScreen
import dev.tomorrowtools.resume.vm.ResumeStudioVm

class MainActivity : ComponentActivity() {
    private val vm: ResumeStudioVm by viewModels { ResumeStudioVm.factory(application) }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Prefer IPv4 before any OkHttp traffic (emulator dual-stack quirks).
        System.setProperty("java.net.preferIPv4Stack", "true")
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme {
                ResumeApp(vm)
            }
        }
        intent?.data?.let { handleDeepLink(it) }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.data?.let { handleDeepLink(it) }
    }

    private fun handleDeepLink(uri: Uri) {
        when {
            uri.scheme == "ttresume" && uri.host == "oauth" -> {
                val token = uri.getQueryParameter("token") ?: return
                val email = uri.getQueryParameter("email")
                vm.applyOAuthToken(token, email)
            }
            uri.scheme == "ttresume" ||
                (uri.scheme == "https" && uri.host?.contains("resume.tomorrowtools.dev") == true) -> {
                // Open native studio (already primary UI when signed in)
            }
        }
    }
}

@Composable
private fun ResumeApp(vm: ResumeStudioVm) {
    if (vm.email == null) AuthScreen(vm) else StudioScreen(vm)
}
