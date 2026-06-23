import type { Trade, TradeDto } from '@/types/trade';

export function dtoToTrade(dto: TradeDto): Trade {
  return {
    id: dto.id,
    symbol: dto.symbol,
    entryPrice: dto.entry_price,
    shares: dto.shares,
    initialStopLoss: dto.initial_stop_loss,
    currentStopLoss: dto.current_stop_loss,
    targetPrice: dto.target_price,
    status: dto.status,
    riskAmount: dto.risk_amount,
    createdAt: dto.created_at,
    stopLossHistory: dto.stop_loss_history ?? [],
    exitPrice: dto.exit_price,
    pnl: dto.pnl,
    closedAt: dto.closed_at,
  };
}

export function tradeToDbRow(trade: Trade, userId: string) {
  return {
    user_id: userId,
    symbol: trade.symbol,
    entry_price: trade.entryPrice,
    shares: trade.shares,
    initial_stop_loss: trade.initialStopLoss,
    current_stop_loss: trade.currentStopLoss,
    target_price: trade.targetPrice,
    status: trade.status,
    risk_amount: trade.riskAmount,
    stop_loss_history: trade.stopLossHistory,
    exit_price: trade.exitPrice ?? null,
    pnl: trade.pnl ?? null,
    closed_at: trade.closedAt ?? null,
  };
}
