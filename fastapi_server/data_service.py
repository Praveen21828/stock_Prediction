"""yfinance data service.

Rules:
  - Never call yfinance in the fast simulation loop.
  - All yfinance calls run via asyncio.to_thread.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import yfinance as yf


TF_TO_YF_INTERVAL = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "60m",
    "1H": "60m",
    "1d": "1d",
    "1D": "1d",
}

TF_TO_PERIOD = {
    "1m": "1d",
    "5m": "5d",
    "15m": "5d",
    "30m": "1mo",
    "1h": "1mo",
    "1H": "1mo",
    "1d": "6mo",
    "1D": "6mo",
}


def to_yf_ticker(symbol: str, exchange: str) -> str:
    sym = (symbol or "").strip().upper()
    ex = (exchange or "NSE").strip().upper()
    if not sym:
        raise ValueError("Missing symbol")
    if sym.endswith(".NS") or sym.endswith(".BO"):
        return sym
    if ex in {"NSE", "NS"}:
        return f"{sym}.NS"
    if ex in {"BSE", "BO"}:
        return f"{sym}.BO"
    raise ValueError(f"Unsupported exchange: {exchange!r} (use NSE or BSE)")


def _row_to_candle(ts: Any, row: Any) -> Optional[Dict[str, Any]]:
    try:
        if hasattr(ts, "to_pydatetime"):
            dt = ts.to_pydatetime()
        elif isinstance(ts, datetime):
            dt = ts
        else:
            return None
        epoch_sec = int(dt.timestamp())
        o = float(row["Open"])
        h = float(row["High"])
        l = float(row["Low"])
        c = float(row["Close"])
        v = float(row.get("Volume", 0) or 0)
        if any(map(lambda x: x != x, (o, h, l, c))):
            return None
        return {"time": epoch_sec, "open": o, "high": h, "low": l, "close": c, "volume": v}
    except Exception:
        return None


async def fetch_history_candles(symbol: str, exchange: str, timeframe: str) -> List[Dict[str, Any]]:
    tf = (timeframe or "1m").strip()
    yf_interval = TF_TO_YF_INTERVAL.get(tf, "1m")
    period = TF_TO_PERIOD.get(tf, "1d")
    yf_ticker = to_yf_ticker(symbol, exchange)

    def _download() -> Any:
        t = yf.Ticker(yf_ticker)
        return t.history(period=period, interval=yf_interval, auto_adjust=False)

    df = await asyncio.to_thread(_download)
    if df is None or getattr(df, "empty", True):
        return []

    candles: List[Dict[str, Any]] = []
    for ts, row in df.iterrows():
        c = _row_to_candle(ts, row)
        if c:
            candles.append(c)
    candles.sort(key=lambda x: x["time"])
    return candles


async def fetch_latest_close(symbol: str, exchange: str) -> Optional[float]:
    """Fetch latest close as the 'target price'. Uses 1m/1d."""
    yf_ticker = to_yf_ticker(symbol, exchange)

    def _download() -> Any:
        t = yf.Ticker(yf_ticker)
        df = t.history(period="1d", interval="1m", auto_adjust=False)
        return df

    df = await asyncio.to_thread(_download)
    if df is None or getattr(df, "empty", True):
        return None
    # last row close
    try:
        last = df.iloc[-1]
        return float(last["Close"])
    except Exception:
        return None

