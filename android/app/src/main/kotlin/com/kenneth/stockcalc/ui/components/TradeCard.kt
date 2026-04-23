package com.kenneth.stockcalc.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.ui.theme.EmeraldAccent
import com.kenneth.stockcalc.ui.theme.RoseLoss
import com.kenneth.stockcalc.ui.trades.TradeItem

@Composable
fun TradeCard(
    item: TradeItem,
    displayCurrency: Currency,
    onUpdateStopLoss: () -> Unit,
    onClose: () -> Unit,
    onDelete: () -> Unit,
    onOpenChart: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val rMultiple = run {
        val risk = item.trade.entryPrice - item.trade.initialStopLoss
        val price = item.currentPrice
        if (price != null && risk > 0) (price - item.trade.entryPrice) / risk else null
    }
    Card(modifier = modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(item.trade.symbol, style = MaterialTheme.typography.titleMedium)
                    if (item.isRiskFree) RiskFreeBadge()
                }
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    rMultiple?.let { r ->
                        Text(
                            "%+.2fR".format(r),
                            color = if (r >= 0) EmeraldAccent else RoseLoss,
                            style = MaterialTheme.typography.titleMedium,
                        )
                    }
                    TextButton(onClick = onOpenChart) { Text("📊") }
                }
            }
            val native = item.trade.nativeCurrency.name
            Text("Entry: $native ${"%.2f".format(item.trade.entryPrice)}  ·  Shares: ${item.trade.shares}")
            Text("Stop: $native ${"%.2f".format(item.trade.currentStopLoss)}")
            item.currentPrice?.let { price ->
                Text("Current: $native ${"%.2f".format(price)}  (${"%+.2f".format(item.changePercent ?: 0.0)}%)")
            } ?: Text("Current: —")
            item.unrealizedPnl?.let { pnl ->
                val color = if (pnl >= 0) EmeraldAccent else RoseLoss
                Text(
                    "P&L: ${displayCurrency.name} ${"%,.2f".format(pnl)}  (${"%+.2f".format(item.unrealizedPnlPercent ?: 0.0)}%)",
                    color = color,
                )
            }
            Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                TextButton(onClick = onUpdateStopLoss) { Text("推高止損") }
                TextButton(onClick = onClose) { Text("平倉") }
                TextButton(onClick = onDelete) { Text("刪除", color = Color.Red) }
            }
        }
    }
}
