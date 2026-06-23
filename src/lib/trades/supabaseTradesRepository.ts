import { supabase } from '@/lib/supabaseClient';
import type { Trade, TradeDto } from '@/types/trade';
import type { TradesRepository } from './repository';
import { dtoToTrade, tradeToDbRow } from './tradeMapper';

export class SupabaseTradesRepository implements TradesRepository {
  constructor(private readonly userId: string) {}

  async load(): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as TradeDto[]).map(dtoToTrade);
  }

  async add(trade: Trade): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .insert(tradeToDbRow(trade, this.userId))
      .select()
      .single();
    if (error) throw error;
    return { ...trade, id: (data as TradeDto).id };
  }

  async update(trade: Trade): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .update({
        current_stop_loss: trade.currentStopLoss,
        stop_loss_history: trade.stopLossHistory,
        status: trade.status,
        exit_price: trade.exitPrice ?? null,
        pnl: trade.pnl ?? null,
        closed_at: trade.closedAt ?? null,
      })
      .eq('id', trade.id)
      .eq('user_id', this.userId);
    if (error) throw error;
  }

  async remove(id: Trade['id']): Promise<void> {
    const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', this.userId);
    if (error) throw error;
  }
}
