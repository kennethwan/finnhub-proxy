'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'styled-components';
import {
  createChart, ColorType, type IChartApi, type ISeriesApi, type Time, type IPriceLine,
} from 'lightweight-charts';
import type { AppTheme } from '@/styles/theme';
import type { Candle } from '@/types/candle';

export interface PriceLine { price: number; color: string; title: string; lineStyle?: 0 | 1 | 2 | 3 | 4 }

interface Props { candles: Candle[]; lines?: PriceLine[]; onPriceClick?: (price: number) => void; height?: number }

/** Theme-driven chart palette. Candles are blue (up) / red (down) — a
 *  colorblind-friendly pair — and grid/text/axes follow the light/dark theme. */
function chartColors(theme: AppTheme) {
  return {
    up: theme.mode === 'dark' ? '#38bdf8' : '#2563eb',
    down: theme.colors.negative,
    text: theme.colors.textMuted,
    line: theme.colors.border,
  };
}

export default function CandleChart({ candles, lines = [], onPriceClick, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const clickRef = useRef(onPriceClick);

  const theme = useTheme() as AppTheme;
  const themeRef = useRef(theme);

  // keep the latest theme available to the create-once effect without recreating
  useEffect(() => { themeRef.current = theme; });

  useEffect(() => {
    clickRef.current = onPriceClick;
  }, [onPriceClick]);

  // create chart once (read the latest theme via ref so a theme toggle doesn't
  // recreate the chart — the colors effect below repaints it instead)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const c = chartColors(themeRef.current);
    const chart = createChart(el, {
      height,
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: c.text },
      grid: { vertLines: { color: c.line }, horzLines: { color: c.line } },
      rightPriceScale: { borderColor: c.line },
      timeScale: { borderColor: c.line },
    });
    const series = chart.addCandlestickSeries({
      upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down, borderVisible: false,
    });
    chart.subscribeClick((param) => {
      if (!clickRef.current || !param.point) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price != null) clickRef.current(price as number);
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => { chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, [height]);

  // repaint colors on theme (light/dark) change without recreating the chart
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const c = chartColors(theme);
    chart.applyOptions({
      layout: { textColor: c.text },
      grid: { vertLines: { color: c.line }, horzLines: { color: c.line } },
      rightPriceScale: { borderColor: c.line },
      timeScale: { borderColor: c.line },
    });
    series.applyOptions({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down });
  }, [theme]);

  // data
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.setData(candles.map((c) => ({ time: c.t as Time, open: c.o, high: c.h, low: c.l, close: c.c })));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // price lines (recreate on change)
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const created: IPriceLine[] = lines.map((l) =>
      series.createPriceLine({ price: l.price, color: l.color, lineWidth: 1, lineStyle: l.lineStyle ?? 0, axisLabelVisible: true, title: l.title }),
    );
    return () => {
      // On unmount React may run the create-chart cleanup (chart.remove(), which
      // nulls chartRef) before this one. Calling removePriceLine on a removed
      // chart re-invalidates the destroyed model and schedules a paint that fires
      // after the canvas binding is disposed → lightweight-charts "Object is
      // disposed". Skip when the chart is already gone.
      if (!chartRef.current) return;
      created.forEach((pl) => series.removePriceLine(pl));
    };
  }, [lines]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
