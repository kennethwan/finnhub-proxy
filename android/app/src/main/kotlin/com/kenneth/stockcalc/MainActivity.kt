package com.kenneth.stockcalc

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.kenneth.stockcalc.ui.navigation.AppNavigation
import com.kenneth.stockcalc.ui.theme.StockCalcTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            StockCalcTheme { AppNavigation() }
        }
    }
}
