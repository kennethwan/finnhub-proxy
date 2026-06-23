'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import CandleChart, { type PriceLine } from '@/components/Chart/CandleChart';
import { useCandles } from '@/hooks/useCandles';
import { formatCurrency, getSymbolCurrency } from '@/lib/format';
import { currencyAtom } from '@/store/currencyAtom';
import type { Trade } from '@/types/trade';

// ─── Styled Components ───────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center;
  background: rgba(0,0,0,0.75); padding: 0;

  @media (min-width: 480px) {
    align-items: center;
    padding: 16px;
  }
`;

const Card = styled.div`
  width: 100%; max-width: 640px; border-radius: 12px 12px 0 0; padding: 20px 16px 24px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  max-height: 92dvh;
  overflow-y: auto;

  @media (min-width: 480px) {
    border-radius: 12px;
    padding: 24px;
  }
`;

const TitleRow = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;
`;

const Title = styled.strong`
  font-size: 16px;
`;

const CloseBtn = styled.button`
  background: none; border: none; cursor: pointer; color: inherit; font-size: 18px; line-height: 1;
  padding: 4px 6px; border-radius: 4px;
  &:hover { opacity: 0.7; }
`;

const SubTitle = styled.div`
  font-size: 13px; color: ${({ theme }) => theme.colors.textMuted}; margin-bottom: 10px;
`;

const MetaRow = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; margin-bottom: 14px;
`;

const MetaLeft = styled.div`
  display: flex; gap: 12px; align-items: center;
`;

const MetaRight = styled.div`
  display: flex; gap: 12px; align-items: center;
`;

const RMultiple = styled.span<{ $positive: boolean }>`
  font-weight: 700; font-size: 15px;
  color: ${({ $positive }) => ($positive ? '#34d399' : '#f87171')};
`;

const PnLText = styled.span<{ $positive: boolean }>`
  font-weight: 600;
  color: ${({ $positive }) => ($positive ? '#34d399' : '#f87171')};
`;

const StateText = styled.div`
  display: flex; align-items: center; justify-content: center;
  height: 200px; color: ${({ theme }) => theme.colors.textMuted};
  font-size: 14px;
`;

const Footer = styled.div`
  display: flex; align-items: center; justify-content: flex-end;
  margin-top: 16px; padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const DoneBtn = styled.button`
  padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;
  background: ${({ theme }) => theme.colors.accent}; color: #000;
  &:hover { opacity: 0.85; }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TradeChartDialogProps {
  open: boolean;
  trade: Trade;
  currentPrice: number | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TradeChartDialog({
  open,
  trade,
  currentPrice,
  onClose,
}: TradeChartDialogProps) {
  const t = useTranslations('chart');
  const currency = useAtomValue(currencyAtom);

  const { candles, loading, error } = useCandles(open ? trade.symbol : null);

  const cur = getSymbolCurrency(trade.symbol);

  const initialRisk = trade.entryPrice - trade.initialStopLoss;
  const rMultiple =
    currentPrice != null && initialRisk > 0
      ? (currentPrice - trade.entryPrice) / initialRisk
      : null;

  const rMultipleLabel =
    rMultiple == null
      ? '—'
      : `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R`;

  const pnl =
    currentPrice != null
      ? (currentPrice - trade.entryPrice) * trade.shares
      : null;

  const lines = useMemo((): PriceLine[] => {
    const result: PriceLine[] = [
      { price: trade.entryPrice, color: '#34d399', title: t('buy'), lineStyle: 0 },
      { price: trade.currentStopLoss, color: '#f87171', title: t('stop'), lineStyle: 2 },
    ];

    if (currentPrice != null) {
      result.push({ price: currentPrice, color: '#8b9096', title: t('now'), lineStyle: 0 });
    }

    return result;
  }, [trade.entryPrice, trade.currentStopLoss, currentPrice, t]);

  if (!open) return null;

  const renderBody = () => {
    if (loading) return <StateText>{t('loading')}</StateText>;
    if (error) return <StateText>{t('loadError')}</StateText>;
    if (candles.length === 0) return <StateText>{t('noData')}</StateText>;
    return <CandleChart candles={candles} lines={lines} height={300} />;
  };

  return (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <TitleRow>
          <Title>{trade.symbol} · {trade.shares} 股</Title>
          <CloseBtn onClick={onClose} aria-label="close">✕</CloseBtn>
        </TitleRow>

        <SubTitle>
          Entry {cur} {trade.entryPrice.toFixed(2)} · Stop {cur} {trade.currentStopLoss.toFixed(2)}
        </SubTitle>

        <MetaRow>
          <MetaLeft>
            <span>
              {t('now')}: {currentPrice != null ? formatCurrency(currentPrice, cur, currency) : '—'}
            </span>
            {pnl != null && (
              <PnLText $positive={pnl >= 0}>
                {t('pnl')}: {formatCurrency(pnl, cur, currency)}
              </PnLText>
            )}
          </MetaLeft>
          <MetaRight>
            <RMultiple $positive={rMultiple == null || rMultiple >= 0}>
              {rMultipleLabel}
            </RMultiple>
          </MetaRight>
        </MetaRow>

        {renderBody()}

        <Footer>
          <DoneBtn onClick={onClose}>{t('done')}</DoneBtn>
        </Footer>
      </Card>
    </Overlay>
  );
}
