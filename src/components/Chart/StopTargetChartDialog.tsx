'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import CandleChart, { type PriceLine } from '@/components/Chart/CandleChart';
import { useCandles } from '@/hooks/useCandles';
import { detectKeyLevels, suggestStop, suggestTarget, rLevels } from '@/lib/keyLevels';

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
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
`;

const Title = styled.strong`
  font-size: 16px;
`;

const CloseBtn = styled.button`
  background: none; border: none; cursor: pointer; color: inherit; font-size: 18px; line-height: 1;
  padding: 4px 6px; border-radius: 4px;
  &:hover { opacity: 0.7; }
`;

const StateText = styled.div`
  display: flex; align-items: center; justify-content: center;
  height: 200px; color: ${({ theme }) => theme.colors.textMuted};
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

const Chip = styled.button<{ $variant?: 'support' | 'resistance' }>`
  padding: 4px 10px; border-radius: 20px; font-size: 12px; cursor: pointer; font-weight: 500;
  border: 1px solid ${({ $variant, theme }) =>
    $variant === 'support' ? theme.colors.positive ?? '#34d399'
    : $variant === 'resistance' ? theme.colors.negative ?? '#f87171'
    : theme.colors.border};
  color: ${({ $variant, theme }) =>
    $variant === 'support' ? theme.colors.positive ?? '#34d399'
    : $variant === 'resistance' ? theme.colors.negative ?? '#f87171'
    : 'inherit'};
  background: transparent;
  &:hover { opacity: 0.8; }
  &:active { opacity: 0.6; }
`;

const Footer = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 16px; padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  gap: 12px; flex-wrap: wrap;
`;

const FooterValues = styled.div`
  display: flex; gap: 16px; font-size: 13px;
`;

const FooterValue = styled.div`
  display: flex; flex-direction: column; gap: 2px;
`;

const FooterLabel = styled.span`
  font-size: 11px; color: ${({ theme }) => theme.colors.textMuted};
`;

const FooterNum = styled.span<{ $color?: string }>`
  font-weight: 600; color: ${({ $color }) => $color ?? 'inherit'};
`;

const DoneBtn = styled.button`
  padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;
  background: ${({ theme }) => theme.colors.accent}; color: #000;
  &:hover { opacity: 0.85; }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface StopTargetChartDialogProps {
  open: boolean;
  symbol: string;
  buyPrice: number | null;
  stop: number | null;
  target: number | null;
  onPickStop: (price: number) => void;
  onPickTarget: (price: number) => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StopTargetChartDialog({
  open,
  symbol,
  buyPrice,
  stop,
  target,
  onPickStop,
  onPickTarget,
  onClose,
}: StopTargetChartDialogProps) {
  const t = useTranslations('chart');

  const { candles, loading, error } = useCandles(open ? symbol : null);

  const { supports, resistances } = useMemo(() => detectKeyLevels(candles), [candles]);

  const rl = buyPrice != null && stop != null ? rLevels(buyPrice, stop) : null;

  const lines = useMemo((): PriceLine[] => {
    const result: PriceLine[] = [];

    if (buyPrice != null) {
      result.push({ price: buyPrice, color: '#34d399', title: t('buy'), lineStyle: 1 });
    }
    if (stop != null) {
      result.push({ price: stop, color: '#f87171', title: t('stop'), lineStyle: 0 });
    }
    if (target != null) {
      result.push({ price: target, color: '#fbbf24', title: t('target'), lineStyle: 0 });
    }
    for (const s of supports) {
      result.push({ price: s.price, color: '#34d399', title: 'S', lineStyle: 2 });
    }
    for (const r of resistances) {
      result.push({ price: r.price, color: '#f87171', title: 'R', lineStyle: 2 });
    }
    if (rl) {
      result.push({ price: rl.r1, color: '#fbbf24', title: '1R', lineStyle: 1 });
      result.push({ price: rl.r2, color: '#fbbf24', title: '2R', lineStyle: 1 });
      result.push({ price: rl.r3, color: '#fbbf24', title: '3R', lineStyle: 1 });
    }

    return result;
  }, [buyPrice, stop, target, supports, resistances, rl, t]);

  if (!open) return null;

  const renderBody = () => {
    if (loading) return <StateText>{t('loading')}</StateText>;
    if (error) return <StateText>{t('loadError')}</StateText>;
    if (candles.length === 0) return <StateText>{t('noData')}</StateText>;
    return (
      <CandleChart
        candles={candles}
        lines={lines}
        onPriceClick={onPickStop}
        height={300}
      />
    );
  };

  return (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <TitleRow>
          <Title>{t('title')} · {symbol}</Title>
          <CloseBtn onClick={onClose} aria-label="close">✕</CloseBtn>
        </TitleRow>

        {renderBody()}

        {supports.length > 0 && (
          <ChipsSection>
            <ChipsLabel>{t('supports')}</ChipsLabel>
            <ChipsRow>
              {supports.map((s) => (
                <Chip
                  key={s.price}
                  $variant="support"
                  onClick={() => onPickStop(suggestStop(s.price))}
                >
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
                <Chip
                  key={r.price}
                  $variant="resistance"
                  onClick={() => onPickTarget(suggestTarget(r.price))}
                >
                  {r.price.toFixed(2)}
                </Chip>
              ))}
            </ChipsRow>
          </ChipsSection>
        )}

        <Footer>
          <FooterValues>
            <FooterValue>
              <FooterLabel>{t('stop')}</FooterLabel>
              <FooterNum $color="#f87171">
                {stop != null ? stop.toFixed(2) : '—'}
              </FooterNum>
            </FooterValue>
            <FooterValue>
              <FooterLabel>{t('target')}</FooterLabel>
              <FooterNum $color="#fbbf24">
                {target != null ? target.toFixed(2) : '—'}
              </FooterNum>
            </FooterValue>
          </FooterValues>
          <DoneBtn onClick={onClose}>{t('done')}</DoneBtn>
        </Footer>
      </Card>
    </Overlay>
  );
}
