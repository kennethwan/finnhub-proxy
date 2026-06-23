import type { Trade } from '@/types/trade';
import type { TradesRepository } from './repository';

const KEY = 'stock-trades-v3';

export class LocalTradesRepository implements TradesRepository {
  private read(): Trade[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Trade[]) : [];
  }
  private write(trades: Trade[]): void {
    localStorage.setItem(KEY, JSON.stringify(trades));
  }
  async load(): Promise<Trade[]> {
    return this.read();
  }
  async add(trade: Trade): Promise<Trade> {
    this.write([trade, ...this.read()]);
    return trade;
  }
  async update(trade: Trade): Promise<void> {
    this.write(this.read().map((t) => (t.id === trade.id ? trade : t)));
  }
  async remove(id: Trade['id']): Promise<void> {
    this.write(this.read().filter((t) => t.id !== id));
  }
}
