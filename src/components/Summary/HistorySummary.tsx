'use client';

import styled from 'styled-components';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import StatTile from '@/components/ui/StatTile';
import { historyStats } from '@/lib/finance';
import { formatCurrency } from '@/lib/format';
import { tradesAtom } from '@/store/tradesAtom';
import { currencyAtom } from '@/store/currencyAtom';

// ── Styled Components ─────────────────────────────────────────────────────────

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (min-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(7, 1fr);
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function HistorySummary() {
  const t = useTranslations('history');
  const trades = useAtomValue(tradesAtom);
  const currency = useAtomValue(currencyAtom);

  const closed = trades.filter((t) => t.status === 'closed');
  const h = historyStats(closed, currency);

  return (
    <Grid>
      <StatTile
        label={t('realized')}
        value={formatCurrency(h.realized, currency, currency)}
        tone={h.realized >= 0 ? 'pos' : 'neg'}
      />
      <StatTile
        label={t('count')}
        value={h.count}
      />
      <StatTile
        label={t('winLoss')}
        value={`${h.wins}W/${h.losses}L`}
      />
      <StatTile
        label={t('winRate')}
        value={`${h.winRate.toFixed(0)}%`}
      />
      <StatTile
        label={t('avgR')}
        value={h.avgR == null ? '—' : h.avgR.toFixed(2)}
      />
      <StatTile
        label={t('best')}
        value={h.best == null ? '—' : formatCurrency(h.best, currency, currency)}
        tone="pos"
      />
      <StatTile
        label={t('worst')}
        value={h.worst == null ? '—' : formatCurrency(h.worst, currency, currency)}
        tone="neg"
      />
    </Grid>
  );
}
