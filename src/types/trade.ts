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

export interface TradeDto {
  id: string | number;
  user_id?: string;
  symbol: string;
  entry_price: number;
  shares: number;
  initial_stop_loss: number;
  current_stop_loss: number;
  target_price: number | null;
  status: TradeStatus;
  risk_amount: number;
  stop_loss_history: StopLossEntry[] | null;
  exit_price: number | null;
  pnl: number | null;
  closed_at: string | null;
  created_at: string;
}

export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}
