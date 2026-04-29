from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass
from typing import Dict, Optional

from .data_service import DataService


def _minute_bucket(ts: float) -> int:
    return int(ts // 60) * 60


@dataclass
class SimulationConfig:
    tick_seconds: float = 0.5
    smoothing_factor: float = 0.12
    noise_abs: float = 0.2
    trend_bias: float = 0.0


class SimulationEngine:
    def __init__(self, data_service: DataService, config: Optional[SimulationConfig] = None) -> None:
        self.data_service = data_service
        self.config = config or SimulationConfig()
        self._lock = asyncio.Lock()

        self.current_price: Optional[float] = None
        self.target_price: Optional[float] = None

        self.open_price: Optional[float] = None
        self.high_price: Optional[float] = None
        self.low_price: Optional[float] = None
        self.current_candle_time: Optional[int] = None

    async def set_symbol(self, symbol: str, exchange: str) -> None:
        await self.data_service.set_symbol(symbol, exchange)

    async def snapshot(self) -> Optional[Dict[str, float]]:
        async with self._lock:
            if self.current_candle_time is None or self.open_price is None:
                return None
            return {
                "time": int(self.current_candle_time),
                "open": float(self.open_price),
                "high": float(self.high_price),
                "low": float(self.low_price),
                "close": float(self.current_price),
                "volume": float(random.randint(1200, 8000)),
            }

    async def run(self, stop_event: asyncio.Event) -> None:
        while not stop_event.is_set():
            target = await self.data_service.get_target_price()
            now = time.time()
            minute = _minute_bucket(now)

            async with self._lock:
                if target is not None:
                    self.target_price = target

                # bootstrap
                if self.current_price is None:
                    seed = self.target_price if self.target_price is not None else 2500.0
                    self.current_price = float(seed)
                    self.current_candle_time = minute
                    self.open_price = self.current_price
                    self.high_price = self.current_price
                    self.low_price = self.current_price

                # new 1m candle rollover
                if self.current_candle_time is None or minute > self.current_candle_time:
                    prev_close = float(self.current_price)
                    self.current_candle_time = minute
                    self.open_price = prev_close
                    self.high_price = prev_close
                    self.low_price = prev_close

                # smooth convergence + noise + tiny trend
                target_for_step = self.target_price if self.target_price is not None else self.current_price
                self.current_price += (target_for_step - self.current_price) * self.config.smoothing_factor
                self.current_price += random.uniform(-self.config.noise_abs, self.config.noise_abs)
                self.current_price += self.config.trend_bias

                # update candle bounds
                self.high_price = max(float(self.high_price), float(self.current_price))
                self.low_price = min(float(self.low_price), float(self.current_price))

            try:
                await asyncio.wait_for(stop_event.wait(), timeout=self.config.tick_seconds)
            except asyncio.TimeoutError:
                continue

