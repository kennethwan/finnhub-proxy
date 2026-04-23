package com.kenneth.stockcalc.ui.trades

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue

@Composable
fun UpdateStopLossDialog(
    tradeSymbol: String,
    onConfirm: (Double) -> Unit,
    onDismiss: () -> Unit,
) {
    var input by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("推高止損 · $tradeSymbol") },
        text = {
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                label = { Text("新止損價") },
                singleLine = true,
            )
        },
        confirmButton = {
            TextButton(onClick = {
                input.toDoubleOrNull()?.let { onConfirm(it) }
            }) { Text("確認") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } },
    )
}
