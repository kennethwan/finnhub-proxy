package com.kenneth.stockcalc.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.kenneth.stockcalc.domain.model.Candle
import com.kenneth.stockcalc.domain.model.KeyLevel
import com.kenneth.stockcalc.ui.theme.AmberRiskFree
import com.kenneth.stockcalc.ui.theme.EmeraldAccent
import com.kenneth.stockcalc.ui.theme.RoseLoss
import com.kenneth.stockcalc.ui.theme.Slate200
import com.kenneth.stockcalc.ui.theme.Slate950
import kotlin.math.abs

enum class LineStyle { SOLID, DASHED, DOTTED }

data class ChartLine(
    val price: Double,
    val color: Color,
    val style: LineStyle = LineStyle.SOLID,
    val label: String? = null,
)

@Composable
fun CandleChart(
    candles: List<Candle>,
    modifier: Modifier = Modifier,
    lines: List<ChartLine> = emptyList(),
    keyLevels: List<KeyLevel> = emptyList(),
    onPriceSelected: ((Double) -> Unit)? = null,
    heightDp: Dp = 280.dp,
) {
    if (candles.isEmpty()) return

    val rightAxisWidth = 56.dp
    val leftPadding = 8.dp

    val dataMin = candles.minOf { it.low }
    val dataMax = candles.maxOf { it.high }
    val linePrices = lines.map { it.price } + keyLevels.map { it.price }
    val priceMin = (linePrices + dataMin).min() * 0.98
    val priceMax = (linePrices + dataMax).max() * 1.02
    val priceRange = (priceMax - priceMin).coerceAtLeast(1e-6)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(heightDp)
            .clip(RoundedCornerShape(12.dp))
            .background(Slate950),
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(heightDp)
                .let { m ->
                    if (onPriceSelected == null) m
                    else m
                        .pointerInput(candles.size, priceRange) {
                            detectDragGestures { change, _ ->
                                val y = change.position.y.coerceIn(0f, size.height.toFloat())
                                val frac = 1.0 - (y / size.height.toFloat()).toDouble()
                                onPriceSelected(priceMin + frac * priceRange)
                            }
                        }
                        .pointerInput(candles.size, priceRange) {
                            detectTapGestures { offset ->
                                val frac = 1.0 - (offset.y / size.height.toFloat()).toDouble()
                                onPriceSelected(priceMin + frac * priceRange)
                            }
                        }
                }
        ) {
            val leftPad = leftPadding.toPx()
            val axisPad = rightAxisWidth.toPx()
            val w = size.width - axisPad - leftPad
            val h = size.height
            val barSlot = w / candles.size
            val bodyWidth = (barSlot * 0.7f).coerceAtLeast(1f)
            val axisX = leftPad + w + 4f

            fun priceToY(price: Double): Float =
                (h * (1.0 - (price - priceMin) / priceRange)).toFloat().coerceIn(0f, h)

            candles.forEachIndexed { i, c ->
                val xCenter = leftPad + barSlot * i + barSlot / 2f
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
                    size = Size(bodyWidth, (bodyBottom - bodyTop).coerceAtLeast(1f)),
                )
            }

            val dashed = PathEffect.dashPathEffect(floatArrayOf(10f, 8f))
            keyLevels.forEach { kl ->
                val y = priceToY(kl.price)
                drawLine(
                    color = AmberRiskFree.copy(alpha = 0.6f),
                    start = Offset(leftPad, y),
                    end = Offset(leftPad + w, y),
                    strokeWidth = 1.2f,
                    pathEffect = dashed,
                )
            }

            lines.forEach { line ->
                if (line.price !in priceMin..priceMax) return@forEach
                val y = priceToY(line.price)
                val effect = when (line.style) {
                    LineStyle.SOLID -> null
                    LineStyle.DASHED -> PathEffect.dashPathEffect(floatArrayOf(12f, 6f))
                    LineStyle.DOTTED -> PathEffect.dashPathEffect(floatArrayOf(4f, 6f))
                }
                val stroke = if (line.style == LineStyle.SOLID) 2.5f else 1.6f
                drawLine(
                    color = line.color,
                    start = Offset(leftPad, y),
                    end = Offset(leftPad + w, y),
                    strokeWidth = stroke,
                    pathEffect = effect,
                )
            }

            val axisPaint = android.graphics.Paint().apply {
                color = Slate200.toArgb()
                textSize = 26f
                isAntiAlias = true
            }
            val klPaint = android.graphics.Paint(axisPaint).apply {
                color = AmberRiskFree.toArgb()
                textSize = 22f
            }
            drawContext.canvas.nativeCanvas.drawText(
                "%.2f".format(priceMax), axisX, 24f, axisPaint,
            )
            drawContext.canvas.nativeCanvas.drawText(
                "%.2f".format(priceMin), axisX, h - 4f, axisPaint,
            )

            val drawnLabelYs = mutableListOf<Float>()
            lines.forEach { line ->
                if (line.price !in priceMin..priceMax) return@forEach
                val y = priceToY(line.price)
                if (drawnLabelYs.any { abs(it - y) < 20f }) return@forEach
                val paint = android.graphics.Paint(axisPaint).apply { color = line.color.toArgb() }
                val text = line.label?.let { "$it ${"%.2f".format(line.price)}" } ?: "%.2f".format(line.price)
                drawContext.canvas.nativeCanvas.drawText(text, axisX, y + 8f, paint)
                drawnLabelYs.add(y)
            }
            keyLevels.forEach { kl ->
                val y = priceToY(kl.price)
                if (drawnLabelYs.any { abs(it - y) < 20f }) return@forEach
                drawContext.canvas.nativeCanvas.drawText(
                    "%.2f".format(kl.price), axisX, y + 6f, klPaint,
                )
                drawnLabelYs.add(y)
            }
        }
    }
}
