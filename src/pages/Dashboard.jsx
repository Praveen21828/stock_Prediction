import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import "../styles/dashboard.css";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Screener", to: "/screener" },
  { label: "Stock Detail", to: "/stock-details" },
  { label: "News", to: "/news" },
];
const TIMEFRAMES = ["5m", "15m", "1D", "1W"];

const SAMPLE_STOCKS = [
  { symbol: "TCS", price: 3925.25, change: -1.01 },
  { symbol: "TATASTEEL", price: 126.35, change: 2.1 },
  { symbol: "HCL", price: 1598.4, change: -0.5 },
  { symbol: "ITC", price: 412.85, change: 3.15 },
  { symbol: "TATACAP", price: 757.9, change: -1.5 },
  { symbol: "INFY", price: 1652.1, change: 0.65 },
  { symbol: "RELIANCE", price: 2865.7, change: 1.2 },
];

const SAMPLE_WATCHLIST = ["TCS", "INFY", "RELIANCE", "HDFCBANK"];

function formatNumber(value) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatChange(value) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function getTrend(value) {
  return value >= 0 ? "up" : "down";
}

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStock, setSelectedStock] = useState(SAMPLE_STOCKS[0]);
  const [timeframe, setTimeframe] = useState("1D");

  const pageSize = 5;

  const filteredStocks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SAMPLE_STOCKS;
    return SAMPLE_STOCKS.filter((stock) =>
      stock.symbol.toLowerCase().includes(normalized)
    );
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / pageSize));
  const pagedStocks = filteredStocks.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const signals = {
    intraday: { label: "BUY", confidence: 83 },
    swing: { label: "HOLD", confidence: 56 },
    delivery: { label: "BUY", confidence: 78 },
  };

  function handleSelectStock(stock) {
    setSelectedStock(stock);
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  }

  return (
    <div className="dashboard">
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

      <main className="content">
        <aside className="sidebar">
          <div className="panel">
            <label className="panel-label" htmlFor="stock-search">
              Search Stock
            </label>
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                id="stock-search"
                type="text"
                placeholder="Search stock (e.g., TCS)"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Watchlist (15/50)</h3>
              <button className="link-btn" type="button">
                + Add
              </button>
            </div>
            <ul className="watchlist">
              {SAMPLE_WATCHLIST.map((symbol) => (
                <li key={symbol}>
                  <button
                    type="button"
                    className="watch-item"
                    onClick={() =>
                      handleSelectStock(
                        SAMPLE_STOCKS.find((stock) => stock.symbol === symbol) ||
                          SAMPLE_STOCKS[0]
                      )
                    }
                  >
                    {symbol}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel table-panel">
            <div className="panel-header">
              <h3>Results ({filteredStocks.length})</h3>
            </div>
            <div className="stock-table">
              <div className="table-row header">
                <span>Symbol</span>
                <span>Price</span>
                <span>% Change</span>
                <span>Trend</span>
              </div>
              {pagedStocks.map((stock) => {
                const trend = getTrend(stock.change);
                return (
                  <button
                    key={stock.symbol}
                    type="button"
                    className={`table-row data ${
                      selectedStock.symbol === stock.symbol ? "selected" : ""
                    }`}
                    onClick={() => handleSelectStock(stock)}
                  >
                    <span className="symbol">{stock.symbol}</span>
                    <span>{formatNumber(stock.price)}</span>
                    <span className={`change ${trend}`}>
                      {formatChange(stock.change)}
                    </span>
                    <span className={`trend ${trend}`}>
                      {trend === "up" ? "▲" : "▼"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pagination">
            <button type="button" onClick={() => handlePageChange(page - 1)}>
              ◀
            </button>
            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  className={pageNumber === page ? "active" : ""}
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button type="button" onClick={() => handlePageChange(page + 1)}>
              ▶
            </button>
            <button type="button" className="add-page">
              +
            </button>
          </div>
        </aside>

        <section className="chart-panel">
          <div className="chart-header">
            <div>
              <h2>
                {selectedStock.symbol} <span>NSE</span>
              </h2>
              <p>Trading view chart</p>
            </div>
            <div className="timeframes">
              {TIMEFRAMES.map((frame) => (
                <button
                  key={frame}
                  type="button"
                  className={frame === timeframe ? "active" : ""}
                  onClick={() => setTimeframe(frame)}
                >
                  {frame}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-body">
            <div className="chart-placeholder">
              <div className="candles">
                {Array.from({ length: 20 }).map((_, index) => (
                  <span
                    key={index}
                    className={`candle ${index % 3 === 0 ? "down" : "up"}`}
                    style={{ height: `${30 + (index % 7) * 6}px` }}
                  />
                ))}
              </div>
              <p>Candlestick Chart Area</p>
            </div>
          </div>

          <div className="signal-badges">
            <div className="signal intraday">
              ⚡ Intraday: {signals.intraday.label} ({signals.intraday.confidence}%
              )
            </div>
            <div className="signal swing">
              〰️ Swing: {signals.swing.label} ({signals.swing.confidence}%)
            </div>
            <div className="signal delivery">
              🛡️ Delivery: {signals.delivery.label} ({signals.delivery.confidence}%
              )
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
