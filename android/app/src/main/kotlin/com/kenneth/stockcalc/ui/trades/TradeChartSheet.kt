package com.kenneth.stockcalc.ui.trades

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.ui.calculator.ChartState
import com.kenneth.stockcalc.ui.components.CandleChart
import com.kenneth.stockcalc.ui.components.ChartLine
import com.kenneth.stockcalc.ui.components.LineStyle
import com.kenneth.stockcalc.ui.theme.EmeraldAccent
import com.kenneth.stockcalc.ui.theme.RoseLoss
import com.kenneth.stockcalc.ui.theme.Slate200
import com.kenneth.stockcalc.ui.theme.Slate400

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TradeChartSheet(
    trade: Trade,
    currentPrice: Double?,
    displayCurrency: Currency,
    state: ChartState,
    onLoad: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(trade.id) { onLoad() }

    val initialRiskPerShare = trade.entryPrice - trade.initialStopLoss
    val rMultiple = if (currentPrice != null && initialRiskPerShare > 0) {
        (currentPrice - trade.entryPrice) / initialRiskPerShare
    } else null
    val pnlNative = currentPrice?.let { (it - trade.entryPrice) * trade.shares }
    val pnlDisplay = pnlNative?.let { Currency.convert(it, trade.nativeCurrency, displayCurrency) }
    val rColor = when {
        rMultiple == null -> Slate200
        rMultiple >= 0 -> EmeraldAccent
        else -> RoseLoss
    }
    val native = trade.nativeCurrency.name

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("${trade.symbol} · ${trade.shares} 股", style = MaterialTheme.typography.titleMedium)
            Text(
                "Entry $native ${"%.2f".format(trade.entryPrice)}  ·  Stop $native ${"%.2f".format(trade.currentStopLoss)}",
                color = Slate400,
                style = MaterialTheme.typography.bodySmall,
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    "Now: ${currentPrice?.let { "$native ${"%.2f".format(it)}" } ?: "—"}",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = rMultiple?.let { "%+.2fR".format(it) } ?: "—",
                    color = rColor,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                )
            }
            pnlDisplay?.let { pnl ->
                Text(
                    "P&L: ${displayCurrency.name} ${"%,.2f".format(pnl)}",
                    color = if (pnl >= 0) EmeraldAccent else RoseLoss,
                )
            }

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
                    lines = listOfNotNull(
                        ChartLine(trade.entryPrice, EmeraldAccent, LineStyle.SOLID, "買"),
                        ChartLine(trade.currentStopLoss, RoseLoss, LineStyle.DASHED, "止"),
                        currentPrice?.let { ChartLine(it, Slate200, LineStyle.SOLID, "現") },
                    ),
                )
            }

            TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) { Text("關閉") }
        }
    }
}
