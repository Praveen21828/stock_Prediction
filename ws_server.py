"""ws_server.py

Standalone WebSocket server that streams OHLCV candles for NSE/BSE symbols.

Why standalone?
- Your Django backend (in this repo) is currently WSGI/ASGI without Channels.
- You requested *no DB* and a *WebSocket method* for a dynamic chart.

Data source:
- Uses yfinance (public/free, may be delayed).

Protocol (server -> client):
- {"type":"history","symbol":"TCS","exchange":"NSE","timeframe":"5m","candles":[...]}  (initial)
- {"type":"update","candle":{...}}                                            (stream)
- {"type":"error","message":"..."}

Client request:
- Connect to: ws://127.0.0.1:8765/?symbol=TCS&exchange=NSE&timeframe=5m

Run:
  python ws_server.py
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

import yfinance as yf
import websockets
from websockets.server import WebSocketServerProtocol


logging.basicConfig(level=logging.INFO, format="[ws] %(message)s")


# In-memory cache (no DB)
_HISTORY_CACHE: Dict[Tuple[str, str, str], Tuple[float, str, List[Dict[str, Any]]]] = {}
_CACHE_TTL_SECONDS = 8.0


@dataclass(frozen=True)
class StreamParams:
    symbol: str
    exchange: str
    timeframe: str


TF_TO_YF_INTERVAL: Dict[str, str] = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1H": "60m",
    "1D": "1d",
    "1W": "1wk",
}

# yfinance needs a "period" that is compatible with the interval.
TF_TO_PERIOD: Dict[str, str] = {
    "1m": "1d",
    "5m": "5d",
    "15m": "5d",
    "30m": "1mo",
    "1H": "1mo",
    "1D": "6mo",
    "1W": "2y",
}


def to_yf_ticker(symbol: str, exchange: str) -> str:
    """Map a plain symbol (e.g. TCS) + exchange to yfinance ticker."""
    sym = (symbol or "").strip().upper()
    ex = (exchange or "NSE").strip().upper()

    if not sym:
        raise ValueError("Missing symbol")

    # If user already provided a suffix, keep it.
    if sym.endswith(".NS") or sym.endswith(".BO"):
        return sym

    if ex in {"NSE", "NS"}:
        return f"{sym}.NS"
    if ex in {"BSE", "BO"}:
        return f"{sym}.BO"

    raise ValueError(f"Unsupported exchange: {exchange!r} (use NSE or BSE)")


def _row_to_candle(ts: Any, row: Any) -> Optional[Dict[str, Any]]:
    try:
        # yfinance index can be pandas.Timestamp
        if hasattr(ts, "to_pydatetime"):
            dt = ts.to_pydatetime()
        elif isinstance(ts, datetime):
            dt = ts
        else:
            return None

        # Lightweight-charts expects seconds.
        epoch_sec = int(dt.timestamp())
        o = float(row["Open"])
        h = float(row["High"])
        l = float(row["Low"])
        c = float(row["Close"])
        v = float(row.get("Volume", 0) or 0)
        if any(map(lambda x: x != x, (o, h, l, c))):
            return None
        return {
            "time": epoch_sec,
            "open": o,
            "high": h,
            "low": l,
            "close": c,
            "volume": v,
        }
    except Exception:
        return None


async def fetch_history(params: StreamParams) -> Tuple[str, List[Dict[str, Any]]]:
    yf_interval = TF_TO_YF_INTERVAL.get(params.timeframe, "5m")
    period = TF_TO_PERIOD.get(params.timeframe, "5d")
    yf_ticker = to_yf_ticker(params.symbol, params.exchange)

    cache_key = (yf_ticker, yf_interval, period)
    now = asyncio.get_running_loop().time()
    cached = _HISTORY_CACHE.get(cache_key)
    if cached:
        ts_cached, cached_ticker, cached_candles = cached
        if now - ts_cached <= _CACHE_TTL_SECONDS and cached_candles:
            return cached_ticker, cached_candles

    def _download() -> Any:
        t = yf.Ticker(yf_ticker)
        return t.history(period=period, interval=yf_interval, auto_adjust=False)

    df = await asyncio.to_thread(_download)
    if df is None or getattr(df, "empty", True):
        raise RuntimeError(f"No data returned for {yf_ticker} ({yf_interval}, {period})")

    candles: List[Dict[str, Any]] = []
    for ts, row in df.iterrows():
        c = _row_to_candle(ts, row)
        if c:
            candles.append(c)

    candles.sort(key=lambda x: x["time"])

    _HISTORY_CACHE[cache_key] = (now, yf_ticker, candles)
    return yf_ticker, candles


async def stream_handler(ws: WebSocketServerProtocol) -> None:
    parsed = urlparse(ws.request.path)
    q = parse_qs(parsed.query)

    params = StreamParams(
        symbol=(q.get("symbol", [""])[0] or "").strip().upper(),
        exchange=(q.get("exchange", ["NSE"])[0] or "NSE").strip().upper(),
        timeframe=(q.get("timeframe", ["5m"])[0] or "5m").strip(),
    )

    poll_seconds = float(q.get("poll", ["5"])[0] or 5)
    poll_seconds = max(2.0, min(30.0, poll_seconds))

    try:
        yf_ticker, candles = await fetch_history(params)
    except Exception as e:
        await ws.send(json.dumps({"type": "error", "message": str(e)}))
        return

    if not candles:
        await ws.send(
            json.dumps(
                {
                    "type": "error",
                    "message": f"No candles after parsing for {params.symbol} {params.exchange}",
                }
            )
        )
        return

    await ws.send(
        json.dumps(
            {
                "type": "history",
                "symbol": params.symbol,
                "exchange": params.exchange,
                "timeframe": params.timeframe,
                "yfTicker": yf_ticker,
                "candles": candles,
            }
        )
    )

    logging.info(
        "connected: %s %s tf=%s (%s) candles=%d poll=%.1fs",
        params.exchange,
        params.symbol,
        params.timeframe,
        yf_ticker,
        len(candles),
        poll_seconds,
    )

    last_time = candles[-1]["time"]
    last_close = candles[-1]["close"]

    while True:
        try:
            await asyncio.sleep(poll_seconds)
            _, next_candles = await fetch_history(params)
            if not next_candles:
                continue
            latest = next_candles[-1]

            # Send update if new candle OR changed close on same candle.
            if latest["time"] > last_time or latest["close"] != last_close:
                last_time = latest["time"]
                last_close = latest["close"]
                await ws.send(json.dumps({"type": "update", "candle": latest}))
        except websockets.ConnectionClosed:
            return
        except Exception as e:
            # Do not kill the connection on transient yfinance errors.
            await ws.send(json.dumps({"type": "error", "message": str(e)}))


async def main() -> None:
    host = "127.0.0.1"
    port = 8765
    logging.info("starting on ws://%s:%d", host, port)
    async with websockets.serve(stream_handler, host, port, ping_interval=20, ping_timeout=20):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

