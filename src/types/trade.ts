export type TradeStatus = 'open' | 'closed';
export type Currency = 'USD' | 'HKD';

export interface StopLossEntry {
  price: number;
  date: string;
  note: string;
}

export interface Trade {
  id: string | number;
  symbol: string;
  entryPrice: number;
  shares: number;
  initialStopLoss: number;
  currentStopLoss: number;
  targetPrice: number | null;
  status: TradeStatus;
  riskAmount: number;
  createdAt: string;
  stopLossHistory: StopLossEntry[];
  exitPrice?: number | null;
  pnl?: number | null;
  closedAt?: string | null;
}

export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}
