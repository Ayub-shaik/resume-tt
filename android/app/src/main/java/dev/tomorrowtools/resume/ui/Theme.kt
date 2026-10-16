package dev.tomorrowtools.resume.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

val RocketInk = Color(0xFF07060A)
val RocketAmber = Color(0xFFFFB020)
val RocketMuted = Color(0xFFA39A88)
val RocketPaper = Color(0xFFFAF6EF)
val RocketSurface = Color(0xFF12100E)
val RocketSurfaceVariant = Color(0xFF1C1814)

private val RocketDarkColors = darkColorScheme(
    primary = RocketAmber,
    onPrimary = RocketInk,
    secondary = RocketMuted,
    onSecondary = RocketInk,
    background = RocketInk,
    onBackground = RocketPaper,
    surface = RocketSurface,
    onSurface = RocketPaper,
    surfaceVariant = RocketSurfaceVariant,
    onSurfaceVariant = RocketMuted,
    primaryContainer = Color(0xFF3A2A12),
    onPrimaryContainer = RocketAmber,
    error = Color(0xFFFF6B6B),
    onError = RocketInk,
    outline = RocketMuted.copy(alpha = 0.45f),
)

@Composable
fun RocketTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = RocketDarkColors,
        shapes = Shapes(
            small = RoundedCornerShape(12.dp),
            medium = RoundedCornerShape(16.dp),
            large = RoundedCornerShape(16.dp),
            extraLarge = RoundedCornerShape(20.dp),
        ),
        content = content,
    )
}

@Composable
fun RocketSignalVisual(modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .height(120.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF120E08), Color(0xFF24180C), Color(0xFF0E0C0A)),
                ),
            )
            .padding(16.dp),
    ) {
        Column(
            Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            horizontalAlignment = Alignment.Start,
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AmberMeter(0.88f, Modifier.weight(1f))
                AmberMeter(0.71f, Modifier.weight(1f))
                AmberMeter(0.94f, Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AmberMeter(0.62f, Modifier.weight(1.1f))
                AmberMeter(0.79f, Modifier.weight(0.9f))
            }
            AmberMeter(0.55f, Modifier.fillMaxWidth(0.65f))
        }
    }
}

@Composable
private fun AmberMeter(fill: Float, modifier: Modifier = Modifier) {
    Box(
        modifier
            .height(10.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(RocketAmber.copy(alpha = 0.15f)),
    ) {
        Box(
            Modifier
                .fillMaxWidth(fill.coerceIn(0.15f, 1f))
                .height(10.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(RocketAmber.copy(alpha = 0.9f)),
        )
    }
}
