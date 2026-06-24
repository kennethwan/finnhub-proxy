'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { tradeMetrics } from '@/lib/finance';
import { formatCurrency, formatPercent, getSymbolCurrency } from '@/lib/format';
import { currencyAtom } from '@/store/currencyAtom';
import { capitalAtom } from '@/store/capitalAtom';
import { fullPositionPctAtom } from '@/store/fullPositionAtom';
import type { Trade } from '@/types/trade';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryCardProps {
  trade: Trade;
  onDelete: (id: Trade['id']) => void;
}

const fmtR = (r: number | null): string => (r == null ? '' : `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`);

// ── Styled components ─────────────────────────────────────────────────────────

const Card = styled.div<{ $win: boolean }>`
  border-radius: 12px;
  border: 1px solid ${({ $win, theme }) =>
    $win ? `${theme.colors.positive}35` : `${theme.colors.negative}35`};
  background: ${({ theme }) => theme.colors.surface};
  padding: 14px;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ $win, theme }) =>
      $win ? `${theme.colors.positive}50` : `${theme.colors.negative}50`};
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const TopLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
`;

const Symbol = styled.span`
  font-family: monospace;
  font-weight: 700;
  font-size: 17px;
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
  letter-spacing: 0.08em;
  padding: 2px 7px;
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

const TopRight = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-shrink: 0;
`;

const PriceBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
`;

const ExitPrice = styled.span`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 17px;
  font-weight: 600;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text};
`;

const RealizedPnL = styled.span<{ $positive: boolean }>`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.positive : theme.colors.negative};
`;

const DeleteBtn = styled.button`
  flex-shrink: 0;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.textFaint};
  transition: color 0.15s, border-color 0.15s, background 0.15s;

  &:hover {
    color: ${({ theme }) => theme.colors.negative};
    border-color: ${({ theme }) => `${theme.colors.negative}40`};
    background: ${({ theme }) => `${theme.colors.negative}10`};
  }
`;

const StatGrid = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 12px;

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Stat = styled.div`
  min-width: 0;
`;

const StatLbl = styled.p`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0 0 3px;
`;

const StatVal = styled.p`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StatSub = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
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
      <TopRow>
        <TopLeft>
          <Symbol>{trade.symbol}</Symbol>
          <WinLossChip $win={isWin}>{isWin ? th('win') : th('loss')}</WinLossChip>
          <DaysLabel>{m.days} {t('days')}</DaysLabel>
        </TopLeft>

        <TopRight>
          <PriceBlock>
            <ExitPrice>{formatCurrency(trade.exitPrice ?? 0, cur, currency)}</ExitPrice>
            <RealizedPnL $positive={isWin}>
              {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, cur, currency)}
              {m.changePct != null && ` · ${formatPercent(m.changePct)}`}
              {m.r != null && ` · ${fmtR(m.r)}`}
            </RealizedPnL>
          </PriceBlock>
          <DeleteBtn onClick={() => onDelete(trade.id)} title={t('delete')} aria-label={t('delete')}>🗑️</DeleteBtn>
        </TopRight>
      </TopRow>

      <StatGrid>
        <Stat>
          <StatLbl>{t('entry')}</StatLbl>
          <StatVal>{formatCurrency(trade.entryPrice, cur, currency)}</StatVal>
        </Stat>
        <Stat>
          <StatLbl>{th('exit')}</StatLbl>
          <StatVal>{formatCurrency(trade.exitPrice ?? 0, cur, currency)}</StatVal>
        </Stat>
        <Stat>
          <StatLbl>{t('shares')}</StatLbl>
          <StatVal>{trade.shares}</StatVal>
        </Stat>
        <Stat>
          <StatLbl>{t('allocated')}</StatLbl>
          <StatVal>
            {formatCurrency(amtAllocated, cur, currency)}<StatSub> · {pctAllocated.toFixed(1)}%</StatSub>
          </StatVal>
        </Stat>
      </StatGrid>
    </Card>
  );
}
