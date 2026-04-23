package com.kenneth.stockcalc.ui.calculator

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kenneth.stockcalc.domain.model.Candle
import com.kenneth.stockcalc.domain.model.KeyLevel
import com.kenneth.stockcalc.ui.theme.AmberRiskFree
import com.kenneth.stockcalc.ui.theme.EmeraldAccent
import com.kenneth.stockcalc.ui.theme.RoseLoss
import com.kenneth.stockcalc.ui.theme.Slate400
import com.kenneth.stockcalc.ui.theme.Slate700
import com.kenneth.stockcalc.ui.theme.Slate950
import kotlin.math.abs

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StopLossChartSheet(
    symbol: String,
    initialStopLoss: Double?,
    buyPrice: Double?,
    state: ChartState,
    onLoad: () -> Unit,
    onConfirm: (Double) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(symbol) { if (symbol.isNotBlank()) onLoad() }

    var stopLoss by remember(initialStopLoss, state.candles.size) {
        mutableStateOf(
            initialStopLoss
                ?: state.candles.lastOrNull()?.let { it.close * 0.95 }
                ?: 0.0
        )
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("$symbol · 揀止損價", style = MaterialTheme.typography.titleMedium)

            when {
                state.loading -> Box(
                    Modifier.fillMaxWidth().height(280.dp),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator() }

                state.error != null -> Box(
                    Modifier.fillMaxWidth().height(280.dp),
                    contentAlignment = Alignment.Center,
                ) { Text("載入失敗: ${state.error}", color = RoseLoss) }

                state.candles.isEmpty() -> Box(
                    Modifier.fillMaxWidth().height(280.dp),
                    contentAlignment = Alignment.Center,
                ) { Text("冇歷史數據") }

                else -> CandleChart(
                    candles = state.candles,
                    keyLevels = state.keyLevels,
                    buyPrice = buyPrice,
                    stopLoss = stopLoss,
                    onStopLossChange = { stopLoss = it },
                )
            }

            if (state.keyLevels.isNotEmpty()) {
                Text("支持位（tap 去揀）", style = MaterialTheme.typography.labelSmall, color = Slate400)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.keyLevels.forEach { kl ->
                        TextButton(
                            onClick = { stopLoss = kl.price * 0.995 },
                        ) { Text("%.2f".format(kl.price)) }
                    }
                }
            }

            Text(
                "止損價: ${"%.2f".format(stopLoss)}",
                style = MaterialTheme.typography.titleMedium,
                color = RoseLoss,
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("取消") }
                Button(
                    onClick = { onConfirm(stopLoss) },
                    enabled = stopLoss > 0.0,
                    modifier = Modifier.weight(1f),
                ) { Text("設為止損") }
            }
        }
    }
}

@Composable
private fun CandleChart(
    candles: List<Candle>,
    keyLevels: List<KeyLevel>,
    buyPrice: Double?,
    stopLoss: Double,
    onStopLossChange: (Double) -> Unit,
) {
    val padding = 8.dp
    val rightAxisWidth = 56.dp
    val chartHeightDp = 280.dp

    val priceMin = (candles.minOf { it.low }).let { minOf(it, stopLoss) } * 0.98
    val priceMax = (candles.maxOf { it.high }).let { maxOf(it, stopLoss) } * 1.02
    val priceRange = priceMax - priceMin

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(chartHeightDp)
            .clip(RoundedCornerShape(12.dp))
            .background(Slate950)
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(chartHeightDp)
                .pointerInput(candles.size, priceRange) {
                    detectDragGestures { change, _ ->
                        val y = change.position.y.coerceIn(0f, size.height.toFloat())
                        val priceFrac = 1.0 - (y / size.height.toFloat()).toDouble()
                        onStopLossChange(priceMin + priceFrac * priceRange)
                    }
                }
                .pointerInput(candles.size, priceRange) {
                    detectTapGestures { offset ->
                        val priceFrac = 1.0 - (offset.y / size.height.toFloat()).toDouble()
                        onStopLossChange(priceMin + priceFrac * priceRange)
                    }
                }
        ) {
            val w = size.width - rightAxisWidth.toPx() - padding.toPx()
            val h = size.height
            val leftPadPx = padding.toPx()
            val barSlot = w / candles.size
            val bodyWidth = (barSlot * 0.7f).coerceAtLeast(1f)

            fun priceToY(price: Double): Float =
                (h * (1.0 - (price - priceMin) / priceRange)).toFloat().coerceIn(0f, h)

            // Candles
            candles.forEachIndexed { i, c ->
                val xCenter = leftPadPx + barSlot * i + barSlot / 2f
                val color = if (c.close >= c.open) EmeraldAccent else RoseLoss
                drawLine(
                    color = color,
                    start = Offset(xCenter, priceToY(c.high)),
                    end = Offset(xCenter, priceToY(c.low)),
                    strokeWidth = 1.5f,
                )
                val bodyTop = priceToY(maxOf(c.open, c.close))
                val bodyBottom = priceToY(minOf(c.open, c.close))
                drawRect(
                    color = color,
                    topLeft = Offset(xCenter - bodyWidth / 2f, bodyTop),
                    size = androidx.compose.ui.geometry.Size(bodyWidth, (bodyBottom - bodyTop).coerceAtLeast(1f)),
                )
            }

            // Keylevel lines (dashed amber)
            val dashed = PathEffect.dashPathEffect(floatArrayOf(10f, 8f))
            keyLevels.forEach { kl ->
                val y = priceToY(kl.price)
                drawLine(
                    color = AmberRiskFree.copy(alpha = 0.6f),
                    start = Offset(leftPadPx, y),
                    end = Offset(leftPadPx + w, y),
                    strokeWidth = 1.2f,
                    pathEffect = dashed,
                )
            }

            // Buy price (dotted emerald)
            buyPrice?.takeIf { it in priceMin..priceMax }?.let { bp ->
                val y = priceToY(bp)
                val dotted = PathEffect.dashPathEffect(floatArrayOf(4f, 6f))
                drawLine(
                    color = EmeraldAccent.copy(alpha = 0.7f),
                    start = Offset(leftPadPx, y),
                    end = Offset(leftPadPx + w, y),
                    strokeWidth = 1.2f,
                    pathEffect = dotted,
                )
            }

            // Stop loss (solid rose)
            val slY = priceToY(stopLoss)
            drawLine(
                color = RoseLoss,
                start = Offset(leftPadPx, slY),
                end = Offset(leftPadPx + w, slY),
                strokeWidth = 2.5f,
            )

            // Right-side price labels using native canvas
            val paint = android.graphics.Paint().apply {
                color = android.graphics.Color.rgb(226, 232, 240)
                textSize = 28f
                isAntiAlias = true
            }
            val slPaint = android.graphics.Paint(paint).apply {
                color = android.graphics.Color.rgb(244, 63, 94)
            }
            val klPaint = android.graphics.Paint(paint).apply {
                color = android.graphics.Color.rgb(251, 191, 36)
                textSize = 22f
            }
            val axisX = leftPadPx + w + 4f

            drawContext.canvas.nativeCanvas.drawText(
                "%.2f".format(priceMax),
                axisX,
                24f,
                paint,
            )
            drawContext.canvas.nativeCanvas.drawText(
                "%.2f".format(priceMin),
                axisX,
                h - 4f,
                paint,
            )
            drawContext.canvas.nativeCanvas.drawText(
                "%.2f ▸".format(stopLoss),
                axisX,
                slY + 8f,
                slPaint,
            )
            keyLevels.forEach { kl ->
                val y = priceToY(kl.price)
                // avoid overlapping stop-loss label
                if (abs(y - slY) > 24f) {
                    drawContext.canvas.nativeCanvas.drawText(
                        "%.2f".format(kl.price),
                        axisX,
                        y + 6f,
                        klPaint,
                    )
                }
            }
        }
    }
}
