package com.kenneth.stockcalc.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kenneth.stockcalc.domain.model.Currency

@Composable
fun CurrencyChip(
    current: Currency,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AssistChip(
        modifier = modifier.padding(horizontal = 8.dp),
        onClick = onToggle,
        label = { Text(current.name) },
        colors = AssistChipDefaults.assistChipColors(),
    )
}
