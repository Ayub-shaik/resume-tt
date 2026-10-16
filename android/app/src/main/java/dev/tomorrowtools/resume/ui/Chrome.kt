package dev.tomorrowtools.resume.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun RocketCard(
    selected: Boolean = false,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val shape = RoundedCornerShape(20.dp)
    Column(
        modifier
            .fillMaxWidth()
            .shadow(
                elevation = 16.dp,
                shape = shape,
                ambientColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.35f),
                spotColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.28f),
            )
            .clip(shape)
            .background(RocketSurface)
            .then(if (selected) Modifier.border(2.dp, RocketAmber, shape) else Modifier)
            .padding(20.dp),
    ) {
        content()
    }
}

@Composable
fun ScoreRing(
    label: String,
    valueText: String,
    fraction: Float,
    tickFraction: Float? = null,
    modifier: Modifier = Modifier,
) {
    val target = fraction.coerceIn(0f, 1f)
    val anim = remember { Animatable(0f) }
    LaunchedEffect(target) {
        anim.animateTo(target, tween(durationMillis = 700, easing = FastOutSlowInEasing))
    }
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(contentAlignment = Alignment.Center) {
            Canvas(Modifier.size(128.dp)) {
                val stroke = 14.dp.toPx()
                val inset = stroke / 2f
                val diameter = size.minDimension - stroke
                val topLeft = Offset(inset, inset)
                val arcSize = Size(diameter, diameter)
                val style = Stroke(width = stroke, cap = StrokeCap.Round)
                drawArc(
                    color = RocketPaper.copy(alpha = 0.12f),
                    startAngle = -90f,
                    sweepAngle = 360f,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = style,
                )
                drawArc(
                    color = RocketAmber,
                    startAngle = -90f,
                    sweepAngle = 360f * anim.value,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = style,
                )
                val tick = tickFraction
                if (tick != null) {
                    val angle = Math.toRadians((-90.0 + 360.0 * tick.coerceIn(0f, 1f)).toDouble())
                    val radius = diameter / 2f
                    val center = Offset(size.width / 2f, size.height / 2f)
                    val outer = radius + stroke / 2f
                    val inner = radius - stroke / 2f
                    drawLine(
                        color = RocketPaper,
                        start = Offset(
                            center.x + cos(angle).toFloat() * inner,
                            center.y + sin(angle).toFloat() * inner,
                        ),
                        end = Offset(
                            center.x + cos(angle).toFloat() * outer,
                            center.y + sin(angle).toFloat() * outer,
                        ),
                        strokeWidth = 2.dp.toPx(),
                    )
                }
            }
            Text(
                valueText,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                color = RocketPaper,
            )
        }
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = RocketMuted,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}
