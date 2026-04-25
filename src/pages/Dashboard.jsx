import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import "../styles/dashboard.css";
import WatchlistManager from "../components/WatchlistManager";
import LiveCandleChart from "../components/LiveCandleChart";
import { getJSON } from "../api/client";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Screener", to: "/screener" },
  { label: "Stock Detail", to: "/stock-details" },
  { label: "News", to: "/news" },
];
const TIMEFRAMES = ["5m", "15m", "1D", "1W"];

const SAMPLE_STOCKS = [
  { symbol: "TCS", price: 3925.25, change: -1.01, open: 3948.1 },
  { symbol: "TATASTEEL", price: 126.35, change: 2.1, open: 123.6 },
  { symbol: "HCL", price: 1598.4, change: -0.5, open: 1604.1 },
  { symbol: "ITC", price: 412.85, change: 3.15, open: 401.2 },
  { symbol: "TATACAP", price: 757.9, change: -1.5, open: 770.2 },
  { symbol: "INFY", price: 1652.1, change: 0.65, open: 1641.8 },
  { symbol: "RELIANCE", price: 2865.7, change: 1.2, open: 2833.3 },
  { symbol: "HDFCBANK", price: 1520.4, change: -0.45, open: 1531.9 },
  { symbol: "ICICIBANK", price: 1025.3, change: 1.1, open: 1012.6 },
  { symbol: "AXISBANK", price: 1084.2, change: 0.35, open: 1076.3 },
  { symbol: "SUNPHARMA", price: 1410.9, change: -0.75, open: 1422.4 },
  { symbol: "CIPLA", price: 1213.4, change: 0.55, open: 1206.2 },
  { symbol: "WIPRO", price: 518.7, change: -0.2, open: 520.1 },
  { symbol: "SBIN", price: 760.5, change: 1.85, open: 747.8 },
  { symbol: "KOTAKBANK", price: 1872.9, change: 0.4, open: 1861.3 },
  { symbol: "TITAN", price: 3242.6, change: -0.62, open: 3260.4 },
];

const DEFAULT_WATCHLISTS = [
  {
    id: "watchlist-1",
    name: "Bank",
    symbols: ["HDFCBANK", "ICICIBANK", "AXISBANK", "SBIN", "KOTAKBANK"],
  },
  { id: "watchlist-2", name: "IT", symbols: ["TCS", "INFY", "HCL", "WIPRO"] },
  { id: "watchlist-3", name: "Pharma", symbols: ["SUNPHARMA", "CIPLA"] },
  { id: "watchlist-4", name: "Auto", symbols: ["TATACAP", "TITAN"] },
];

const DEFAULT_WATCHLIST_NAME = "Watchlist";
const STORAGE_KEY = "stock-dashboard-watchlists";
const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 520;
const DEFAULT_SIDEBAR_WIDTH = 360;

const FLASH_DURATION = 800;

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState(SAMPLE_STOCKS[0]);
  const [timeframe, setTimeframe] = useState("1D");
  const [exchange, setExchange] = useState("NSE");
  const [watchlists, setWatchlists] = useState(DEFAULT_WATCHLISTS);
  const [activeWatchlistId, setActiveWatchlistId] = useState(
    DEFAULT_WATCHLISTS[0].id
  );
  const [stocks, setStocks] = useState(SAMPLE_STOCKS);
  const [flashMap, setFlashMap] = useState({});
  const flashTimeouts = useRef({});
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const resizeState = useRef({ isResizing: false, startX: 0, startWidth: 0 });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setWatchlists(parsed);
        setActiveWatchlistId(parsed[0]?.id ?? DEFAULT_WATCHLISTS[0].id);
      }
    } catch (error) {
      console.error("Failed to parse watchlists", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlists));
  }, [watchlists]);

  useEffect(() => {
    let isMounted = true;
    getJSON("/api/stocks")
      .then((data) => {
        if (!isMounted || !Array.isArray(data)) return;
        const mapped = data.map((item) => ({
          symbol: item.symbol,
          price: 0,
          change: 0,
          open: 0,
        }));
        if (mapped.length) {
          setStocks(mapped);
          setSelectedStock(mapped[0]);
        }
      })
      .catch(() => {
        // keep sample data on error
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedStock?.symbol) return;
    let isMounted = true;
    getJSON(`/api/stocks/${selectedStock.symbol}/prediction`)
      .then((data) => {
        if (!isMounted || !data) return;
        setSignals({
          intraday: {
            label: data.intraday?.signal || "WATCH",
            confidence: Math.round(data.intraday?.confidence ?? 0),
          },
          swing: {
            label: data.swing?.signal || "WATCH",
            confidence: Math.round(data.swing?.confidence ?? 0),
          },
          delivery: {
            label: data.delivery?.signal || "WATCH",
            confidence: Math.round(data.delivery?.confidence ?? 0),
          },
        });
      })
      .catch(() => {
        // keep sample data on error
      });
    return () => {
      isMounted = false;
    };
  }, [selectedStock?.symbol]);

  const [signals, setSignals] = useState({
    intraday: { label: "BUY", confidence: 83 },
    swing: { label: "HOLD", confidence: 56 },
    delivery: { label: "BUY", confidence: 78 },
  });

  function getStockBySymbol(symbol) {
    return (
      stocks.find((stock) => stock.symbol === symbol) ||
      stocks[0]
    );
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setStocks((prev) =>
        prev.map((stock) => {
          const delta = (Math.random() - 0.5) * 0.6;
          const price = Math.max(stock.price + delta, 1);
          const open = stock.open || price;
          const change = open ? ((price - open) / open) * 100 : 0;
          return { ...stock, price, change, open };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setFlashMap((prev) => {
      const next = { ...prev };
      stocks.forEach((stock) => {
        const previousPrice = prev[`${stock.symbol}-price`];
        if (typeof previousPrice === "number" && previousPrice !== stock.price) {
          const direction = stock.price > previousPrice ? "up" : "down";
          next[stock.symbol] = direction;
          if (flashTimeouts.current[stock.symbol]) {
            clearTimeout(flashTimeouts.current[stock.symbol]);
          }
          flashTimeouts.current[stock.symbol] = setTimeout(() => {
            setFlashMap((current) => {
              const cleared = { ...current };
              delete cleared[stock.symbol];
              return cleared;
            });
          }, FLASH_DURATION);
        }
        next[`${stock.symbol}-price`] = stock.price;
      });
      return next;
    });
  }, [stocks]);

  useEffect(() => {
    return () => {
      Object.values(flashTimeouts.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  useEffect(() => {
    function handleMouseMove(event) {
      if (!resizeState.current.isResizing) return;
      const delta = event.clientX - resizeState.current.startX;
      const nextWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, resizeState.current.startWidth + delta)
      );
      setSidebarWidth(nextWidth);
    }

    function handleMouseUp() {
      resizeState.current.isResizing = false;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  function handleSelectStock(stock) {
    setSelectedStock(stock);
  }

  function handleSwitchWatchlist(id) {
    setActiveWatchlistId(id);
  }

  function handleAddWatchlist(name) {
    const trimmed = name.trim();
    const nextIndex = watchlists.length + 1;
    const finalName = trimmed || `${DEFAULT_WATCHLIST_NAME} ${nextIndex}`;
    const newWatchlist = {
      id: `watchlist-${Date.now()}`,
      name: finalName,
      symbols: [],
    };
    setWatchlists((prev) => [...prev, newWatchlist]);
    setActiveWatchlistId(newWatchlist.id);
  }

  function handleRenameWatchlist(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setWatchlists((prev) =>
      prev.map((list) => (list.id === id ? { ...list, name: trimmed } : list))
    );
  }

  function handleDeleteWatchlist(id) {
    if (watchlists.length === 1) return;
    setWatchlists((prev) => prev.filter((list) => list.id !== id));
    if (activeWatchlistId === id) {
      const fallback = watchlists.find((list) => list.id !== id);
      if (fallback) setActiveWatchlistId(fallback.id);
    }
  }

  function handleAddSymbolToWatchlist(id, symbol) {
    const trimmed = symbol.trim().toUpperCase();
    if (!trimmed) return;
    setWatchlists((prev) =>
      prev.map((list) => {
        if (list.id !== id) return list;
        if (list.symbols.includes(trimmed)) return list;
        return { ...list, symbols: [...list.symbols, trimmed] };
      })
    );
  }

  function handleRemoveSymbolFromWatchlist(id, symbol) {
    setWatchlists((prev) =>
      prev.map((list) =>
        list.id === id
          ? { ...list, symbols: list.symbols.filter((item) => item !== symbol) }
          : list
      )
    );
  }

  function handleMoveSymbolBetweenWatchlists(fromId, toId, symbol) {
    if (fromId === toId) return;
    setWatchlists((prev) =>
      prev.map((list) => {
        if (list.id === fromId) {
          return {
            ...list,
            symbols: list.symbols.filter((item) => item !== symbol),
          };
        }
        if (list.id === toId) {
          if (list.symbols.includes(symbol)) return list;
          return { ...list, symbols: [...list.symbols, symbol] };
        }
        return list;
      })
    );
  }

  function handleReorderSymbol(id, draggedSymbol, targetSymbol) {
    if (!draggedSymbol || !targetSymbol || draggedSymbol === targetSymbol) return;
    setWatchlists((prev) =>
      prev.map((list) => {
        if (list.id !== id) return list;
        const nextSymbols = [...list.symbols];
        const fromIndex = nextSymbols.indexOf(draggedSymbol);
        const toIndex = nextSymbols.indexOf(targetSymbol);
        if (fromIndex === -1 || toIndex === -1) return list;
        nextSymbols.splice(fromIndex, 1);
        nextSymbols.splice(toIndex, 0, draggedSymbol);
        return { ...list, symbols: nextSymbols };
      })
    );
  }

  function handleSelectSymbol(symbol) {
    const stock = getStockBySymbol(symbol);
    handleSelectStock(stock);
  }

  const allSymbols = useMemo(
    () => stocks.map((stock) => stock.symbol).sort(),
    [stocks]
  );

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

      <main className="content" style={{ "--sidebar-width": `${sidebarWidth}px` }}>
        <aside className="sidebar">
          <WatchlistManager
            watchlists={watchlists}
            activeWatchlistId={activeWatchlistId}
            allSymbols={allSymbols}
            selectedSymbol={selectedStock.symbol}
            getStockBySymbol={getStockBySymbol}
            flashMap={flashMap}
            onSwitchWatchlist={handleSwitchWatchlist}
            onAddWatchlist={handleAddWatchlist}
            onRenameWatchlist={handleRenameWatchlist}
            onDeleteWatchlist={handleDeleteWatchlist}
            onAddSymbol={handleAddSymbolToWatchlist}
            onRemoveSymbol={handleRemoveSymbolFromWatchlist}
            onMoveSymbol={handleMoveSymbolBetweenWatchlists}
            onSelectSymbol={handleSelectSymbol}
            onReorderSymbol={handleReorderSymbol}
          />
        </aside>

        <div
          className="resize-handle"
          role="separator"
          aria-orientation="vertical"
          onMouseDown={(event) => {
            resizeState.current.isResizing = true;
            resizeState.current.startX = event.clientX;
            resizeState.current.startWidth = sidebarWidth;
          }}
        />

        <section className="chart-panel">
          <div className="chart-header">
            <div>
              <h2>
                {selectedStock.symbol} <span>{exchange}</span>
              </h2>
              <p>Live chart (WebSocket)</p>
            </div>
            <div className="timeframes">
              <button
                type="button"
                className={exchange === "NSE" ? "active" : ""}
                onClick={() => setExchange("NSE")}
              >
                NSE
              </button>
              <button
                type="button"
                className={exchange === "BSE" ? "active" : ""}
                onClick={() => setExchange("BSE")}
              >
                BSE
              </button>
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
              <LiveCandleChart
                symbol={selectedStock.symbol}
                exchange={exchange}
                timeframe={timeframe}
              />
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
