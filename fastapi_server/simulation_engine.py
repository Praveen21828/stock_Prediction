"""Real-time price simulation engine.

Two async loops per symbol group:
  1) slow yfinance fetcher (target_price) every ~15s
  2) fast simulation loop (current candle) every ~0.5s

Broadcasts to all websocket clients subscribed to the group.
"""

from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass
from typing import Dict, Optional

from fastapi_server.data_service import fetch_latest_close
from fastapi_server.websocket_manager import WebSocketManager


@dataclass(frozen=True)
class StreamKey:
    symbol: str
    exchange: str
    timeframe: str
    smoothing: float = 0.12
    noise: float = 0.20
    drift: float = 0.00

    def to_group(self) -> str:
        # Group ignores smoothing/noise/drift so multiple clients share one stream per instrument/timeframe.
        return f"{self.exchange}:{self.symbol}:{self.timeframe}"


@dataclass
class CandleState:
    candle_time: int  # unix seconds aligned to minute
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0


def _floor_to_minute(epoch_sec: int) -> int:
    return epoch_sec - (epoch_sec % 60)


class StreamSupervisor:
    def __init__(self, ws_manager: WebSocketManager) -> None:
        self._ws_manager = ws_manager
        self._tasks: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    async def ensure_running(self, key: StreamKey) -> None:
        group = key.to_group()
        async with self._lock:
            if group in self._tasks and not self._tasks[group].done():
                return
            self._tasks[group] = asyncio.create_task(self._run_stream(group=group, key=key))

    async def maybe_stop_if_unused(self, key: StreamKey) -> None:
        group = key.to_group()
        # Give it a short grace window to handle quick reconnects.
        await asyncio.sleep(1.5)
        if await self._ws_manager.group_size(group) > 0:
            return
        async with self._lock:
            t = self._tasks.get(group)
            if t and not t.done():
                t.cancel()
            self._tasks.pop(group, None)

    async def stop_all(self) -> None:
        async with self._lock:
            tasks = list(self._tasks.values())
            self._tasks.clear()
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _run_stream(self, group: str, key: StreamKey) -> None:
        symbol = key.symbol
        exchange = key.exchange

        # Shared state between tasks (protected by a lock)
        state_lock = asyncio.Lock()
        target_price: Optional[float] = None
        current_price: Optional[float] = None
        candle_state: Optional[CandleState] = None

        async def slow_fetcher() -> None:
            nonlocal target_price
            while True:
                try:
                    px = await fetch_latest_close(symbol=symbol, exchange=exchange)
                    if px is not None:
                        async with state_lock:
                            target_price = float(px)
                except Exception:
                    # ignore transient yfinance failures
                    pass
                await asyncio.sleep(15.0)

        async def fast_simulator() -> None:
            nonlocal target_price, current_price, candle_state

            tick_seconds = 0.5
            # conservative clamps
            smoothing = min(0.25, max(0.01, float(key.smoothing)))
            noise_amp = max(0.0, float(key.noise))
            drift = float(key.drift)

            while True:
                now = int(time.time())
                minute = _floor_to_minute(now)

                async with state_lock:
                    # bootstrap
                    if target_price is not None and current_price is None:
                        current_price = float(target_price)

                    if current_price is None:
                        # no target yet; wait
                        pass
                    else:
                        if candle_state is None:
                            candle_state = CandleState(
                                candle_time=minute,
                                open=current_price,
                                high=current_price,
                                low=current_price,
                                close=current_price,
                                volume=0.0,
                            )
                        elif minute > candle_state.candle_time:
                            # new candle
                            prev_close = candle_state.close
                            candle_state = CandleState(
                                candle_time=minute,
                                open=prev_close,
                                high=prev_close,
                                low=prev_close,
                                close=prev_close,
                                volume=0.0,
                            )

                        # smooth move towards target
                        if target_price is not None:
                            current_price += (float(target_price) - current_price) * smoothing

                        # drift + noise
                        current_price += drift
                        if noise_amp > 0:
                            current_price += random.uniform(-noise_amp, noise_amp)

                        # update candle
                        candle_state.close = float(current_price)
                        candle_state.high = max(candle_state.high, candle_state.close)
                        candle_state.low = min(candle_state.low, candle_state.close)
                        candle_state.volume += random.uniform(10, 200)  # simulated volume

                        payload = {
                            "type": "update",
                            "candle": {
                                "time": int(candle_state.candle_time),
                                "open": float(candle_state.open),
                                "high": float(candle_state.high),
                                "low": float(candle_state.low),
                                "close": float(candle_state.close),
                                "volume": float(candle_state.volume),
                            },
                        }

                    # end lock

                if candle_state is not None and current_price is not None:
                    await self._ws_manager.broadcast_json(group, payload)
                await asyncio.sleep(tick_seconds)

        slow_task = asyncio.create_task(slow_fetcher())
        fast_task = asyncio.create_task(fast_simulator())

        try:
            await asyncio.gather(slow_task, fast_task)
        except asyncio.CancelledError:
            slow_task.cancel()
            fast_task.cancel()
            await asyncio.gather(slow_task, fast_task, return_exceptions=True)
            raise

