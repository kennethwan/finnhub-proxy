import { describe, it, expect } from 'vitest';
import { dtoToTrade, tradeToDbRow } from './tradeMapper';
import type { TradeDto, Trade } from '@/types/trade';

const dto: TradeDto = {
  id: 'abc', user_id: 'u1', symbol: 'AAPL', entry_price: 150, shares: 128,
  initial_stop_loss: 145, current_stop_loss: 145, target_price: 165, status: 'open',
  risk_amount: 640, stop_loss_history: [{ price: 145, date: '2026-06-10T00:00:00Z', note: '初始止損' }],
  exit_price: null, pnl: null, closed_at: null, created_at: '2026-06-10T00:00:00Z',
};

describe('dtoToTrade', () => {
  it('maps snake_case columns to camelCase domain fields', () => {
    const t = dtoToTrade(dto);
    expect(t).toMatchObject({
      id: 'abc', symbol: 'AAPL', entryPrice: 150, shares: 128, initialStopLoss: 145,
      currentStopLoss: 145, targetPrice: 165, status: 'open', riskAmount: 640,
      createdAt: '2026-06-10T00:00:00Z', exitPrice: null, pnl: null, closedAt: null,
    });
    expect(t.stopLossHistory).toEqual(dto.stop_loss_history);
  });
  it('defaults null stop_loss_history to []', () => {
    expect(dtoToTrade({ ...dto, stop_loss_history: null }).stopLossHistory).toEqual([]);
  });
});

describe('tradeToDbRow', () => {
  it('maps domain fields to DB columns with user_id and null-coalesced money', () => {
    const trade: Trade = dtoToTrade(dto);
    const row = tradeToDbRow(trade, 'u1');
    expect(row).toMatchObject({
      user_id: 'u1', symbol: 'AAPL', entry_price: 150, shares: 128, initial_stop_loss: 145,
      current_stop_loss: 145, target_price: 165, status: 'open', risk_amount: 640,
      exit_price: null, pnl: null, closed_at: null,
    });
    expect(row.stop_loss_history).toEqual(trade.stopLossHistory);
    expect('id' in row).toBe(false);
    expect('created_at' in row).toBe(false);
  });
});
