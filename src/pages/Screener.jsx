import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/screener.css";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Screener", to: "/screener" },
  { label: "Stock Detail", to: "/stock-details" },
  { label: "News", to: "/news" },
];

const SAMPLE_RESULTS = [
  { symbol: "TCS", signal: "BUY", score: 82 },
  { symbol: "TATASTEEL", signal: "HOLD", score: 56 },
  { symbol: "HCL", signal: "BUY", score: 71 },
  { symbol: "ITC", signal: "SELL", score: 38 },
  { symbol: "INFY", signal: "HOLD", score: 60 },
  { symbol: "RELIANCE", signal: "BUY", score: 88 },
];

function getSignalClass(signal) {
  if (signal === "BUY") return "buy";
  if (signal === "SELL") return "sell";
  return "hold";
}

export default function Screener() {
  const navigate = useNavigate();

  function handleRowClick(symbol) {
    navigate(`/stock-details?symbol=${symbol}`);
  }

  return (
    <div className="screener">
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
            🌗
          </button>
          <div className="user-chip">PK</div>
        </div>
      </header>

      <main className="screener-content">
        <section className="screener-header">
          <div>
            <h1>Screener Results</h1>
            <p>Filtered stocks based on rule-based signals</p>
          </div>
          <button type="button" className="primary-btn">
            + Add Stocks
          </button>
        </section>

        <section className="screener-table">
          <div className="table-row header">
            <span>Symbol</span>
            <span>Signal</span>
            <span>Score</span>
          </div>
          {SAMPLE_RESULTS.map((row) => (
            <button
              key={row.symbol}
              type="button"
              className="table-row data"
              onClick={() => handleRowClick(row.symbol)}
            >
              <span className="symbol">{row.symbol}</span>
              <span className={`signal ${getSignalClass(row.signal)}`}>
                {row.signal}
              </span>
              <span className="score">{row.score}</span>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
