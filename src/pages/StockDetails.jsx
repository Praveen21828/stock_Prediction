import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import "../styles/stock-details.css";
import { getJSON } from "../api/client";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Screener", to: "/screener" },
  { label: "Stock Details", to: "/stock-details" },
  { label: "News", to: "/news" },
];

const INDICATORS = [
  { label: "RSI", value: "62" },
  { label: "MACD", value: "1.24" },
  { label: "VWAP", value: "2,045" },
  { label: "EMA 50", value: "2,010" },
  { label: "EMA 200", value: "1,920" },
  { label: "Support / Resistance", value: "1,980 / 2,110" },
];

const NEWS = [
  {
    title: "Company posts record quarterly profit",
    sentiment: "Positive",
    time: "2h ago",
  },
  {
    title: "Brokerage maintains neutral outlook",
    sentiment: "Neutral",
    time: "6h ago",
  },
  {
    title: "Regulatory update may impact margins",
    sentiment: "Negative",
    time: "1d ago",
  },
];

const SIGNALS = {
  intraday: { label: "BUY", confidence: 83 },
  swing: { label: "HOLD", confidence: 56 },
  delivery: { label: "BUY", confidence: 78 },
};

export default function StockDetails() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [indicators, setIndicators] = useState(INDICATORS);
  const [news, setNews] = useState(NEWS);
  const [signals, setSignals] = useState(SIGNALS);
  const [priceBlock, setPriceBlock] = useState({ price: "₹2,865.70", change: "+1.51%" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramSymbol = params.get("symbol");
    if (paramSymbol) setSymbol(paramSymbol.toUpperCase());
  }, []);

  useEffect(() => {
    if (!symbol) return;
    let isMounted = true;
    getJSON(`/api/stocks/${symbol}/indicators`)
      .then((data) => {
        if (!isMounted || !data?.indicators?.length) return;
        const latest = data.indicators[0];
        setIndicators([
          { label: "RSI", value: latest.rsi_14?.toFixed?.(2) ?? "-" },
          { label: "MACD", value: latest.macd?.toFixed?.(2) ?? "-" },
          { label: "VWAP", value: latest.vwap?.toFixed?.(2) ?? "-" },
          { label: "EMA 50", value: latest.ema_50?.toFixed?.(2) ?? "-" },
          { label: "EMA 200", value: latest.ema_200?.toFixed?.(2) ?? "-" },
          { label: "Support / Resistance", value: "-" },
        ]);
      })
      .catch(() => {
        // keep sample data on error
      });

    getJSON(`/api/stocks/${symbol}/sentiment`)
      .then((data) => {
        if (!isMounted || !data?.sentiment?.length) return;
        const mapped = data.sentiment.slice(0, 5).map((item) => ({
          title: item.headline,
          sentiment: item.sentiment_score >= 0.05 ? "Positive" : item.sentiment_score <= -0.05 ? "Negative" : "Neutral",
          time: new Date(item.published_date).toLocaleDateString(),
        }));
        setNews(mapped);
      })
      .catch(() => {
        // keep sample data on error
      });

    getJSON(`/api/stocks/${symbol}/prediction`)
      .then((data) => {
        if (!isMounted || !data) return;
        setSignals({
          intraday: { label: data.intraday?.signal || "WATCH", confidence: Math.round(data.intraday?.confidence ?? 0) },
          swing: { label: data.swing?.signal || "WATCH", confidence: Math.round(data.swing?.confidence ?? 0) },
          delivery: { label: data.delivery?.signal || "WATCH", confidence: Math.round(data.delivery?.confidence ?? 0) },
        });
      })
      .catch(() => {
        // keep sample data on error
      });

    getJSON(`/api/stocks/${symbol}/history`)
      .then((data) => {
        if (!isMounted || !data?.history?.length) return;
        const latest = data.history[0];
        const price = latest?.close ? `₹${Number(latest.close).toFixed(2)}` : "₹0.00";
        const open = latest?.open ? Number(latest.open) : 0;
        const close = latest?.close ? Number(latest.close) : 0;
        const changePct = open ? (((close - open) / open) * 100).toFixed(2) : "0.00";
        setPriceBlock({ price, change: `${changePct}%` });
      })
      .catch(() => {
        // keep sample data on error
      });

    return () => {
      isMounted = false;
    };
  }, [symbol]);
  return (
    <div className="stock-details">
      <header className="top-nav">
        <div className="brand">Stock Prediction</div>
        <nav className="nav-tabs">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-tab ${isActive ? "active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="theme-toggle" type="button">
            <img
              className="theme-icon theme-icon--light"
              src="/images/theme-sun.jpg"
              alt="Light mode"
            />
            <img
              className="theme-icon theme-icon--dark"
              src="/images/theme-moon.jpg"
              alt="Dark mode"
            />
          </button>
          <div className="user-chip">PK</div>
        </div>
      </header>

      <main className="details-content">
        <section className="header-card">
          <div>
            <p className="label">Selected Stock</p>
            <h1>
              {symbol} <span>NSE</span>
            </h1>
          </div>
          <div className="price-block">
            <p className="label">Price</p>
            <h2>{priceBlock.price}</h2>
            <span className="change up">{priceBlock.change}</span>
          </div>
          <div className="signal-chip buy">Signal: BUY</div>
        </section>

        <section className="indicator-grid">
          {indicators.map((item) => (
            <div key={item.label} className="indicator-card">
              <p className="label">{item.label}</p>
              <h3>{item.value}</h3>
            </div>
          ))}
        </section>

        <section className="signal-explanation">
          <h3>Signal Explanation</h3>
          <ul>
            <li>Price above VWAP and EMA 50 → bullish momentum.</li>
            <li>RSI in 55–70 range → strength without overbought risk.</li>
            <li>Support zone respected near ₹1,980.</li>
            <li>News sentiment mostly positive.</li>
          </ul>
        </section>

        <section className="signal-badges">
          <div className="badge intraday">
            ⚡ Intraday: {signals.intraday.label} ({signals.intraday.confidence}%)
          </div>
          <div className="badge swing">
            〰️ Swing: {signals.swing.label} ({signals.swing.confidence}%)
          </div>
          <div className="badge delivery">
            🛡️ Delivery: {signals.delivery.label} ({signals.delivery.confidence}%)
          </div>
        </section>

        <section className="news-panel">
          <div className="news-header">
            <h3>Latest News</h3>
            <span className="sentiment-chip positive">Positive</span>
          </div>
          <ul>
            {news.map((item) => (
              <li key={item.title}>
                <div>
                  <p>{item.title}</p>
                  <span>{item.time}</span>
                </div>
                <span className={`sentiment ${item.sentiment.toLowerCase()}`}>
                  {item.sentiment}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
