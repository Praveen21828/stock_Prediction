import React, { useState } from "react";
import "../styles/stock-details.css";

const NAV_ITEMS = ["Dashboard", "Screener", "Stock Details", "News"];

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
  const [activeTab, setActiveTab] = useState("Stock Details");

  return (
    <div className="stock-details">
      <header className="top-nav">
        <div className="brand">Stock Prediction</div>
        <nav className="nav-tabs">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-tab ${activeTab === item ? "active" : ""}`}
              onClick={() => setActiveTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="theme-toggle" type="button">
            🌗
          </button>
          <div className="user-chip">PK</div>
        </div>
      </header>

      <main className="details-content">
        <section className="header-card">
          <div>
            <p className="label">Selected Stock</p>
            <h1>
              RELIANCE <span>NSE</span>
            </h1>
          </div>
          <div className="price-block">
            <p className="label">Price</p>
            <h2>₹2,865.70</h2>
            <span className="change up">+1.51%</span>
          </div>
          <div className="signal-chip buy">Signal: BUY</div>
        </section>

        <section className="indicator-grid">
          {INDICATORS.map((item) => (
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
            ⚡ Intraday: {SIGNALS.intraday.label} ({SIGNALS.intraday.confidence}%)
          </div>
          <div className="badge swing">
            〰️ Swing: {SIGNALS.swing.label} ({SIGNALS.swing.confidence}%)
          </div>
          <div className="badge delivery">
            🛡️ Delivery: {SIGNALS.delivery.label} ({SIGNALS.delivery.confidence}%)
          </div>
        </section>

        <section className="news-panel">
          <div className="news-header">
            <h3>Latest News</h3>
            <span className="sentiment-chip positive">Positive</span>
          </div>
          <ul>
            {NEWS.map((item) => (
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
