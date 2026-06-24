'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import KeyLevelChart from '@/components/Chart/KeyLevelChart';

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
  background: ${({ theme }) => theme.colors.accent}; color: ${({ theme }) => theme.colors.accentText};
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

  if (!open) return null;

  return (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <TitleRow>
          <Title>{t('title')} · {symbol}</Title>
          <CloseBtn onClick={onClose} aria-label="close">✕</CloseBtn>
        </TitleRow>

        <KeyLevelChart
          symbol={symbol}
          buyPrice={buyPrice}
          stop={stop}
          target={target}
          onPickStop={onPickStop}
          onPickTarget={onPickTarget}
          height={300}
        />

        <Footer>
          <FooterValues>
            <FooterValue>
              <FooterLabel>{t('stop')}</FooterLabel>
              <FooterNum $color="#f87171">{stop != null ? stop.toFixed(2) : '—'}</FooterNum>
            </FooterValue>
            <FooterValue>
              <FooterLabel>{t('target')}</FooterLabel>
              <FooterNum $color="#fbbf24">{target != null ? target.toFixed(2) : '—'}</FooterNum>
            </FooterValue>
          </FooterValues>
          <DoneBtn onClick={onClose}>{t('done')}</DoneBtn>
        </Footer>
      </Card>
    </Overlay>
  );
}
