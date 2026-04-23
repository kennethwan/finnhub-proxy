package com.kenneth.stockcalc.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.kenneth.stockcalc.ui.theme.AmberRiskFree
import com.kenneth.stockcalc.ui.theme.Slate950

@Composable
fun RiskFreeBadge(modifier: Modifier = Modifier) {
    Text(
        text = "✅ Risk Free",
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(AmberRiskFree)
            .padding(horizontal = 8.dp, vertical = 2.dp),
        color = Slate950,
    )
}
