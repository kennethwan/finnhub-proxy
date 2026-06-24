'use client';

import styled, { keyframes } from 'styled-components';
import { useTranslations } from 'next-intl';
import { useTrades } from '@/hooks/useTrades';
import { usePricePolling } from '@/hooks/usePricePolling';
import PositionsSummary from '@/components/Summary/PositionsSummary';
import TradeCard from '@/components/Positions/TradeCard';

// ── Animations ────────────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`;

// ── Styled Components ─────────────────────────────────────────────────────────

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LiveBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const LiveLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PulseDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: ${pulse} 2s ease-in-out infinite;
  flex-shrink: 0;
`;

const LiveLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const RefreshBtn = styled.button`
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text};
    border-color: rgba(255,255,255,0.2);
    background: ${({ theme }) => `${theme.colors.text}08`};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorBox = styled.div`
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.negative};
  background: ${({ theme }) => `${theme.colors.negative}10`};
  border: 1px solid ${({ theme }) => `${theme.colors.negative}30`};
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const EmptyState = styled.div`
  padding: 40px 24px;
  border-radius: 12px;
  border: 1.5px dashed ${({ theme }) => theme.colors.border};
  text-align: center;
  color: ${({ theme }) => theme.colors.textFaint};
  font-size: 14px;
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function Positions() {
  const t = useTranslations('positions');
  const { trades, updateStop, closeTrade, removeTrade } = useTrades();
  const { loading, error, refresh } = usePricePolling();

  const open = trades
    .filter((t) => t.status === 'open')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Wrapper>
      {trades.length > 0 && <PositionsSummary />}

      {open.length > 0 && (
        <>
          <LiveBar>
            <LiveLeft>
              <PulseDot />
              <LiveLabel>{t('autoUpdate')}</LiveLabel>
            </LiveLeft>
            <RefreshBtn onClick={refresh} disabled={loading}>
              {loading ? t('updating') : t('refresh')}
            </RefreshBtn>
          </LiveBar>

          {error && <ErrorBox>{error}</ErrorBox>}

          <CardList>
            {open.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onUpdateStop={updateStop}
                onClose={closeTrade}
                onDelete={removeTrade}
              />
            ))}
          </CardList>
        </>
      )}

      {open.length === 0 && (
        <EmptyState>{t('empty')}</EmptyState>
      )}
    </Wrapper>
  );
}
