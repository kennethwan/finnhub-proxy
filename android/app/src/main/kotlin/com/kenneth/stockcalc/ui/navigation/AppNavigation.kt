package com.kenneth.stockcalc.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.kenneth.stockcalc.R
import com.kenneth.stockcalc.ui.auth.AuthBottomSheet
import com.kenneth.stockcalc.ui.auth.AuthViewModel
import com.kenneth.stockcalc.ui.calculator.CalculatorScreen
import com.kenneth.stockcalc.ui.common.PreferencesViewModel
import com.kenneth.stockcalc.ui.components.CurrencyChip
import com.kenneth.stockcalc.ui.history.HistoryScreen
import com.kenneth.stockcalc.ui.trades.TradesScreen

sealed class Tab(val route: String, val labelRes: Int, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    data object Calculator : Tab("calculator", R.string.tab_calculator, Icons.Default.Calculate)
    data object Trades : Tab("trades", R.string.tab_trades, Icons.Default.ShowChart)
    data object History : Tab("history", R.string.tab_history, Icons.Default.History)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavigation() {
    val nav = rememberNavController()
    val tabs = listOf(Tab.Calculator, Tab.Trades, Tab.History)
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    val authVm: AuthViewModel = hiltViewModel()
    val user by authVm.currentUser.collectAsStateWithLifecycle()

    val prefsVm: PreferencesViewModel = hiltViewModel()
    val displayCurrency by prefsVm.displayCurrency.collectAsStateWithLifecycle()

    var showAuth by rememberSaveable { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.app_name)) },
                actions = {
                    CurrencyChip(current = displayCurrency, onToggle = { prefsVm.toggle() })
                    if (user != null) {
                        TextButton(onClick = { authVm.signOut() }) { Text("登出") }
                    } else {
                        TextButton(onClick = { showAuth = true }) { Text("登入") }
                    }
                },
            )
        },
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
                        label = { Text(stringResource(tab.labelRes)) },
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
                CalculatorScreen(
                    onTradeAdded = {
                        nav.navigate(Tab.Trades.route) {
                            popUpTo(nav.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
            composable(Tab.Trades.route) { TradesScreen() }
            composable(Tab.History.route) { HistoryScreen() }
        }
        if (showAuth) {
            AuthBottomSheet(onDismiss = { showAuth = false })
        }
    }
}
