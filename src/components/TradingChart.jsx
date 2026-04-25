/**
 * TradingChart.jsx
 *
 * Official TradingView Advanced Chart Widget – React integration.
 *
 * Props (same interface Dashboard.jsx already passes):
 *   symbol    – plain NSE ticker, e.g. "TCS", "RELIANCE", "INFY"
 *   timeframe – "5m" | "15m" | "1D" | "1W"
 *
 * Fix log:
 *   • container_id must be a STRING id, never a DOM element reference.
 *   • tv.js is loaded ONCE and never removed/re-added (avoids race conditions).
 *   • Widget is created only after the script has loaded AND the DOM element
 *     is confirmed present (no more "parentNode null" error).
 *   • A unique, stable container id is generated per component instance so
 *     concurrent renders never share the same id.
 */

import React, { useEffect, useRef } from "react";

/* ─── Unique id counter (module-level, never resets) ────────────────────── */
let _uid = 0;

/* ─── Timeframe → TradingView interval ──────────────────────────────────── */
const INTERVAL_MAP = {
  "1m":  "1",
  "5m":  "5",
  "15m": "15",
  "30m": "30",
  "1H":  "60",
  "1D":  "D",
  "1W":  "W",
  "1M":  "M",
};

function toTVInterval(tf) {
  return INTERVAL_MAP[tf] ?? "D";
}

/* ─── Symbol → "EXCHANGE:TICKER" ────────────────────────────────────────── */
function toTVSymbol(symbol) {
  if (!symbol) return "NSE:NIFTY50";
  const upper = symbol.toUpperCase();
  if (upper.includes(":")) return upper;   // already qualified
  return `NSE:${upper}`;
}

/* ─── Load tv.js once for the lifetime of the page ──────────────────────── */
let _scriptPromise = null;

function loadTradingViewScript() {
  if (_scriptPromise) return _scriptPromise;

  _scriptPromise = new Promise((resolve, reject) => {
    // Already loaded (e.g. hot-reload scenario)
    if (window.TradingView && window.TradingView.widget) {
      resolve();
      return;
    }

    const existing = document.getElementById("tv-js");
    if (existing) {
      // Script tag exists but window object not ready yet — wait for it
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "tv-js";
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return _scriptPromise;
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function TradingChart({ symbol, timeframe }) {
  // Stable, unique container id for this component instance
  const containerId = useRef(`tv_chart_${++_uid}`);
  const widgetRef   = useRef(null);
  const mountedRef  = useRef(true);   // tracks whether component is still mounted

  useEffect(() => {
    mountedRef.current = true;
    const id = containerId.current;

    /* ── Destroy any pre-existing widget ─────────────────────────────── */
    if (widgetRef.current) {
      try { widgetRef.current.remove(); } catch (_) {}
      widgetRef.current = null;
    }

    /* ── Wipe the container's old content ────────────────────────────── */
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";

    /* ── Load script (no-op if already loaded) then init widget ──────── */
    loadTradingViewScript()
      .then(() => {
        // Bail out if component unmounted while script was loading
        if (!mountedRef.current) return;

        // Confirm the target div exists in the DOM
        const target = document.getElementById(id);
        if (!target) {
          console.warn("[TradingChart] container element not found:", id);
          return;
        }

        if (!window.TradingView || !window.TradingView.widget) {
          console.warn("[TradingChart] TradingView global not available.");
          return;
        }

        widgetRef.current = new window.TradingView.widget({
          autosize:           true,
          symbol:             toTVSymbol(symbol),
          interval:           toTVInterval(timeframe),
          timezone:           "Asia/Kolkata",
          theme:              "dark",
          style:              "1",          // 1 = Candlestick
          locale:             "en",
          toolbar_bg:         "#131722",
          enable_publishing:  false,
          allow_symbol_change: true,
          save_image:         false,
          hide_side_toolbar:  false,
          withdateranges:     true,
          hide_volume:        false,
          support_host:       "https://www.tradingview.com",
          container_id:       id,           // ← STRING id, NOT a DOM element
        });
      })
      .catch((err) => {
        console.error("[TradingChart] Failed to load TradingView script:", err);
      });

    /* ── Cleanup: destroy widget when symbol/timeframe changes or unmount */
    return () => {
      mountedRef.current = false;
      if (widgetRef.current) {
        try { widgetRef.current.remove(); } catch (_) {}
        widgetRef.current = null;
      }
      const el2 = document.getElementById(id);
      if (el2) el2.innerHTML = "";
    };
  }, [symbol, timeframe]); // re-runs when symbol or timeframe changes

  return (
    <div
      style={{
        width:        "100%",
        height:       "100%",
        minHeight:    400,
        background:   "#131722",
        borderRadius: 8,
        overflow:     "hidden",
      }}
    >
      {/*
        IMPORTANT: container_id references this div's id attribute.
        The id must be a stable string — never pass the DOM element itself.
      */}
      <div
        id={containerId.current}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
