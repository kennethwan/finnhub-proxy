package com.kenneth.stockcalc.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColors = darkColorScheme(
    primary = EmeraldAccent,
    onPrimary = Slate950,
    background = Slate950,
    onBackground = Slate200,
    surface = Slate800,
    onSurface = Slate200,
    surfaceVariant = Slate700,
    onSurfaceVariant = Slate400,
    error = RoseLoss,
    onError = Slate950,
)

@Composable
fun StockCalcTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = DarkColors, typography = AppTypography, content = content)
}
