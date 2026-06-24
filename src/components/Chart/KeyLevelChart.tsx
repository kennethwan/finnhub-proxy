'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import CandleChart, { type PriceLine } from '@/components/Chart/CandleChart';
import { useCandles } from '@/hooks/useCandles';
import { detectKeyLevels, suggestStop, suggestTarget, rLevels } from '@/lib/keyLevels';

// ─── Styled Components ───────────────────────────────────────────────────────

const StateText = styled.div<{ $height: number }>`
  display: flex; align-items: center; justify-content: center;
  height: ${({ $height }) => $height}px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 14px;
`;

const ChipsSection = styled.div`
  margin-top: 14px;
`;

const ChipsLabel = styled.div`
  font-size: 12px; color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 6px;
`;

const ChipsRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px;
`;

const Chip = styled.button<{ $variant: 'support' | 'resistance' }>`
  padding: 4px 10px; border-radius: 20px; font-size: 12px; cursor: pointer; font-weight: 500;
  border: 1px solid ${({ $variant, theme }) =>
    $variant === 'support' ? theme.colors.positive : theme.colors.negative};
  color: ${({ $variant, theme }) =>
    $variant === 'support' ? theme.colors.positive : theme.colors.negative};
  background: transparent;
  &:hover { opacity: 0.8; }
  &:active { opacity: 0.6; }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Everything a key-level chart needs from a position-sizing context. */
export interface ChartContext {
  symbol: string;
  buyPrice: number | null;
  stop: number | null;
  target: number | null;
  onPickStop: (price: number) => void;
  onPickTarget: (price: number) => void;
}

interface KeyLevelChartProps extends ChartContext {
  height?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Reusable candlestick chart (our own /api/candles data via lightweight-charts)
 * with auto-detected support/resistance key levels, buy/stop/target + 1R/2R/3R
 * overlay lines, and tap-to-pick chips. Used inline (sizer workspace) and in the
 * modal StopTargetChartDialog.
 */
export default function KeyLevelChart({
  symbol,
  buyPrice,
  stop,
  target,
  onPickStop,
  onPickTarget,
  height = 300,
}: KeyLevelChartProps) {
  const t = useTranslations('chart');
  const trimmed = symbol.trim();
  const { candles, loading, error } = useCandles(trimmed ? symbol : null);

  const { supports, resistances } = useMemo(() => detectKeyLevels(candles), [candles]);

  const rl = buyPrice != null && stop != null ? rLevels(buyPrice, stop) : null;

  const lines = useMemo((): PriceLine[] => {
    const result: PriceLine[] = [];
    if (buyPrice != null) result.push({ price: buyPrice, color: '#34d399', title: t('buy'), lineStyle: 1 });
    if (stop != null) result.push({ price: stop, color: '#f87171', title: t('stop'), lineStyle: 0 });
    if (target != null) result.push({ price: target, color: '#fbbf24', title: t('target'), lineStyle: 0 });
    for (const s of supports) result.push({ price: s.price, color: '#34d399', title: 'S', lineStyle: 2 });
    for (const r of resistances) result.push({ price: r.price, color: '#f87171', title: 'R', lineStyle: 2 });
    if (rl) {
      result.push({ price: rl.r1, color: '#fbbf24', title: '1R', lineStyle: 1 });
      result.push({ price: rl.r2, color: '#fbbf24', title: '2R', lineStyle: 1 });
      result.push({ price: rl.r3, color: '#fbbf24', title: '3R', lineStyle: 1 });
    }
    return result;
  }, [buyPrice, stop, target, supports, resistances, rl, t]);

  let body: React.ReactNode;
  if (!trimmed) body = <StateText $height={height}>{t('enterSymbol')}</StateText>;
  else if (loading) body = <StateText $height={height}>{t('loading')}</StateText>;
  else if (error) body = <StateText $height={height}>{t('loadError')}</StateText>;
  else if (candles.length === 0) body = <StateText $height={height}>{t('noData')}</StateText>;
  else body = <CandleChart candles={candles} lines={lines} onPriceClick={onPickStop} height={height} />;

  return (
    <div>
      {body}

      {supports.length > 0 && (
        <ChipsSection>
          <ChipsLabel>{t('supports')}</ChipsLabel>
          <ChipsRow>
            {supports.map((s) => (
              <Chip key={s.price} $variant="support" onClick={() => onPickStop(suggestStop(s.price))}>
                {s.price.toFixed(2)}
              </Chip>
            ))}
          </ChipsRow>
        </ChipsSection>
      )}

      {resistances.length > 0 && (
        <ChipsSection>
          <ChipsLabel>{t('resistances')}</ChipsLabel>
          <ChipsRow>
            {resistances.map((r) => (
              <Chip key={r.price} $variant="resistance" onClick={() => onPickTarget(suggestTarget(r.price))}>
                {r.price.toFixed(2)}
              </Chip>
            ))}
          </ChipsRow>
        </ChipsSection>
      )}
    </div>
  );
}
