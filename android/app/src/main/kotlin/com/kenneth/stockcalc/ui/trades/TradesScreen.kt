package com.kenneth.stockcalc.ui.trades

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kenneth.stockcalc.ui.components.TradeCard

@Composable
fun TradesScreen(viewModel: TradesViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var updatingId by remember { mutableStateOf<String?>(null) }
    var closingId by remember { mutableStateOf<String?>(null) }

    DisposableEffect(viewModel) {
        viewModel.startAutoRefresh()
        onDispose { viewModel.stopAutoRefresh() }
    }

    if (state.items.isEmpty()) {
        Text(
            "尚無持倉",
            modifier = Modifier.padding(16.dp),
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        items(state.items, key = { it.trade.id }) { item ->
            TradeCard(
                item = item,
                displayCurrency = state.displayCurrency,
                onUpdateStopLoss = { updatingId = item.trade.id },
                onClose = { closingId = item.trade.id },
                onDelete = { viewModel.deleteTrade(item.trade.id) },
                onOpenChart = { viewModel.openChart(item.trade.id) },
            )
        }
    }

    state.chartTradeId?.let { id ->
        val item = state.items.firstOrNull { it.trade.id == id }
        if (item != null) {
            TradeChartSheet(
                trade = item.trade,
                currentPrice = item.currentPrice,
                displayCurrency = state.displayCurrency,
                state = state.chart,
                onLoad = { /* already triggered by openChart */ },
                onDismiss = { viewModel.closeChart() },
            )
        }
    }

    updatingId?.let { id ->
        val symbol = state.items.firstOrNull { it.trade.id == id }?.trade?.symbol ?: ""
        UpdateStopLossDialog(
            tradeSymbol = symbol,
            onConfirm = {
                viewModel.updateStopLoss(id, it)
                updatingId = null
            },
            onDismiss = { updatingId = null },
        )
    }
    closingId?.let { id ->
        val symbol = state.items.firstOrNull { it.trade.id == id }?.trade?.symbol ?: ""
        CloseTradeDialog(
            tradeSymbol = symbol,
            onConfirm = {
                viewModel.closeTrade(id, it)
                closingId = null
            },
            onDismiss = { closingId = null },
        )
    }
}
