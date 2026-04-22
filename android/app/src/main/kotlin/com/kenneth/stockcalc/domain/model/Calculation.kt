package com.kenneth.stockcalc.domain.model

data class Calculation(
    val shares: Int,
    val riskPerShare: Double,
    val stopLossPercentage: Double,
    val maxLossAmount: Double,
    val requiredCapital: Double,
    val actualRisk: Double,
    val actualRiskPercent: Double,
    val capitalUsagePercent: Double,
    val canAfford: Boolean,
    val actualStopLoss: Double,
    val riskRewardRatio: Double?,
    val potentialProfit: Double?,
    val targetGainPercent: Double?,
) {
    companion object {
        val INVALID_STOP_LOSS: String = "止損價必須低於買入價"
    }
}

sealed interface CalculationResult {
    data class Success(val calculation: Calculation) : CalculationResult
    data class Error(val message: String) : CalculationResult
    data object Incomplete : CalculationResult
}
