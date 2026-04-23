package com.kenneth.stockcalc.ui.calculator

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kenneth.stockcalc.R
import com.kenneth.stockcalc.domain.model.CalculationResult

@Composable
fun CalculatorScreen(
    onTradeAdded: () -> Unit,
    viewModel: CalculatorViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(state.savedTradeId) {
        if (state.savedTradeId != null) onTradeAdded()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        NumberField(state.capital, viewModel::onCapitalChange, stringResource(R.string.label_capital))
        OutlinedTextField(
            value = state.symbol,
            onValueChange = viewModel::onSymbolChange,
            label = { Text(stringResource(R.string.label_symbol)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        NumberField(state.buyPrice, viewModel::onBuyPriceChange, stringResource(R.string.label_buy_price))

        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            val options = listOf(StopLossMode.PRICE, StopLossMode.PERCENT)
            options.forEachIndexed { index, mode ->
                SegmentedButton(
                    shape = SegmentedButtonDefaults.itemShape(index = index, count = options.size),
                    selected = state.stopLossMode == mode,
                    onClick = { viewModel.onStopLossModeChange(mode) },
                    label = { Text(if (mode == StopLossMode.PRICE) "價格" else "%") },
                )
            }
        }
        if (state.stopLossMode == StopLossMode.PRICE) {
            NumberField(state.stopLoss, viewModel::onStopLossChange, stringResource(R.string.label_stop_loss))
        } else {
            NumberField(state.stopLossPercent, viewModel::onStopLossPercentChange, stringResource(R.string.label_stop_loss_percent))
        }
        NumberField(state.maxLossPercent, viewModel::onMaxLossPercentChange, stringResource(R.string.label_max_loss_percent))
        NumberField(state.targetPrice, viewModel::onTargetPriceChange, stringResource(R.string.label_target_price))
        NumberField(state.lotSize, viewModel::onLotSizeChange, stringResource(R.string.label_lot_size))

        ResultCard(state)

        Button(
            onClick = viewModel::onAddTrade,
            enabled = state.result is CalculationResult.Success && state.symbol.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) { Text(stringResource(R.string.action_add_trade)) }
    }
}

@Composable
private fun NumberField(value: String, onChange: (String) -> Unit, label: String) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun ResultCard(state: CalculatorUiState) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            when (val r = state.result) {
                is CalculationResult.Incomplete -> Text("輸入完成後顯示結果")
                is CalculationResult.Error -> Text(r.message)
                is CalculationResult.Success -> {
                    val c = r.calculation
                    if (c.lotSize > 1) {
                        Text("手數: ${c.lots} 手 (= ${c.shares} 股, 每手 ${c.lotSize})")
                    } else {
                        Text("股數: ${c.shares}")
                    }
                    Text("所需資金: ${formatMoney(c.requiredCapital, state.displayCurrency.name)}")
                    Text("實際風險: ${formatMoney(c.actualRisk, state.displayCurrency.name)} (${"%.2f".format(c.actualRiskPercent)}%)")
                    Text("資金使用: ${"%.2f".format(c.capitalUsagePercent)}%")
                    c.riskRewardRatio?.let { Text("RR: ${"%.2f".format(it)} · 潛在利潤 ${formatMoney(c.potentialProfit!!, state.displayCurrency.name)}") }
                    if (!c.canAfford) Text("⚠️ 資金不足")
                }
            }
        }
    }
}

private fun formatMoney(amount: Double, currency: String) =
    "$currency ${"%,.2f".format(amount)}"
