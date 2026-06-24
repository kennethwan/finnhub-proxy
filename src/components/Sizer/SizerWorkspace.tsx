'use client';

import { useId, useState } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import PositionSizerPanel from '@/components/Sizer/PositionSizerPanel';
import TradingViewWidget from '@/components/Sizer/TradingViewWidget';
import { normalizeTradingViewSymbol } from '@/lib/tradingViewSymbol';

const Container = styled.div`
  max-width: 1480px;
  margin: 0 auto;
  padding: 16px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  grid-template-areas: 'panel chart';
  gap: 16px;
  align-items: start;

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      'chart'
      'panel';
  }
`;

const PanelRail = styled.div`
  grid-area: panel;
  position: sticky;
  top: 72px;

  @media (max-width: 1023px) {
    position: static;
  }
`;

const ChartRail = styled.section`
  grid-area: chart;
  min-width: 0;
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
`;

export default function SizerWorkspace() {
  const t = useTranslations('sizerPage');
  const chartHeaderId = useId();
  const [symbol, setSymbol] = useState('');
  const displaySymbol = normalizeTradingViewSymbol(symbol);

  return (
    <Container>
      <Grid>
        <ChartRail aria-labelledby={chartHeaderId}>
          <ChartHeader id={chartHeaderId}>
            <span>{t('chartLabel')}</span>
            <span>{displaySymbol}</span>
          </ChartHeader>
          <TradingViewWidget symbol={symbol} />
        </ChartRail>
        <PanelRail>
          <PositionSizerPanel chartMode="none" onSymbolChange={setSymbol} />
        </PanelRail>
      </Grid>
    </Container>
  );
}
