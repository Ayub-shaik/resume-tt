package dev.tomorrowtools.resume.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import dev.tomorrowtools.resume.R
import dev.tomorrowtools.resume.vm.ResumeStudioVm

@Composable
fun AuthScreen(vm: ResumeStudioVm) {
    val ctx = LocalContext.current
    Box(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding(),
    ) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0xFF0F766E)),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(R.drawable.ic_launcher_foreground),
                contentDescription = "RocketCV",
                modifier = Modifier.size(64.dp),
            )
        }
        Spacer(Modifier.height(16.dp))
        Text("RocketCV", style = MaterialTheme.typography.headlineLarge)
        Text(
            "Analyse, tailor, brand, and export — native client",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(
            value = vm.emailInput,
            onValueChange = vm::updateEmailInput,
            label = { Text("Email") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = vm.passwordInput,
            onValueChange = vm::updatePasswordInput,
            label = { Text("Password") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = { vm.signInWithPassword() },
            enabled = !vm.busy && vm.emailInput.isNotBlank() && vm.passwordInput.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Sign in") }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = { vm.startGoogleBrowser(ctx) },
            enabled = !vm.busy,
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Continue with Google") }
        if (vm.busy) {
            Spacer(Modifier.height(16.dp))
            CircularProgressIndicator()
        }
        vm.error?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }
    }
        Text(
            "TomorrowTools",
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
