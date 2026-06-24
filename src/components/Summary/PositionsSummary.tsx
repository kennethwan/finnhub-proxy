'use client';
import styled from 'styled-components';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import StatTile from '@/components/ui/StatTile';
import { portfolioStats } from '@/lib/finance';
import { formatCurrency } from '@/lib/format';
import { tradesAtom } from '@/store/tradesAtom';
import { pricesAtom } from '@/store/pricesAtom';
import { currencyAtom } from '@/store/currencyAtom';
import { fullPositionPctAtom } from '@/store/fullPositionAtom';
import { capitalAtom } from '@/store/capitalAtom';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (min-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

export default function PositionsSummary() {
  const t = useTranslations('summary');
  const ti = useTranslations('metricsInfo');
  const trades = useAtomValue(tradesAtom);
  const prices = useAtomValue(pricesAtom);
  const currency = useAtomValue(currencyAtom);
  const fullPositionPct = useAtomValue(fullPositionPctAtom);
  const capital = useAtomValue(capitalAtom);

  const s = portfolioStats(trades, {
    prices,
    capital: parseFloat(capital) || 0,
    fullPositionPct,
    display: currency,
  });

  return (
    <Grid>
      {/* Row 1: NAV */}
      <StatTile
        label={t('currentNav')}
        value={formatCurrency(s.nav, currency, currency)}
        accent
      />
      <StatTile
        label={t('totalPL')}
        value={formatCurrency(s.totalPL, currency, currency)}
        tone={s.totalPL >= 0 ? 'pos' : 'neg'}
      />
      <StatTile
        label={t('unrealized')}
        value={
          s.hasLiveUnrealized
            ? formatCurrency(s.unrealized, currency, currency)
            : '—'
        }
        tone={
          s.hasLiveUnrealized
            ? s.unrealized >= 0
              ? 'pos'
              : 'neg'
            : 'muted'
        }
      />
      <StatTile
        label={t('realized')}
        value={formatCurrency(s.realized, currency, currency)}
        tone={s.realized >= 0 ? 'pos' : 'neg'}
      />

      {/* Row 2: Exposure / Risk */}
      <StatTile
        label={t('pctInvested')}
        value={`${s.pctInvested.toFixed(1)}%`}
      />
      <StatTile
        label={t('numStock')}
        value={s.numStock}
      />
      <StatTile
        label={t('osFp')}
        value={s.osFp.toFixed(2)}
        info={ti('osFp')}
      />
      <StatTile
        label={t('sdd')}
        value={formatCurrency(s.sdd, currency, currency)}
        tone={s.sdd < 0 ? 'neg' : 'pos'}
        info={ti('sdd')}
      />
      <StatTile
        label={t('mdd')}
        value={formatCurrency(s.mdd, currency, currency)}
        tone={s.mdd < 0 ? 'neg' : 'pos'}
        info={ti('mdd')}
      />
    </Grid>
  );
}
