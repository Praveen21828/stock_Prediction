import React, { useEffect, useMemo, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import { connectChartStream } from "../api/wsClient";

function normalizeTf(tf) {
  // match backend mapping; keep existing Dashboard values
  if (!tf) return "5m";
  return tf;
}

export default function LiveCandleChart({ symbol, exchange, timeframe }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const wsRef = useRef(null);

  // UI helpers for a clearly “moving” price
  const lastCandleRef = useRef(null);

  const [status, setStatus] = useState("connecting");
  const [lastError, setLastError] = useState(null);
  const [lastPrice, setLastPrice] = useState(null);
  const [lastPriceDir, setLastPriceDir] = useState(null); // 'up' | 'down' | null

  const tf = useMemo(() => normalizeTf(timeframe), [timeframe]);
  const ex = useMemo(() => (exchange || "NSE").toUpperCase(), [exchange]);
  const sym = useMemo(() => (symbol || "").toUpperCase(), [symbol]);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0b1220" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(148, 163, 184, 0.25)" },
        horzLine: { color: "rgba(148, 163, 184, 0.25)" },
      },
    });

    const candles = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineVisible: true,
      lastValueVisible: true,
    });

    const volumes = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: "rgba(148, 163, 184, 0.4)",
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candles;
    volumeSeriesRef.current = volumes;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      chart.applyOptions({ width: rect.width, height: rect.height });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      try {
        chart.remove();
      } catch (_) {
        // ignore
      }
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // (Re)connect stream on symbol/exchange/timeframe
  useEffect(() => {
    if (!sym) return;
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    setStatus("connecting");
    setLastError(null);

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (_) {}
      wsRef.current = null;
    }

    candleSeriesRef.current.setData([]);
    volumeSeriesRef.current.setData([]);
    lastCandleRef.current = null;
    setLastPrice(null);
    setLastPriceDir(null);

    const ws = connectChartStream({
      symbol: sym,
      exchange: ex,
      timeframe: tf,
      pollSeconds: 5,
      onOpen: () => setStatus("live"),
      onClose: () => setStatus("closed"),
      onError: () => setStatus("error"),
      onMessage: (msg) => {
        if (!msg || typeof msg !== "object") return;

        if (msg.type === "error") {
          setLastError(msg.message || "WebSocket error");
          setStatus("error");
          return;
        }

        if (msg.type === "history" && Array.isArray(msg.candles)) {
          const candleData = msg.candles.map((c) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));
          const volumeData = msg.candles.map((c) => ({
            time: c.time,
            value: c.volume || 0,
            color: c.close >= c.open ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)",
          }));

          candleSeriesRef.current.setData(candleData);
          volumeSeriesRef.current.setData(volumeData);
          chartRef.current?.timeScale()?.fitContent?.();

          // Update “moving price” UI from the last historical candle
          const last = msg.candles[msg.candles.length - 1];
          if (last) {
            lastCandleRef.current = last;
            setLastPrice(last.close);
            setLastPriceDir(last.close >= last.open ? "up" : "down");
          }
          return;
        }

        if (msg.type === "update" && msg.candle) {
          const c = msg.candle;
          candleSeriesRef.current.update({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          });
          volumeSeriesRef.current.update({
            time: c.time,
            value: c.volume || 0,
            color: c.close >= c.open ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)",
          });

          // Keep chart “alive” by following the latest bar (right edge)
          // This makes the price movement visible even if the timescale is near real-time.
          try {
            chartRef.current?.timeScale?.()?.scrollToRealTime?.();
          } catch (_) {
            // ignore
          }

          // Update overlay last price (more obvious than relying on the axis label alone)
          const prev = lastCandleRef.current;
          lastCandleRef.current = c;
          setLastPrice(c.close);
          if (prev && typeof prev.close === "number") {
            if (c.close > prev.close) setLastPriceDir("up");
            else if (c.close < prev.close) setLastPriceDir("down");
          } else {
            setLastPriceDir(c.close >= c.open ? "up" : "down");
          }
        }
      },
    });

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (_) {}
        wsRef.current = null;
      }
    };
  }, [sym, ex, tf]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 400,
        background: "#0b1220",
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 12,
          background: "rgba(2, 6, 23, 0.7)",
          color: "#cbd5e1",
          border: "1px solid rgba(148, 163, 184, 0.15)",
        }}
      >
        {ex}:{sym} • {tf} • {status}
        {lastError ? ` • ${lastError}` : ""}
      </div>

      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 12,
          background:
            lastPriceDir === "up"
              ? "rgba(34, 197, 94, 0.12)"
              : lastPriceDir === "down"
                ? "rgba(239, 68, 68, 0.12)"
                : "rgba(2, 6, 23, 0.7)",
          color:
            lastPriceDir === "up" ? "#22c55e" : lastPriceDir === "down" ? "#ef4444" : "#cbd5e1",
          border:
            lastPriceDir === "up"
              ? "1px solid rgba(34, 197, 94, 0.25)"
              : lastPriceDir === "down"
                ? "1px solid rgba(239, 68, 68, 0.25)"
                : "1px solid rgba(148, 163, 184, 0.15)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {lastPrice == null ? "—" : `Last: ${Number(lastPrice).toFixed(2)}`}
      </div>
    </div>
  );
}

