'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { tradeMetrics } from '@/lib/finance';
import InfoTip from '@/components/ui/InfoTip';
import { formatCurrency, formatPercent, getSymbolCurrency } from '@/lib/format';
import { pricesAtom } from '@/store/pricesAtom';
import { currencyAtom } from '@/store/currencyAtom';
import { fullPositionPctAtom } from '@/store/fullPositionAtom';
import { capitalAtom } from '@/store/capitalAtom';
import type { Trade } from '@/types/trade';

const TradeChartDialog = dynamic(() => import('@/components/Chart/TradeChartDialog'), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

interface TradeCardProps {
  trade: Trade;
  onUpdateStop: (id: Trade['id'], newStop: number) => void;
  onClose: (id: Trade['id'], exitPrice: number) => void;
  onDelete: (id: Trade['id']) => void;
}

type CardMode = 'view' | 'edit' | 'close';

// ── Card shell ────────────────────────────────────────────────────────────────

const Card = styled.div<{ $isRiskFree: boolean }>`
  border-radius: 12px;
  border: 1px solid ${({ $isRiskFree, theme }) =>
    $isRiskFree ? `${theme.colors.positive}35` : theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  padding: 12px 14px;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ $isRiskFree, theme }) =>
      $isRiskFree ? `${theme.colors.positive}50` : theme.colors.border};
  }
`;

// ── Header ──────────────────────────────────────────────────────────────────

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
  font-size: 17px;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.02em;
`;

const StatusChip = styled.span<{ $riskFree: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 4px;
  background: ${({ $riskFree, theme }) =>
    $riskFree ? `${theme.colors.positive}15` : `${theme.colors.negative}15`};
  color: ${({ $riskFree, theme }) =>
    $riskFree ? theme.colors.positive : theme.colors.negative};
  border: 1px solid ${({ $riskFree, theme }) =>
    $riskFree ? `${theme.colors.positive}25` : `${theme.colors.negative}25`};
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

const CurrentPrice = styled.p`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 17px;
  font-weight: 600;
  line-height: 1;
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const UnrealizedRow = styled.p<{ $positive: boolean }>`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
  margin: 4px 0 0;
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.positive : theme.colors.negative};
`;

const NoQuote = styled.p`
  font-family: monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textFaint};
  margin: 0;
`;

// ── Facts line (entry · shares · allocated · sizing) ────────────────────────────

const FactsLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 10px;
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

// ── Risk strip (stop + R prominent, then SDD/WDD/MDD) ───────────────────────────

const RiskBox = styled.div`
  margin-top: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 9px 11px;
`;

const StopRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const StopInfo = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
`;

const StopLbl = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const StopVal = styled.span`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const RBadge = styled.span<{ $positive: boolean }>`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  color: ${({ $positive, theme }) => ($positive ? theme.colors.positive : theme.colors.negative)};
`;

const RiskGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
`;

const RiskCell = styled.div``;

const RiskCellHead = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 2px;
`;

const RiskCellLabel = styled.p`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
`;

const RiskCellValue = styled.p`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  line-height: 1.45;
`;

// ── Progress bar (→ risk free), slim ────────────────────────────────────────────

const Progress = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-family: monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textFaint};
`;

const ProgTrack = styled.div`
  flex: 1;
  height: 4px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

const ProgFill = styled.div<{ $width: number }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: linear-gradient(to right, #f59e0b, #34d399);
  border-radius: 9999px;
  transition: width 0.3s ease;
`;

// ── Actions ───────────────────────────────────────────────────────────────────

const ActionsRow = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 8px;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' | 'default' }>`
  flex: 1;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  border: 1px solid ${({ $variant, theme }) =>
    $variant === 'primary' ? `${theme.colors.accent}40` : theme.colors.border};
  background: ${({ $variant, theme }) =>
    $variant === 'primary' ? `${theme.colors.accent}10` : `${theme.colors.text}05`};
  color: ${({ $variant, theme }) =>
    $variant === 'primary' ? theme.colors.accent : theme.colors.textMuted};

  &:hover {
    background: ${({ $variant, theme }) =>
      $variant === 'primary' ? `${theme.colors.accent}18` : `${theme.colors.text}0a`};
    color: ${({ $variant, theme }) =>
      $variant === 'primary' ? theme.colors.accent : theme.colors.text};
  }
`;

const IconBtn = styled.button`
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

const InlineForm = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
`;

const InlineInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const ConfirmBtn = styled.button<{ $color: 'amber' | 'green' }>`
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: ${({ $color }) => ($color === 'amber' ? '#f59e0b' : '#10b981')};
  color: #000;
  transition: opacity 0.15s;

  &:hover { opacity: 0.85; }
`;

const CancelBtn = styled.button`
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  transition: color 0.15s;

  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function TradeCard({ trade, onUpdateStop, onClose, onDelete }: TradeCardProps) {
  const t = useTranslations('card');
  const ti = useTranslations('metricsInfo');
  const prices = useAtomValue(pricesAtom);
  const currency = useAtomValue(currencyAtom);
  const fullPositionPct = useAtomValue(fullPositionPctAtom);
  const capital = useAtomValue(capitalAtom);

  // SSR-safe timestamp
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setNow(Date.now()), []);

  const [mode, setMode] = useState<CardMode>('view');
  const [input, setInput] = useState('');
  const [chartOpen, setChartOpen] = useState(false);

  const cur = getSymbolCurrency(trade.symbol);

  const m = tradeMetrics(trade, {
    currentPrice: prices[trade.symbol]?.price ?? null,
    capital: parseFloat(capital) || 0,
    fullPositionPct,
    now,
  });

  const rfProgress = Math.max(
    0,
    Math.min(
      100,
      ((trade.currentStopLoss - trade.initialStopLoss) /
        (trade.entryPrice - trade.initialStopLoss)) *
        100,
    ),
  );

  const handleUpdateStop = () => {
    const val = parseFloat(input);
    if (!isNaN(val)) onUpdateStop(trade.id, val);
    setMode('view');
    setInput('');
  };

  const handleClose = () => {
    const val = parseFloat(input);
    if (!isNaN(val)) onClose(trade.id, val);
    setMode('view');
    setInput('');
  };

  const handleCancel = () => {
    setMode('view');
    setInput('');
  };

  const formatRiskTriple = (x: { r: number; usd: number; pctC: number } | null, cur2: Parameters<typeof formatCurrency>[1]): string => {
    if (x == null) return '—';
    return `${x.r.toFixed(2)}R · ${formatCurrency(x.usd, cur2, currency)} · ${x.pctC.toFixed(2)}%`;
  };

  const unrealizedPnL = m.marketPrice != null
    ? (m.marketPrice - trade.entryPrice) * trade.shares
    : null;

  const stopR = m.sdd.r;

  return (
    <Card $isRiskFree={m.isRiskFree}>
      {/* Header */}
      <Header>
        <HeaderLeft>
          <Symbol>{trade.symbol}</Symbol>
          <StatusChip $riskFree={m.isRiskFree}>
            {m.isRiskFree ? `✅ ${t('status.riskFree')}` : `⚠️ ${t('status.atRisk')}`}
          </StatusChip>
          <DaysLabel>{m.days} {t('days')}</DaysLabel>
        </HeaderLeft>

        <HeaderRight>
          {m.marketPrice != null ? (
            <>
              <CurrentPrice>{formatCurrency(m.marketPrice, cur, currency)}</CurrentPrice>
              <UnrealizedRow $positive={(unrealizedPnL ?? 0) >= 0}>
                {unrealizedPnL != null && (unrealizedPnL >= 0 ? '+' : '')}
                {unrealizedPnL != null ? formatCurrency(unrealizedPnL, cur, currency) : '—'}
                {m.changePct != null && ` · ${formatPercent(m.changePct)}`}
              </UnrealizedRow>
            </>
          ) : (
            <NoQuote>{t('noQuote')}</NoQuote>
          )}
        </HeaderRight>
      </Header>

      {/* Facts: entry · shares · allocated · sizing */}
      <FactsLine>
        <span><FactLbl>{t('entry')}</FactLbl>{formatCurrency(trade.entryPrice, cur, currency)}</span>
        <Sep>·</Sep>
        <span>{trade.shares} {t('shares')}</span>
        <Sep>·</Sep>
        <span><FactLbl>{t('allocated')}</FactLbl>{formatCurrency(m.amtAllocated, cur, currency)} ({m.pctAllocated.toFixed(1)}%)</span>
        <Sep>·</Sep>
        <span>{m.ptnSizing >= 1 ? `${m.ptnSizing.toFixed(2)} FP` : `${m.ptnSizing.toFixed(2)} HP`}</span>
      </FactsLine>

      {/* Risk strip: stop + R prominent, then SDD / WDD / MDD */}
      <RiskBox>
        <StopRow>
          <StopInfo>
            <StopLbl>{t('currentStop')}</StopLbl>
            <StopVal>{formatCurrency(trade.currentStopLoss, cur, currency)}</StopVal>
          </StopInfo>
          <RBadge $positive={stopR >= 0}>
            {stopR >= 0 ? '+' : ''}{stopR.toFixed(2)}R
          </RBadge>
        </StopRow>
        <RiskGrid>
          <RiskCell>
            <RiskCellHead>
              <RiskCellLabel>SDD</RiskCellLabel>
              <InfoTip label="SDD">{ti('sdd')}</InfoTip>
            </RiskCellHead>
            <RiskCellValue>{formatRiskTriple(m.sdd, cur)}</RiskCellValue>
          </RiskCell>
          <RiskCell>
            <RiskCellHead>
              <RiskCellLabel>WDD</RiskCellLabel>
              <InfoTip label="WDD">{ti('wdd')}</InfoTip>
            </RiskCellHead>
            <RiskCellValue>{formatRiskTriple(m.wdd, cur)}</RiskCellValue>
          </RiskCell>
          <RiskCell>
            <RiskCellHead>
              <RiskCellLabel>MDD</RiskCellLabel>
              <InfoTip label="MDD">{ti('mdd')}</InfoTip>
            </RiskCellHead>
            <RiskCellValue>{formatRiskTriple(m.mdd, cur)}</RiskCellValue>
          </RiskCell>
        </RiskGrid>
      </RiskBox>

      {/* → Risk Free progress (only when not yet risk-free) */}
      {!m.isRiskFree && (
        <Progress>
          <span>→ {t('toRiskFree')}</span>
          <ProgTrack><ProgFill $width={rfProgress} /></ProgTrack>
          <span>{rfProgress.toFixed(0)}%</span>
        </Progress>
      )}

      {/* Actions */}
      <ActionsRow>
        {mode === 'edit' ? (
          <InlineForm>
            <InlineInput
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('newStopPlaceholder')}
              step="0.01"
              autoFocus
            />
            <ConfirmBtn $color="amber" onClick={handleUpdateStop}>✓</ConfirmBtn>
            <CancelBtn onClick={handleCancel}>✕</CancelBtn>
          </InlineForm>
        ) : mode === 'close' ? (
          <InlineForm>
            <InlineInput
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('exitPlaceholder')}
              step="0.01"
              autoFocus
            />
            <ConfirmBtn $color="green" onClick={handleClose}>✓</ConfirmBtn>
            <CancelBtn onClick={handleCancel}>✕</CancelBtn>
          </InlineForm>
        ) : (
          <>
            <ActionBtn
              $variant="primary"
              onClick={() => {
                setInput(trade.currentStopLoss.toString());
                setMode('edit');
              }}
            >
              📈 {t('updateStop')}
            </ActionBtn>
            <ActionBtn onClick={() => setMode('close')}>🏁 {t('close')}</ActionBtn>
            <ActionBtn onClick={() => setChartOpen(true)}>{t('chart')}</ActionBtn>
            <IconBtn onClick={() => onDelete(trade.id)} title={t('delete')}>🗑️</IconBtn>
          </>
        )}
      </ActionsRow>

      <TradeChartDialog
        open={chartOpen}
        trade={trade}
        currentPrice={m.marketPrice}
        onClose={() => setChartOpen(false)}
      />
    </Card>
  );
}
