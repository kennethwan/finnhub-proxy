'use client';

import { useEffect, useId, useState } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import PositionSizerPanel from '@/components/Sizer/PositionSizerPanel';
import KeyLevelChart, { type ChartContext } from '@/components/Chart/KeyLevelChart';
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
  gap: 12px;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
`;

const TvLink = styled.a`
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  white-space: nowrap;
  &:hover { text-decoration: underline; }
`;

const ChartFrame = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  padding: 12px;
`;

export default function SizerWorkspace() {
  const t = useTranslations('sizerPage');
  const chartHeaderId = useId();
  const [symbol, setSymbol] = useState('');
  const [chartCtx, setChartCtx] = useState<ChartContext | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const tvSymbol = normalizeTradingViewSymbol(symbol);
  const tvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;

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
        <span>{t('chartLabel')} · {tvSymbol}</span>
        <TvLink href={tvUrl} target="_blank" rel="noopener noreferrer">{t('openTradingView')}</TvLink>
      </ChartHeader>
      <ChartFrame>
        {chartCtx && <KeyLevelChart {...chartCtx} height={isDesktop ? 460 : 320} />}
      </ChartFrame>
    </ChartRail>
  );

  const panel = (
    <PanelRail>
      <PositionSizerPanel chartMode="none" onSymbolChange={setSymbol} onChartContext={setChartCtx} />
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
