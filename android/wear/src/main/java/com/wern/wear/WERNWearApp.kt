package com.wern.wear

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.*
import androidx.compose.foundation.Canvas
import androidx.compose.material.CircularProgressIndicator
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue

@Composable
fun WERNWearApp(viewModel: WalkViewModel) {
    val state by viewModel.state.collectAsState()
    val config = LocalConfiguration.current
    val isRound = config.isScreenRound

    MaterialTheme(
        colors = Colors(
            primary = Color(0xFF22C55E),
            secondary = Color(0xFF003B4C),
            background = Color(0xFF0A0E1A),
            surface = Color(0xFF141B2D),
            onPrimary = Color.White,
            onSecondary = Color.White,
            onBackground = Color.White,
            onSurface = Color.White,
            onSurfaceVariant = Color(0xFF64748B),
            error = Color(0xFFEF4444),
            onError = Color.White
        )
    ) {
        val listState = rememberScalingLazyListState()

        Scaffold(
            timeText = { TimeText(
                timeTextStyle = TimeTextDefaults.timeTextStyle(
                    fontSize = 11.sp,
                    color = Color.White.copy(alpha = 0.5f)
                )
            ) },
            positionIndicator = { PositionIndicator(scalingLazyListState = listState) }
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                Color(state.causeColor).copy(alpha = 0.08f),
                                Color(0xFF0A0E1A),
                                Color(0xFF0A0E1A)
                            ),
                            radius = 500f
                        )
                    )
            ) {
                ScalingLazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    contentPadding = PaddingValues(
                        top = if (isRound) 36.dp else 24.dp,
                        bottom = 48.dp,
                        start = if (isRound) 16.dp else 10.dp,
                        end = if (isRound) 16.dp else 10.dp
                    )
                ) {
                    // Progress Ring
                    item {
                        ProgressRing(
                            progress = state.progress,
                            steps = state.stepCount,
                            goal = state.dailyGoal,
                            isWalking = state.isWalking,
                            elapsed = state.elapsedFormatted,
                            causeColor = Color(state.causeColor),
                            isRound = isRound
                        )
                    }

                    // Stats
                    item { Spacer(modifier = Modifier.height(6.dp)) }
                    item {
                        StatsRow(
                            km = state.km,
                            kcal = state.kcal,
                            litties = state.littiesCalc,
                            causeColor = Color(state.causeColor)
                        )
                    }

                    // Cause
                    item { Spacer(modifier = Modifier.height(4.dp)) }
                    item {
                        CauseBadge(name = state.causeName, color = Color(state.causeColor))
                    }

                    // Button
                    item { Spacer(modifier = Modifier.height(8.dp)) }
                    item {
                        WalkButton(
                            isWalking = state.isWalking,
                            causeColor = Color(state.causeColor),
                            isRound = isRound,
                            onToggle = {
                                if (state.isWalking) viewModel.stopWalking()
                                else viewModel.startWalking()
                            }
                        )
                    }

                    // Cause Selector
                    item { Spacer(modifier = Modifier.height(16.dp)) }
                    item {
                        Text(
                            "WALK FOR",
                            fontSize = 9.sp, fontWeight = FontWeight.Bold,
                            color = Color.White.copy(alpha = 0.3f),
                            letterSpacing = 2.sp
                        )
                    }
                    item { Spacer(modifier = Modifier.height(4.dp)) }

                    val causes = listOf(
                        Triple(1, "Forest Restoration", 0xFF22C55E),
                        Triple(2, "Clean Water", 0xFF0E7490),
                        Triple(3, "Food Security", 0xFFF59E0B),
                        Triple(4, "Women", 0xFFEC4899),
                        Triple(5, "Kids Walk", 0xFF003B4C)
                    )
                    causes.forEach { (id, name, color) ->
                        item {
                            CauseChip(
                                name = name,
                                color = Color(color),
                                isSelected = state.activeCause == id,
                                isRound = isRound,
                                onClick = { viewModel.selectCause(id) }
                            )
                        }
                    }

                    // ── Pair with Phone ──
                    item { Spacer(modifier = Modifier.height(20.dp)) }
                    item {
                        Text(
                            "PHONE", fontSize = 9.sp, fontWeight = FontWeight.Bold,
                            color = Color.White.copy(alpha = 0.3f), letterSpacing = 2.sp
                        )
                    }
                    item { Spacer(modifier = Modifier.height(4.dp)) }
                    item {
                        PairWithPhoneSection(
                            isConnected = state.isPhoneConnected,
                            isRound = isRound,
                            onPair = { code -> viewModel.pairWithCode(code) }
                        )
                    }
                }
            }
        }
    }
}

// ── Progress Ring ──
@Composable
fun ProgressRing(
    progress: Float,
    steps: Int,
    goal: Int,
    isWalking: Boolean,
    elapsed: String,
    causeColor: Color,
    isRound: Boolean
) {
    val size = if (isRound) 140.dp else 128.dp
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(600, easing = FastOutSlowInEasing),
        label = "progress"
    )

    // Pulsing glow when walking
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.15f,
        targetValue = if (isWalking) 0.35f else 0.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )

    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(size)) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokeW = 10f
            val pad = strokeW / 2
            val arcSize = Size(this.size.width - strokeW, this.size.height - strokeW)
            val topLeft = Offset(pad, pad)

            // Glow behind the arc
            if (animatedProgress > 0f) {
                drawArc(
                    color = causeColor.copy(alpha = glowAlpha),
                    startAngle = -90f,
                    sweepAngle = 360f * animatedProgress,
                    useCenter = false,
                    topLeft = Offset(pad - 4, pad - 4),
                    size = Size(arcSize.width + 8, arcSize.height + 8),
                    style = Stroke(width = 18f, cap = StrokeCap.Round)
                )
            }

            // Track
            drawArc(
                color = Color.White.copy(alpha = 0.06f),
                startAngle = 0f, sweepAngle = 360f,
                useCenter = false, topLeft = topLeft, size = arcSize,
                style = Stroke(width = strokeW, cap = StrokeCap.Round)
            )

            // Progress arc
            if (animatedProgress > 0f) {
                drawArc(
                    brush = Brush.sweepGradient(
                        colors = listOf(causeColor.copy(alpha = 0.6f), causeColor),
                    ),
                    startAngle = -90f,
                    sweepAngle = 360f * animatedProgress,
                    useCenter = false, topLeft = topLeft, size = arcSize,
                    style = Stroke(width = strokeW, cap = StrokeCap.Round)
                )
            }
        }

        // Center text
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            if (isWalking) {
                Text(
                    elapsed,
                    fontSize = 10.sp, fontWeight = FontWeight.Medium,
                    color = causeColor.copy(alpha = 0.8f),
                    letterSpacing = 1.sp
                )
                Spacer(Modifier.height(2.dp))
            }
            Text(
                formatNumber(steps),
                fontSize = 32.sp, fontWeight = FontWeight.ExtraBold,
                color = Color.White,
                letterSpacing = (-1).sp
            )
            Text(
                "/ ${formatGoal(goal)} steps",
                fontSize = 10.sp, fontWeight = FontWeight.Medium,
                color = Color.White.copy(alpha = 0.3f)
            )
        }
    }
}

// ── Stats Row ──
@Composable
fun StatsRow(km: Float, kcal: Int, litties: Int, causeColor: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White.copy(alpha = 0.05f))
            .padding(vertical = 10.dp, horizontal = 6.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        StatItem("%.1f".format(km), "km", Color(0xFF0D9488))
        Box(Modifier.width(1.dp).height(24.dp).background(Color.White.copy(alpha = 0.06f)))
        StatItem("$kcal", "kcal", Color(0xFFF59E0B))
        Box(Modifier.width(1.dp).height(24.dp).background(Color.White.copy(alpha = 0.06f)))
        StatItem("$litties", "litties", causeColor)
    }
}

@Composable
fun StatItem(value: String, unit: String, accent: Color) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(horizontal = 6.dp)
    ) {
        Text(
            value, fontSize = 16.sp, fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            unit, fontSize = 9.sp, fontWeight = FontWeight.SemiBold,
            color = accent.copy(alpha = 0.7f),
            letterSpacing = 0.5.sp
        )
    }
}

// ── Cause Badge ──
@Composable
fun CauseBadge(name: String, color: Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 14.dp, vertical = 5.dp)
    ) {
        Text(
            name, fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
            color = color, letterSpacing = 0.3.sp
        )
    }
}

// ── Walk Button ──
@Composable
fun WalkButton(isWalking: Boolean, causeColor: Color, isRound: Boolean, onToggle: () -> Unit) {
    val bgColor = if (isWalking) Color(0xFFEF4444) else causeColor

    Button(
        onClick = onToggle,
        modifier = Modifier
            .fillMaxWidth(if (isRound) 0.72f else 0.85f)
            .height(42.dp),
        colors = ButtonDefaults.buttonColors(backgroundColor = bgColor),
        shape = if (isRound) CircleShape else RoundedCornerShape(12.dp)
    ) {
        Text(
            if (isWalking) "STOP" else "START WALK",
            fontSize = 13.sp, fontWeight = FontWeight.ExtraBold,
            color = Color.White, letterSpacing = 1.sp
        )
    }
}

// ── Cause Chip ──
@Composable
fun CauseChip(name: String, color: Color, isSelected: Boolean, isRound: Boolean, onClick: () -> Unit) {
    val shape = if (isRound) RoundedCornerShape(20.dp) else RoundedCornerShape(12.dp)
    val bg = if (isSelected) color.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.03f)

    Chip(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(40.dp),
        colors = ChipDefaults.chipColors(backgroundColor = bg),
        shape = shape,
        border = ChipDefaults.chipBorder(),
        label = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(if (isSelected) color else Color.White.copy(alpha = 0.15f))
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    name, fontSize = 12.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSelected) color else Color.White.copy(alpha = 0.5f)
                )
            }
        }
    )
}

// ── Pair with Phone ──
@Composable
fun PairWithPhoneSection(isConnected: Boolean, isRound: Boolean, onPair: (String) -> Unit) {
    var showInput by remember { mutableStateOf(false) }
    var code by remember { mutableStateOf("") }
    var isPairing by remember { mutableStateOf(false) }

    val shape = if (isRound) RoundedCornerShape(20.dp) else RoundedCornerShape(12.dp)

    if (isConnected) {
        // Already connected
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(shape)
                .background(Color(0xFF22C55E).copy(alpha = 0.1f))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                Box(Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF22C55E)))
                Spacer(Modifier.width(8.dp))
                Text("Phone connected", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF22C55E))
            }
        }
    } else if (!showInput) {
        // Show pair button
        Chip(
            onClick = { showInput = true },
            modifier = Modifier.fillMaxWidth().height(42.dp),
            colors = ChipDefaults.chipColors(backgroundColor = Color.White.copy(alpha = 0.06f)),
            shape = shape,
            label = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Pair with Phone", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.White.copy(alpha = 0.7f))
                }
            }
        )
    } else {
        // Code input
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(shape)
                .background(Color.White.copy(alpha = 0.05f))
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "Enter the code shown\non your phone",
                fontSize = 11.sp, color = Color.White.copy(alpha = 0.5f),
                textAlign = TextAlign.Center, lineHeight = 16.sp
            )
            Spacer(Modifier.height(12.dp))

            // Code display - 4 boxes
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (i in 0 until 4) {
                    val digit = code.getOrNull(i)?.toString() ?: ""
                    val isCurrent = i == code.length
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (digit.isNotEmpty()) Color(0xFF22C55E).copy(alpha = 0.2f)
                                else if (isCurrent) Color.White.copy(alpha = 0.1f)
                                else Color.White.copy(alpha = 0.04f)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            digit,
                            fontSize = 16.sp, fontWeight = FontWeight.Bold,
                            color = if (digit.isNotEmpty()) Color.White else Color.White.copy(alpha = 0.2f)
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))

            // Number pad
            val keys = listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf("C", "0", "OK")
            )
            keys.forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(vertical = 2.dp)) {
                    row.forEach { key ->
                        val isAction = key == "C" || key == "OK"
                        val btnColor = when (key) {
                            "OK" -> if (code.length == 4) Color(0xFF22C55E) else Color.White.copy(alpha = 0.05f)
                            "C" -> Color(0xFFEF4444).copy(alpha = 0.15f)
                            else -> Color.White.copy(alpha = 0.07f)
                        }
                        val textColor = when (key) {
                            "OK" -> if (code.length == 4) Color.White else Color.White.copy(alpha = 0.2f)
                            "C" -> Color(0xFFEF4444)
                            else -> Color.White.copy(alpha = 0.8f)
                        }

                        Button(
                            onClick = {
                                when (key) {
                                    "C" -> code = if (code.isNotEmpty()) code.dropLast(1) else { showInput = false; "" }
                                    "OK" -> if (code.length == 4) { isPairing = true; onPair(code) }
                                    else -> if (code.length < 4) code += key
                                }
                            },
                            modifier = Modifier.size(30.dp),
                            colors = ButtonDefaults.buttonColors(backgroundColor = btnColor),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                key, fontSize = if (isAction) 9.sp else 12.sp,
                                fontWeight = FontWeight.Bold, color = textColor
                            )
                        }
                    }
                }
            }

            // Pairing status
            if (isPairing) {
                Spacer(Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    androidx.compose.material.CircularProgressIndicator(
                        modifier = Modifier.size(14.dp),
                        color = Color(0xFF22C55E),
                        strokeWidth = 2.dp
                    )
                    Spacer(Modifier.width(8.dp))
                    Text("Connecting...", fontSize = 11.sp, color = Color(0xFF22C55E))
                }
            }
        }
    }
}

// ── Helpers ──
fun formatNumber(n: Int): String = when {
    n >= 1_000_000 -> "%.1fM".format(n / 1_000_000f)
    n >= 10_000 -> "%.1fK".format(n / 1_000f)
    else -> "%,d".format(n)
}

fun formatGoal(g: Int): String = if (g >= 1000) "${g / 1000}K" else "$g"
