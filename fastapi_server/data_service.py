from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Optional

import yfinance as yf


def to_yf_ticker(symbol: str, exchange: str = "NSE") -> str:
    sym = (symbol or "").strip().upper()
    ex = (exchange or "NSE").strip().upper()
    if sym.endswith(".NS") or sym.endswith(".BO"):
        return sym
    if ex in {"NSE", "NS"}:
        return f"{sym}.NS"
    if ex in {"BSE", "BO"}:
        return f"{sym}.BO"
    raise ValueError(f"Unsupported exchange: {exchange}")


@dataclass
class DataService:
    symbol: str = "RELIANCE"
    exchange: str = "NSE"
    interval: str = "1m"
    period: str = "1d"
    fetch_seconds: float = 15.0

    _target_price: Optional[float] = None
    _lock: asyncio.Lock = asyncio.Lock()

    async def set_symbol(self, symbol: str, exchange: str) -> None:
        async with self._lock:
            self.symbol = symbol
            self.exchange = exchange

    async def get_target_price(self) -> Optional[float]:
        async with self._lock:
            return self._target_price

    async def _fetch_close(self) -> Optional[float]:
        ticker = to_yf_ticker(self.symbol, self.exchange)

        def _download():
            return yf.Ticker(ticker).history(period=self.period, interval=self.interval, auto_adjust=False)

        df = await asyncio.to_thread(_download)
        if df is None or getattr(df, "empty", True):
            return None
        close = float(df["Close"].dropna().iloc[-1])
        return close

    async def run(self, stop_event: asyncio.Event) -> None:
        while not stop_event.is_set():
            try:
                close = await self._fetch_close()
                if close is not None:
                    async with self._lock:
                        self._target_price = close
            except Exception:
                # keep running on transient provider/network failures
                pass
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=self.fetch_seconds)
            except asyncio.TimeoutError:
                continue

