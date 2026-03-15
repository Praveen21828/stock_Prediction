from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Iterable

import pandas as pd
import yfinance as yf
from django.db import transaction

from market_data.models import Stock, PriceData, IndicatorData
from ta.trend import EMAIndicator, MACD
from ta.momentum import RSIIndicator
from ta.volume import VolumeWeightedAveragePrice


@dataclass
class PriceIngestResult:
    inserted: int
    updated: int


def fetch_price_history(symbol: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    ticker = yf.Ticker(symbol)
    history = ticker.history(period=period, interval=interval)
    if history.empty:
        return pd.DataFrame()
    history = history.rename(
        columns={
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        }
    )
    history.index = history.index.tz_localize(None)
    history = history.reset_index().rename(columns={"Date": "date"})
    history["date"] = history["date"].dt.date
    return history[["date", "open", "high", "low", "close", "volume"]]


def upsert_price_history(stock: Stock, history: pd.DataFrame) -> PriceIngestResult:
    inserted = 0
    updated = 0
    if history.empty:
        return PriceIngestResult(inserted=0, updated=0)

    with transaction.atomic():
        for _, row in history.iterrows():
            obj, created = PriceData.objects.update_or_create(
                stock=stock,
                date=row["date"],
                defaults={
                    "open": row["open"],
                    "high": row["high"],
                    "low": row["low"],
                    "close": row["close"],
                    "volume": int(row["volume"]),
                },
            )
            if created:
                inserted += 1
            else:
                updated += 1
    return PriceIngestResult(inserted=inserted, updated=updated)


def compute_indicators(prices: Iterable[PriceData]) -> pd.DataFrame:
    if not prices:
        return pd.DataFrame()
    data = pd.DataFrame(
        [
            {
                "date": p.date,
                "open": float(p.open),
                "high": float(p.high),
                "low": float(p.low),
                "close": float(p.close),
                "volume": float(p.volume),
            }
            for p in prices
        ]
    ).sort_values("date")

    data["ema_9"] = EMAIndicator(data["close"], window=9).ema_indicator()
    data["ema_12"] = EMAIndicator(data["close"], window=12).ema_indicator()
    data["ema_20"] = EMAIndicator(data["close"], window=20).ema_indicator()
    data["ema_21"] = EMAIndicator(data["close"], window=21).ema_indicator()
    data["ema_50"] = EMAIndicator(data["close"], window=50).ema_indicator()
    data["ema_200"] = EMAIndicator(data["close"], window=200).ema_indicator()

    data["rsi_14"] = RSIIndicator(data["close"], window=14).rsi()

    macd = MACD(close=data["close"], window_slow=26, window_fast=12, window_sign=9)
    data["macd"] = macd.macd()
    data["macd_signal"] = macd.macd_signal()

    vwap = VolumeWeightedAveragePrice(
        high=data["high"],
        low=data["low"],
        close=data["close"],
        volume=data["volume"],
        window=14,
    )
    data["vwap"] = vwap.volume_weighted_average_price()

    return data


def upsert_indicators(stock: Stock, data: pd.DataFrame) -> int:
    if data.empty:
        return 0
    count = 0
    with transaction.atomic():
        for _, row in data.iterrows():
            _, created = IndicatorData.objects.update_or_create(
                stock=stock,
                date=row["date"],
                defaults={
                    "ema_9": row.get("ema_9"),
                    "ema_12": row.get("ema_12"),
                    "ema_20": row.get("ema_20"),
                    "ema_21": row.get("ema_21"),
                    "ema_50": row.get("ema_50"),
                    "ema_200": row.get("ema_200"),
                    "rsi_14": row.get("rsi_14"),
                    "macd": row.get("macd"),
                    "macd_signal": row.get("macd_signal"),
                    "vwap": row.get("vwap"),
                },
            )
            if created:
                count += 1
    return count


def latest_price(stock: Stock) -> PriceData | None:
    return stock.prices.order_by("-date").first()


def latest_indicator(stock: Stock) -> IndicatorData | None:
    return stock.indicators.order_by("-date").first()
