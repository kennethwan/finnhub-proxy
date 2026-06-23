'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { tradeMetrics } from '@/lib/finance';
import { formatCurrency, getSymbolCurrency } from '@/lib/format';
import { currencyAtom } from '@/store/currencyAtom';
import { capitalAtom } from '@/store/capitalAtom';
import { fullPositionPctAtom } from '@/store/fullPositionAtom';
import type { Trade } from '@/types/trade';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryCardProps {
  trade: Trade;
  onDelete: (id: Trade['id']) => void;
}

// ── Styled Components ─────────────────────────────────────────────────────────

const Card = styled.div<{ $win: boolean }>`
  border-radius: 12px;
  border: 1px solid ${({ $win, theme }) =>
    $win ? `${theme.colors.positive}35` : `${theme.colors.negative}35`};
  background: ${({ theme }) => theme.colors.surface};
  padding: 16px;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ $win, theme }) =>
      $win ? `${theme.colors.positive}50` : `${theme.colors.negative}50`};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
`;

const Symbol = styled.span`
  font-family: monospace;
  font-weight: 700;
  font-size: 18px;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.02em;
`;

const WinLossChip = styled.span<{ $win: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${({ $win, theme }) =>
    $win ? `${theme.colors.positive}15` : `${theme.colors.negative}15`};
  color: ${({ $win, theme }) =>
    $win ? theme.colors.positive : theme.colors.negative};
  border: 1px solid ${({ $win, theme }) =>
    $win ? `${theme.colors.positive}25` : `${theme.colors.negative}25`};
`;

const DaysLabel = styled.span`
  font-size: 11px;
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.textFaint};
`;

const HeaderRight = styled.div`
  text-align: right;
  flex-shrink: 0;
`;

const ExitPrice = styled.p`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const RealizedPnL = styled.p<{ $positive: boolean }>`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  margin: 4px 0 0;
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.positive : theme.colors.negative};
`;

// ── Metrics grid ──────────────────────────────────────────────────────────────

const MetricsGrid = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.border};
`;

const MetricCell = styled.div`
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.surface};
`;

const MetricLabel = styled.p`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
`;

const MetricValue = styled.p`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 500;
  margin: 3px 0 0;
  color: ${({ theme }) => theme.colors.text};
`;

// ── Actions ───────────────────────────────────────────────────────────────────

const ActionsRow = styled.div`
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const IconBtn = styled.button`
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.textFaint};

  &:hover {
    color: ${({ theme }) => theme.colors.negative};
    border-color: ${({ theme }) => `${theme.colors.negative}40`};
    background: ${({ theme }) => `${theme.colors.negative}10`};
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function HistoryCard({ trade, onDelete }: HistoryCardProps) {
  const t = useTranslations('card');
  const th = useTranslations('history');
  const currency = useAtomValue(currencyAtom);
  const capital = useAtomValue(capitalAtom);
  const fullPositionPct = useAtomValue(fullPositionPctAtom);

  // SSR-safe timestamp
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setNow(Date.now()), []);

  const cur = getSymbolCurrency(trade.symbol);
  const pnl = trade.pnl ?? 0;
  const isWin = pnl >= 0;

  const m = tradeMetrics(trade, {
    currentPrice: null,
    capital: parseFloat(capital) || 0,
    fullPositionPct,
    now,
  });

  const amtAllocated = trade.shares * trade.entryPrice;
  const parsedCapital = parseFloat(capital) || 1;
  const pctAllocated = (amtAllocated / parsedCapital) * 100;

  return (
    <Card $win={isWin}>
      {/* Header */}
      <Header>
        <HeaderLeft>
          <Symbol>{trade.symbol}</Symbol>
          <WinLossChip $win={isWin}>
            {isWin ? th('win') : th('loss')}
          </WinLossChip>
          <DaysLabel>{m.days} {t('days')}</DaysLabel>
        </HeaderLeft>

        <HeaderRight>
          <ExitPrice>
            {formatCurrency(trade.exitPrice ?? 0, cur, currency)}
          </ExitPrice>
          <RealizedPnL $positive={isWin}>
            {pnl >= 0 ? '+' : ''}
            {formatCurrency(pnl, cur, currency)}
          </RealizedPnL>
        </HeaderRight>
      </Header>

      {/* Metrics grid — 3×2 */}
      <MetricsGrid>
        <MetricCell>
          <MetricLabel>{t('entry')}</MetricLabel>
          <MetricValue>{formatCurrency(trade.entryPrice, cur, currency)}</MetricValue>
        </MetricCell>
        <MetricCell>
          <MetricLabel>{th('exit')}</MetricLabel>
          <MetricValue>{formatCurrency(trade.exitPrice ?? 0, cur, currency)}</MetricValue>
        </MetricCell>
        <MetricCell>
          <MetricLabel>{t('shares')}</MetricLabel>
          <MetricValue>{trade.shares}</MetricValue>
        </MetricCell>
        <MetricCell>
          <MetricLabel>{t('currentStop')}</MetricLabel>
          <MetricValue>{formatCurrency(trade.initialStopLoss, cur, currency)}</MetricValue>
        </MetricCell>
        <MetricCell>
          <MetricLabel>{t('allocated')}</MetricLabel>
          <MetricValue>{formatCurrency(amtAllocated, cur, currency)}</MetricValue>
        </MetricCell>
        <MetricCell>
          <MetricLabel>%C</MetricLabel>
          <MetricValue>{pctAllocated.toFixed(1)}%</MetricValue>
        </MetricCell>
      </MetricsGrid>

      {/* Actions */}
      <ActionsRow>
        <IconBtn onClick={() => onDelete(trade.id)} title={t('delete')}>
          🗑️
        </IconBtn>
      </ActionsRow>
    </Card>
  );
}
