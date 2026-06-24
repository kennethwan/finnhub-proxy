'use client';

import styled from 'styled-components';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { portfolioStats } from '@/lib/finance';
import { formatCurrency } from '@/lib/format';
import { tradesAtom } from '@/store/tradesAtom';
import { pricesAtom } from '@/store/pricesAtom';
import { currencyAtom } from '@/store/currencyAtom';
import { fullPositionPctAtom } from '@/store/fullPositionAtom';
import { capitalAtom } from '@/store/capitalAtom';

const Wrap = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 16px 0;
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const Block = styled.div<{ $right?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  align-items: ${({ $right }) => ($right ? 'flex-end' : 'flex-start')};
`;

const Lbl = styled.span`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Nav = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  color: ${({ theme }) => theme.colors.text};
`;

const PL = styled.span<{ $positive: boolean }>`
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 18px;
  font-weight: 600;
  color: ${({ $positive, theme }) => ($positive ? theme.colors.positive : theme.colors.negative)};
`;

export default function AccountBar() {
  const t = useTranslations('summary');
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

  const pct = s.capital !== 0 ? (s.totalPL / s.capital) * 100 : 0;
  const positive = s.totalPL >= 0;

  return (
    <Wrap>
      <Bar>
        <Block>
          <Lbl>{t('currentNav')}</Lbl>
          <Nav>{formatCurrency(s.nav, currency, currency)}</Nav>
        </Block>
        <Block $right>
          <Lbl>{t('totalPL')}</Lbl>
          <PL $positive={positive}>
            {positive ? '+' : ''}{formatCurrency(s.totalPL, currency, currency)} · {positive ? '+' : ''}{pct.toFixed(2)}%
          </PL>
        </Block>
      </Bar>
    </Wrap>
  );
}
