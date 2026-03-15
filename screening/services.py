from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

from fundamentals.models import FundamentalData
from market_data.models import Stock, PriceData, IndicatorData
from screening.models import Prediction


@dataclass
class ModuleResult:
    score: int
    max_score: int
    label: str
    confidence: Decimal


def _label_for_score(score: int, module: str) -> str:
    if module == Prediction.MODULE_INTRADAY:
        if score >= 5:
            return Prediction.LABEL_BUY
        if score >= 3:
            return Prediction.LABEL_WATCH
        return Prediction.LABEL_SELL
    if module == Prediction.MODULE_SWING:
        if score >= 5:
            return Prediction.LABEL_BUY
        if score >= 3:
            return Prediction.LABEL_WATCH
        return Prediction.LABEL_SELL
    if module == Prediction.MODULE_DELIVERY:
        if score >= 6:
            return Prediction.LABEL_BUY
        if score >= 4:
            return Prediction.LABEL_WATCH
        return Prediction.LABEL_SELL
    return Prediction.LABEL_WATCH


def _confidence(score: int, max_score: int) -> Decimal:
    if max_score <= 0:
        return Decimal("0")
    return (Decimal(score) / Decimal(max_score) * Decimal("100")).quantize(Decimal("0.01"))


def _latest_price(stock: Stock) -> Optional[PriceData]:
    return stock.prices.order_by("-date").first()


def _latest_indicator(stock: Stock) -> Optional[IndicatorData]:
    return stock.indicators.order_by("-date").first()


def _latest_fundamental(stock: Stock) -> Optional[FundamentalData]:
    return stock.fundamentals.order_by("-updated_at").first()


def _sentiment_score(stock: Stock, limit: int = 10) -> float:
    sentiments = list(stock.sentiments.order_by("-published_date")[:limit])
    if not sentiments:
        return 0.0
    return sum(float(s.sentiment_score) for s in sentiments) / len(sentiments)


def _ema_slope_up(stock: Stock) -> bool:
    indicators = list(stock.indicators.order_by("-date")[:2])
    if len(indicators) < 2:
        return False
    latest, previous = indicators[0], indicators[1]
    if latest.ema_9 is None or previous.ema_9 is None:
        return False
    return float(latest.ema_9) > float(previous.ema_9)


def _recent_support_resistance(stock: Stock, lookback: int = 20) -> tuple[float | None, float | None]:
    prices = list(stock.prices.order_by("-date")[:lookback])
    if not prices:
        return None, None
    lows = [float(p.low) for p in prices]
    highs = [float(p.high) for p in prices]
    return min(lows), max(highs)


def _higher_highs_lows(stock: Stock, lookback: int = 5) -> bool:
    prices = list(stock.prices.order_by("-date")[:lookback])
    if len(prices) < 3:
        return False
    prices = list(reversed(prices))
    highs = [float(p.high) for p in prices]
    lows = [float(p.low) for p in prices]
    return highs[-1] > highs[-2] and lows[-1] > lows[-2]


def score_intraday(stock: Stock) -> ModuleResult:
    indicator = _latest_indicator(stock)
    price = _latest_price(stock)
    max_score = 6
    score = 0

    if not indicator or not price:
        label = _label_for_score(score, Prediction.MODULE_INTRADAY)
        return ModuleResult(score=score, max_score=max_score, label=label, confidence=_confidence(score, max_score))

    price_value = float(price.close)
    vwap = float(indicator.vwap) if indicator.vwap is not None else None
    if vwap and price_value > vwap:
        score += 1

    ema9 = float(indicator.ema_9) if indicator.ema_9 is not None else None
    ema21 = float(indicator.ema_21) if indicator.ema_21 is not None else None
    if ema9 and ema21 and ema9 > ema21:
        score += 1

    if _ema_slope_up(stock):
        score += 1

    rsi = float(indicator.rsi_14) if indicator.rsi_14 is not None else None
    if rsi and 55 <= rsi <= 70:
        score += 1

    avg_volume = stock.prices.order_by("-date")[:20].values_list("volume", flat=True)
    if avg_volume:
        avg_vol = sum(avg_volume) / len(avg_volume)
        if price.volume > avg_vol * 1.5:
            score += 1

    support, resistance = _recent_support_resistance(stock)
    if support is not None and resistance is not None:
        near_support = price_value <= support * 1.01
        breakout = price_value >= resistance * 0.99
        if near_support or breakout:
            score += 1

    label = _label_for_score(score, Prediction.MODULE_INTRADAY)
    return ModuleResult(score=score, max_score=max_score, label=label, confidence=_confidence(score, max_score))


def score_swing(stock: Stock) -> ModuleResult:
    indicator = _latest_indicator(stock)
    price = _latest_price(stock)
    max_score = 7
    score = 0

    if not indicator or not price:
        label = _label_for_score(score, Prediction.MODULE_SWING)
        return ModuleResult(score=score, max_score=max_score, label=label, confidence=_confidence(score, max_score))

    ema20 = float(indicator.ema_20) if indicator.ema_20 is not None else None
    ema50 = float(indicator.ema_50) if indicator.ema_50 is not None else None
    if ema20 and ema50 and ema20 > ema50:
        score += 1

    price_value = float(price.close)
    if ema20 and ema50 and price_value > ema20 and price_value > ema50:
        score += 1

    if _higher_highs_lows(stock):
        score += 1

    macd = float(indicator.macd) if indicator.macd is not None else None
    macd_signal = float(indicator.macd_signal) if indicator.macd_signal is not None else None
    if macd and macd_signal and macd > macd_signal:
        score += 1

    rsi = float(indicator.rsi_14) if indicator.rsi_14 is not None else None
    if rsi and rsi > 55:
        score += 1

    avg_volume = stock.prices.order_by("-date")[:20].values_list("volume", flat=True)
    if avg_volume:
        avg_vol = sum(avg_volume) / len(avg_volume)
        if price.volume > avg_vol * 1.2:
            score += 1

    support, resistance = _recent_support_resistance(stock)
    if support is not None and resistance is not None:
        bounce = price_value >= support * 1.01
        breakout = price_value >= resistance * 0.99
        if bounce or breakout:
            score += 1

    label = _label_for_score(score, Prediction.MODULE_SWING)
    return ModuleResult(score=score, max_score=max_score, label=label, confidence=_confidence(score, max_score))


def _fundamental_pass(fundamental: Optional[FundamentalData]) -> int:
    if not fundamental:
        return 0
    score = 0
    if fundamental.pe is not None and fundamental.pe < 25:
        score += 1
    if fundamental.eps is not None and fundamental.eps > 0:
        score += 1
    if fundamental.roe is not None and fundamental.roe > 15:
        score += 1
    if fundamental.debt_equity is not None and fundamental.debt_equity < 1:
        score += 1
    return score


def score_delivery(stock: Stock) -> ModuleResult:
    indicator = _latest_indicator(stock)
    price = _latest_price(stock)
    fundamental = _latest_fundamental(stock)
    sentiment_score = _sentiment_score(stock)
    max_score = 8
    score = 0

    if not indicator or not price:
        label = _label_for_score(score, Prediction.MODULE_DELIVERY)
        return ModuleResult(score=score, max_score=max_score, label=label, confidence=_confidence(score, max_score))

    price_value = float(price.close)
    ema50 = float(indicator.ema_50) if indicator.ema_50 is not None else None
    ema200 = float(indicator.ema_200) if indicator.ema_200 is not None else None
    if ema50 and ema200 and ema50 > ema200:
        score += 1
    if indicator.ema_200 and price_value > float(indicator.ema_200):
        score += 1

    score += 1
    score += 1

    score += _fundamental_pass(fundamental)

    if sentiment_score >= 0:
        score += 1

    label = _label_for_score(score, Prediction.MODULE_DELIVERY)
    return ModuleResult(score=score, max_score=max_score, label=label, confidence=_confidence(score, max_score))


def generate_predictions(stock: Stock) -> list[Prediction]:
    results = []
    for module, scorer in [
        (Prediction.MODULE_INTRADAY, score_intraday),
        (Prediction.MODULE_SWING, score_swing),
        (Prediction.MODULE_DELIVERY, score_delivery),
    ]:
        result = scorer(stock)
        prediction = Prediction.objects.create(
            stock=stock,
            module_type=module,
            score=result.score,
            confidence=result.confidence,
            label=result.label,
        )
        results.append(prediction)
    return results
