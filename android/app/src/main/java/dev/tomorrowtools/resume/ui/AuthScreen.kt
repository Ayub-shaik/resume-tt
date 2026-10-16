package dev.tomorrowtools.resume.ui

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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.tomorrowtools.resume.vm.ResumeStudioVm

private val Ink = Color(0xFF07060A)
private val Amber = Color(0xFFFFB020)
private val Muted = Color(0xFFA39A88)
private val Paper = Color(0xFFFAF6EF)

@Composable
fun AuthScreen(vm: ResumeStudioVm) {
    val ctx = LocalContext.current
    Box(
        Modifier
            .fillMaxSize()
            .background(Ink)
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding(),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(28.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.Start,
        ) {
            Text(
                "ATS-FIRST RESUME TOOL",
                color = Amber,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "RocketCV",
                color = Paper,
                fontSize = 48.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-1.5).sp,
                lineHeight = 48.sp,
            )
            Text(
                "Match the JD. Clear the filter.",
                color = Muted,
                fontSize = 15.sp,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                "Most resumes never reach a human.",
                color = Paper,
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(20.dp))
            RocketSignalVisual()
            Spacer(Modifier.height(24.dp))
            OutlinedTextField(
                value = vm.emailInput,
                onValueChange = vm::updateEmailInput,
                label = { Text("Email", color = Muted) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Paper,
                    unfocusedTextColor = Paper,
                    focusedBorderColor = Amber,
                    unfocusedBorderColor = Muted.copy(alpha = 0.4f),
                    cursorColor = Amber,
                    focusedLabelColor = Amber,
                    unfocusedLabelColor = Muted,
                ),
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = vm.passwordInput,
                onValueChange = vm::updatePasswordInput,
                label = { Text("Password", color = Muted) },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Paper,
                    unfocusedTextColor = Paper,
                    focusedBorderColor = Amber,
                    unfocusedBorderColor = Muted.copy(alpha = 0.4f),
                    cursorColor = Amber,
                    focusedLabelColor = Amber,
                    unfocusedLabelColor = Muted,
                ),
            )
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { vm.signInWithPassword() },
                enabled = !vm.busy && vm.emailInput.isNotBlank() && vm.passwordInput.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(999.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Amber,
                    contentColor = Ink,
                    disabledContainerColor = Amber.copy(alpha = 0.35f),
                    disabledContentColor = Ink.copy(alpha = 0.5f),
                ),
            ) { Text("Sign in", fontWeight = FontWeight.Bold) }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { vm.startGoogleBrowser(ctx) },
                enabled = !vm.busy,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(999.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Paper),
            ) { Text("Continue with Google", fontWeight = FontWeight.SemiBold) }
            if (vm.busy) {
                Spacer(Modifier.height(16.dp))
                CircularProgressIndicator(color = Amber)
            }
            vm.error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, color = Color(0xFFFF8A80))
            }
        }
        Text(
            "TomorrowTools",
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp),
            color = Muted,
            fontSize = 12.sp,
            letterSpacing = 1.sp,
        )
    }
}
