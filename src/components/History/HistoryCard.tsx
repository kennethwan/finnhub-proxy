'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAtomValue } from 'jotai';
import { ChevronDown } from 'lucide-react';
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

// ── Card shell ────────────────────────────────────────────────────────────────

const Card = styled.div<{ $win: boolean }>`
  border-radius: 12px;
  border: 1px solid ${({ $win, theme }) =>
    $win ? `${theme.colors.positive}35` : `${theme.colors.negative}35`};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ $win, theme }) =>
      $win ? `${theme.colors.positive}50` : `${theme.colors.negative}50`};
  }
`;

const HeaderBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: inherit;
`;

const HLeft = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const TopLine = styled.div`
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

const EntryLine = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text};
`;

const SmallLbl = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const HRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
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

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.textFaint};
  transition: transform 0.2s;
  transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);
`;

// ── Expanded detail ─────────────────────────────────────────────────────────

const Detail = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const FactsLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text};
`;

const FactLbl = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  margin-right: 4px;
`;

const Sep = styled.span`
  color: ${({ theme }) => theme.colors.textFaint};
  margin: 0 8px;
`;

const IconBtn = styled.button`
  flex-shrink: 0;
  padding: 7px 10px;
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

  const [expanded, setExpanded] = useState(false);

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
      {/* Collapsed header — symbol, result, exit price, realized P/L (with R) */}
      <HeaderBtn type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <HLeft>
          <TopLine>
            <Symbol>{trade.symbol}</Symbol>
            <WinLossChip $win={isWin}>{isWin ? th('win') : th('loss')}</WinLossChip>
            <DaysLabel>{m.days} {t('days')}</DaysLabel>
          </TopLine>
          <EntryLine>
            <SmallLbl>{t('entry')}</SmallLbl>
            {formatCurrency(trade.entryPrice, cur, currency)}
          </EntryLine>
        </HLeft>

        <HRight>
          <ExitPrice>{formatCurrency(trade.exitPrice ?? 0, cur, currency)}</ExitPrice>
          <RealizedPnL $positive={isWin}>
            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, cur, currency)}
            {m.changePct != null && ` · ${formatPercent(m.changePct)}`}
            {m.r != null && ` · ${fmtR(m.r)}`}
          </RealizedPnL>
        </HRight>

        <Chevron $open={expanded}><ChevronDown size={18} /></Chevron>
      </HeaderBtn>

      {/* Expanded detail */}
      {expanded && (
        <Detail>
          <FactsLine>
            <span><FactLbl>{th('exit')}</FactLbl>{formatCurrency(trade.exitPrice ?? 0, cur, currency)}</span>
            <Sep>·</Sep>
            <span>{trade.shares} {t('shares')}</span>
            <Sep>·</Sep>
            <span><FactLbl>{t('allocated')}</FactLbl>{formatCurrency(amtAllocated, cur, currency)} ({pctAllocated.toFixed(1)}%)</span>
            <Sep>·</Sep>
            <span><FactLbl>{t('currentStop')}</FactLbl>{formatCurrency(trade.initialStopLoss, cur, currency)}</span>
          </FactsLine>
          <IconBtn onClick={() => onDelete(trade.id)} title={t('delete')}>🗑️</IconBtn>
        </Detail>
      )}
    </Card>
  );
}
