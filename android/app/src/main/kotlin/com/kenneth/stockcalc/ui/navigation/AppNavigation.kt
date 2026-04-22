package com.kenneth.stockcalc.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController

sealed class Tab(val route: String, val labelRes: Int, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    data object Calculator : Tab("calculator", com.kenneth.stockcalc.R.string.tab_calculator, Icons.Default.Calculate)
    data object Trades : Tab("trades", com.kenneth.stockcalc.R.string.tab_trades, Icons.Default.ShowChart)
    data object History : Tab("history", com.kenneth.stockcalc.R.string.tab_history, Icons.Default.History)
}

@Composable
fun AppNavigation() {
    val nav = rememberNavController()
    val tabs = listOf(Tab.Calculator, Tab.Trades, Tab.History)
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = backStack?.destination?.hierarchy?.any { it.route == tab.route } == true,
                        onClick = {
                            if (currentRoute != tab.route) {
                                nav.navigate(tab.route) {
                                    popUpTo(nav.graph.startDestinationId) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(androidx.compose.ui.res.stringResource(tab.labelRes)) },
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = Tab.Calculator.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(Tab.Calculator.route) {
                com.kenneth.stockcalc.ui.calculator.CalculatorScreen(
                    onTradeAdded = {
                        nav.navigate(Tab.Trades.route) {
                            popUpTo(nav.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
            composable(Tab.Trades.route) { Text("Trades placeholder") }
            composable(Tab.History.route) { Text("History placeholder") }
        }
    }
}
