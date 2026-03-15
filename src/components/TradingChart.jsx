import React, { useEffect, useMemo, useRef } from "react";
import { createChart } from "lightweight-charts";

function generateCandles({ seed, points = 120, startPrice = 1200 }) {
  const candles = [];
  let lastClose = startPrice;
  const startTime = Math.floor(Date.now() / 1000) - points * 60;
  for (let i = 0; i < points; i += 1) {
    const time = startTime + i * 60;
    const rand = Math.sin(seed + i) * 2 + (Math.random() - 0.5) * 3;
    const open = lastClose;
    const close = Math.max(1, open + rand);
    const high = Math.max(open, close) + Math.random() * 3;
    const low = Math.min(open, close) - Math.random() * 3;
    const volume = Math.round(600 + Math.random() * 1200);
    candles.push({ time, open, high, low, close, volume });
    lastClose = close;
  }
  return candles;
}

function intervalForTimeframe(frame) {
  switch (frame) {
    case "5m":
      return 5;
    case "15m":
      return 15;
    case "1W":
      return 60 * 24 * 7;
    default:
      return 60 * 24;
  }
}

export default function TradingChart({ symbol, timeframe }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const dataRef = useRef([]);

  const candleData = useMemo(() => {
    const seed = symbol
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const base = 800 + (seed % 400);
    return generateCandles({ seed, startPrice: base, points: 140 });
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      height: containerRef.current.clientHeight,
      width: containerRef.current.clientWidth,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#1f2937",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "#f3f4f6" },
        horzLines: { color: "#f3f4f6" },
      },
      rightPriceScale: {
        borderColor: "#e5e7eb",
      },
      timeScale: {
        borderColor: "#e5e7eb",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#16a34a",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#16a34a",
      wickDownColor: "#ef4444",
      wickUpColor: "#16a34a",
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: "#cbd5f5",
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    function handleResize() {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    const interval = intervalForTimeframe(timeframe);
    const baseTime = Math.floor(Date.now() / 1000) - candleData.length * interval;
    const formatted = candleData.map((item, index) => ({
      time: baseTime + index * interval,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candleSeriesRef.current.setData(formatted);
    volumeSeriesRef.current.setData(
      formatted.map((item, index) => ({
        time: item.time,
        value: candleData[index].volume,
        color: item.close >= item.open ? "rgba(22, 163, 74, 0.4)" : "rgba(239, 68, 68, 0.4)",
      }))
    );
    dataRef.current = formatted;
  }, [candleData, timeframe]);

  useEffect(() => {
    if (!candleSeriesRef.current) return undefined;
    const interval = intervalForTimeframe(timeframe);
    const timer = setInterval(() => {
      const last = dataRef.current[dataRef.current.length - 1];
      if (!last) return;
      const change = (Math.random() - 0.5) * 6;
      const open = last.close;
      const close = Math.max(1, open + change);
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      const time = last.time + interval;
      const next = { time, open, high, low, close };
      dataRef.current = [...dataRef.current.slice(1), next];
      candleSeriesRef.current.update(next);
      volumeSeriesRef.current.update({
        time,
        value: Math.round(600 + Math.random() * 1200),
        color: close >= open ? "rgba(22, 163, 74, 0.4)" : "rgba(239, 68, 68, 0.4)",
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [timeframe, symbol]);

  return <div className="trading-chart" ref={containerRef} />;
}
