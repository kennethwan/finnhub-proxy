import type { Trade } from '@/types/trade';

export interface TradesRepository {
  load(): Promise<Trade[]>;
  add(trade: Trade): Promise<Trade>;     // returns the stored trade (id may change)
  update(trade: Trade): Promise<void>;
  remove(id: Trade['id']): Promise<void>;
}
