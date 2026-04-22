package com.kenneth.stockcalc.ui.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.ui.theme.EmeraldAccent
import com.kenneth.stockcalc.ui.theme.RoseLoss

@Composable
fun HistoryScreen(vm: HistoryViewModel = hiltViewModel()) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    if (state.closed.isEmpty()) {
        Text("尚無歷史紀錄", modifier = Modifier.padding(16.dp))
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item { TotalCard(state.totalPnlDisplay, state.displayCurrency) }
        items(state.closed, key = { it.id }) { trade ->
            ClosedTradeCard(trade, state.displayCurrency)
        }
    }
}

@Composable
private fun TotalCard(total: Double, ccy: Currency) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            val color: Color = if (total >= 0) EmeraldAccent else RoseLoss
            Text("已實現 P&L 合計:", color = Color.Unspecified)
            Text("${ccy.name} ${"%,.2f".format(total)}", color = color)
        }
    }
}

@Composable
private fun ClosedTradeCard(t: Trade, displayCurrency: Currency) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            val native = t.nativeCurrency.name
            Text("${t.symbol} · ${t.shares} shares")
            Text("Entry: $native ${"%.2f".format(t.entryPrice)} · Exit: $native ${"%.2f".format(t.exitPrice ?: 0.0)}")
            val pnlNative = t.pnl ?: 0.0
            val pnlDisplay = Currency.convert(pnlNative, t.nativeCurrency, displayCurrency)
            val color = if (pnlDisplay >= 0) EmeraldAccent else RoseLoss
            Text("P&L: ${displayCurrency.name} ${"%,.2f".format(pnlDisplay)}", color = color)
        }
    }
}
