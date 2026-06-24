'use client';

import { useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useLocale } from 'next-intl';

import { DEFAULT_TRADING_VIEW_SYMBOL, normalizeTradingViewSymbol } from '@/lib/tradingViewSymbol';

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

const Shell = styled.div`
  min-height: 520px;
  height: calc(100dvh - 104px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  overflow: hidden;

  @media (max-width: 1023px) {
    height: 58dvh;
    min-height: 360px;
  }
`;

const Container = styled.div`
  width: 100%;
  height: 100%;
`;

interface TradingViewWidgetProps {
  symbol: string;
}

export default function TradingViewWidget({ symbol }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const locale = useLocale();
  const normalizedSymbol = useMemo(
    () => normalizeTradingViewSymbol(symbol || DEFAULT_TRADING_VIEW_SYMBOL),
    [symbol],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    // Defer injection one tick so React StrictMode's dev double-invoke
    // (mount → cleanup → mount) cancels the throwaway first pass before its
    // async embed script is appended. Without this, the orphaned in-flight
    // script runs a querySelector against the wiped container and throws.
    const timer = window.setTimeout(() => {
      if (cancelled || !container.isConnected) return;

      container.innerHTML = '';
      const widgetRoot = document.createElement('div');
      widgetRoot.className = 'tradingview-widget-container__widget';
      widgetRoot.style.width = '100%';
      widgetRoot.style.height = '100%';
      container.appendChild(widgetRoot);

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: normalizedSymbol,
        interval: 'D',
        timezone: 'Asia/Hong_Kong',
        theme: 'dark',
        style: '1',
        locale: locale === 'zh-HK' ? 'zh_HK' : 'en',
        allow_symbol_change: true,
        calendar: false,
        support_host: 'https://www.tradingview.com',
      });
      container.appendChild(script);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      container.innerHTML = '';
    };
  }, [locale, normalizedSymbol]);

  return (
    <Shell>
      <Container ref={containerRef} />
    </Shell>
  );
}
