package com.kenneth.stockcalc.domain.usecase

import com.kenneth.stockcalc.domain.model.Calculation
import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.Currency
import javax.inject.Inject
import kotlin.math.floor

class CalculatePositionUseCase @Inject constructor() {
    operator fun invoke(
        capital: Double?,
        displayCurrency: Currency,
        symbol: String,
        buyPrice: Double?,
        stopLoss: Double?,
        maxLossPercent: Double?,
        targetPrice: Double?,
        lotSize: Int = 1,
    ): CalculationResult {
        if (capital == null || buyPrice == null || stopLoss == null || maxLossPercent == null) {
            return CalculationResult.Incomplete
        }
        if (stopLoss >= buyPrice) {
            return CalculationResult.Error(Calculation.INVALID_STOP_LOSS)
        }

        val effectiveLotSize = lotSize.coerceAtLeast(1)
        val nativeCurrency = Currency.fromSymbol(symbol)
        val riskPerShare = buyPrice - stopLoss
        val maxLossDisplay = capital * maxLossPercent / 100.0
        val maxLossNative = Currency.convert(maxLossDisplay, displayCurrency, nativeCurrency)
        val rawShares = floor(maxLossNative / riskPerShare).toInt().coerceAtLeast(0)
        val lots = rawShares / effectiveLotSize
        val shares = lots * effectiveLotSize

        val requiredCapitalNative = shares * buyPrice
        val requiredCapitalDisplay = Currency.convert(requiredCapitalNative, nativeCurrency, displayCurrency)
        val actualRiskNative = shares * riskPerShare
        val actualRiskDisplay = Currency.convert(actualRiskNative, nativeCurrency, displayCurrency)
        val actualRiskPercent = if (capital > 0) actualRiskDisplay / capital * 100.0 else 0.0
        val capitalUsagePercent = if (capital > 0) requiredCapitalDisplay / capital * 100.0 else 0.0
        val stopLossPercentage = riskPerShare / buyPrice * 100.0

        var rr: Double? = null
        var potentialProfit: Double? = null
        var targetGain: Double? = null
        if (targetPrice != null && targetPrice > buyPrice) {
            val profitPerShare = targetPrice - buyPrice
            rr = profitPerShare / riskPerShare
            val profitNative = shares * profitPerShare
            potentialProfit = Currency.convert(profitNative, nativeCurrency, displayCurrency)
            targetGain = profitPerShare / buyPrice * 100.0
        }

        return CalculationResult.Success(
            Calculation(
                shares = shares,
                lots = lots,
                lotSize = effectiveLotSize,
                riskPerShare = riskPerShare,
                stopLossPercentage = stopLossPercentage,
                maxLossAmount = maxLossDisplay,
                requiredCapital = requiredCapitalDisplay,
                actualRisk = actualRiskDisplay,
                actualRiskPercent = actualRiskPercent,
                capitalUsagePercent = capitalUsagePercent,
                canAfford = requiredCapitalDisplay <= capital,
                actualStopLoss = stopLoss,
                riskRewardRatio = rr,
                potentialProfit = potentialProfit,
                targetGainPercent = targetGain,
            )
        )
    }
}
