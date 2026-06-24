'use client';

import { useEffect, useRef } from 'react';
import {
  createChart, ColorType, type IChartApi, type ISeriesApi, type Time, type IPriceLine,
} from 'lightweight-charts';
import type { Candle } from '@/types/candle';

export interface PriceLine { price: number; color: string; title: string; lineStyle?: 0 | 1 | 2 | 3 | 4 }

interface Props { candles: Candle[]; lines?: PriceLine[]; onPriceClick?: (price: number) => void; height?: number }

export default function CandleChart({ candles, lines = [], onPriceClick, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const clickRef = useRef(onPriceClick);

  useEffect(() => {
    clickRef.current = onPriceClick;
  }, [onPriceClick]);

  // create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      height,
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#8b9096' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
    });
    const series = chart.addCandlestickSeries({
      upColor: '#34d399', downColor: '#f87171', wickUpColor: '#34d399', wickDownColor: '#f87171', borderVisible: false,
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
    return () => { created.forEach((pl) => series.removePriceLine(pl)); };
  }, [lines]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
