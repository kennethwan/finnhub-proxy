package com.kenneth.stockcalc.ui.calculator

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.unit.dp
import com.kenneth.stockcalc.ui.components.CandleChart
import com.kenneth.stockcalc.ui.components.ChartLine
import com.kenneth.stockcalc.ui.components.LineStyle
import com.kenneth.stockcalc.ui.theme.EmeraldAccent
import com.kenneth.stockcalc.ui.theme.RoseLoss
import com.kenneth.stockcalc.ui.theme.Slate400

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
                    lines = listOfNotNull(
                        buyPrice?.let { ChartLine(it, EmeraldAccent, LineStyle.DOTTED, "買") },
                        ChartLine(stopLoss, RoseLoss, LineStyle.SOLID, "止"),
                    ),
                    onPriceSelected = { stopLoss = it },
                )
            }

            if (state.keyLevels.isNotEmpty()) {
                Text("支持位（tap 去揀）", style = MaterialTheme.typography.labelSmall, color = Slate400)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.keyLevels.forEach { kl ->
                        TextButton(onClick = { stopLoss = kl.price * 0.995 }) {
                            Text("%.2f".format(kl.price))
                        }
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
