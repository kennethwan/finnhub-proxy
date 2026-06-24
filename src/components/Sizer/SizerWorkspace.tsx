'use client';

import { useEffect, useId, useState } from 'react';
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
  }
`;

const ChartRail = styled.section`
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
  const [isDesktop, setIsDesktop] = useState(false);
  const displaySymbol = normalizeTradingViewSymbol(symbol);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const chart = (
    <ChartRail aria-labelledby={chartHeaderId}>
      <ChartHeader id={chartHeaderId}>
        <span>{t('chartLabel')}</span>
        <span>{displaySymbol}</span>
      </ChartHeader>
      <TradingViewWidget symbol={symbol} />
    </ChartRail>
  );

  const panel = (
    <PanelRail>
      <PositionSizerPanel chartMode="none" onSymbolChange={setSymbol} />
    </PanelRail>
  );

  return (
    <Container>
      <Grid>
        {isDesktop ? (
          <>
            {panel}
            {chart}
          </>
        ) : (
          <>
            {chart}
            {panel}
          </>
        )}
      </Grid>
    </Container>
  );
}
