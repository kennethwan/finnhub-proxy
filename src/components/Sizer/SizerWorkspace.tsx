'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import PositionSizerPanel from '@/components/Sizer/PositionSizerPanel';
import TradingViewWidget from '@/components/Sizer/TradingViewWidget';

const Container = styled.div`
  max-width: 1480px;
  margin: 0 auto;
  padding: 16px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

const PanelRail = styled.div`
  position: sticky;
  top: 72px;

  @media (max-width: 1023px) {
    position: static;
    order: 2;
  }
`;

const ChartRail = styled.section`
  min-width: 0;

  @media (max-width: 1023px) {
    order: 1;
  }
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
  const [symbol, setSymbol] = useState('');

  return (
    <Container>
      <Grid>
        <PanelRail>
          <PositionSizerPanel chartMode="none" onSymbolChange={setSymbol} />
        </PanelRail>
        <ChartRail aria-label={t('chartLabel')}>
          <ChartHeader>
            <span>{t('chartLabel')}</span>
            <span>{symbol || 'AAPL'}</span>
          </ChartHeader>
          <TradingViewWidget symbol={symbol} />
        </ChartRail>
      </Grid>
    </Container>
  );
}
