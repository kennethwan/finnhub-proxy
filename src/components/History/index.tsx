'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import { useTrades } from '@/hooks/useTrades';
import HistorySummary from '@/components/Summary/HistorySummary';
import HistoryCard from '@/components/History/HistoryCard';

// ── Styled Components ─────────────────────────────────────────────────────────

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
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

export default function History() {
  const t = useTranslations('history');
  const { trades, removeTrade } = useTrades();

  const closed = trades
    .filter((trade) => trade.status === 'closed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Wrapper>
      {closed.length > 0 && (
        <>
          <HistorySummary />
          <CardList>
            {closed.map((trade) => (
              <HistoryCard
                key={trade.id}
                trade={trade}
                onDelete={removeTrade}
              />
            ))}
          </CardList>
        </>
      )}

      {closed.length === 0 && (
        <EmptyState>{t('empty')}</EmptyState>
      )}
    </Wrapper>
  );
}
