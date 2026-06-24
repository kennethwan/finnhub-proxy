'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { useAtomValue } from 'jotai';
import { ChevronDown } from 'lucide-react';
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

const fmtR = (r: number | null): string => (r == null ? '' : `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`);

// ── Card shell ────────────────────────────────────────────────────────────────

const Card = styled.div<{ $isRiskFree: boolean }>`
  border-radius: 12px;
  border: 1px solid ${({ $isRiskFree, theme }) =>
    $isRiskFree ? `${theme.colors.positive}35` : theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ $isRiskFree, theme }) =>
      $isRiskFree ? `${theme.colors.positive}50` : theme.colors.border};
  }
`;

// ── Collapsed header (always visible) ──────────────────────────────────────────

const HeaderBtn = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: inherit;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
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

const StopLine = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text};
`;

const StopLbl = styled.span`
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

const CurrentPrice = styled.span`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 17px;
  font-weight: 600;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text};
`;

const PLLine = styled.span<{ $positive: boolean }>`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.positive : theme.colors.negative};
`;

const NoQuote = styled.span`
  font-family: monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textFaint};
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

const RiskGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.border};
`;

const RiskCell = styled.div`
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

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

const ActionsRow = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 8px;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'default' }>`
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

  const [expanded, setExpanded] = useState(false);
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

  return (
    <Card $isRiskFree={m.isRiskFree}>
      {/* Collapsed header — always shows price, P/L (with R), current stop + facts */}
      <HeaderBtn type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <TopRow>
          <HLeft>
            <TopLine>
              <Symbol>{trade.symbol}</Symbol>
              <StatusChip $riskFree={m.isRiskFree}>
                {m.isRiskFree ? `✅ ${t('status.riskFree')}` : `⚠️ ${t('status.atRisk')}`}
              </StatusChip>
              <DaysLabel>{m.days} {t('days')}</DaysLabel>
            </TopLine>
            <StopLine>
              <StopLbl>{t('currentStop')}</StopLbl>
              {formatCurrency(trade.currentStopLoss, cur, currency)}
            </StopLine>
          </HLeft>

          <HRight>
            {m.marketPrice != null ? (
              <>
                <CurrentPrice>{formatCurrency(m.marketPrice, cur, currency)}</CurrentPrice>
                <PLLine $positive={(unrealizedPnL ?? 0) >= 0}>
                  {unrealizedPnL != null && (unrealizedPnL >= 0 ? '+' : '')}
                  {unrealizedPnL != null ? formatCurrency(unrealizedPnL, cur, currency) : '—'}
                  {m.changePct != null && ` · ${formatPercent(m.changePct)}`}
                  {m.r != null && ` · ${fmtR(m.r)}`}
                </PLLine>
              </>
            ) : (
              <NoQuote>{t('noQuote')}</NoQuote>
            )}
          </HRight>

          <Chevron $open={expanded}><ChevronDown size={18} /></Chevron>
        </TopRow>

        <FactsLine>
          <span><FactLbl>{t('entry')}</FactLbl>{formatCurrency(trade.entryPrice, cur, currency)}</span>
          <Sep>·</Sep>
          <span>{trade.shares} {t('shares')}</span>
          <Sep>·</Sep>
          <span><FactLbl>{t('allocated')}</FactLbl>{formatCurrency(m.amtAllocated, cur, currency)} ({m.pctAllocated.toFixed(1)}%)</span>
        </FactsLine>
      </HeaderBtn>

      {/* Expanded detail */}
      {expanded && (
        <Detail>
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

          {!m.isRiskFree && (
            <Progress>
              <span>→ {t('toRiskFree')}</span>
              <ProgTrack><ProgFill $width={rfProgress} /></ProgTrack>
              <span>{rfProgress.toFixed(0)}%</span>
            </Progress>
          )}

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
        </Detail>
      )}

      <TradeChartDialog
        open={chartOpen}
        trade={trade}
        currentPrice={m.marketPrice}
        onClose={() => setChartOpen(false)}
      />
    </Card>
  );
}
