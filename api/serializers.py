from rest_framework import serializers

from fundamentals.models import FundamentalData
from market_data.models import Stock, PriceData, IndicatorData
from screening.models import Prediction
from sentiment.models import NewsSentiment


class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ("symbol", "name", "exchange")


class PriceDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceData
        fields = ("date", "open", "high", "low", "close", "volume")


class IndicatorDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndicatorData
        fields = (
            "date",
            "ema_9",
            "ema_12",
            "ema_20",
            "ema_21",
            "ema_50",
            "ema_200",
            "rsi_14",
            "macd",
            "macd_signal",
            "vwap",
        )


class FundamentalDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundamentalData
        fields = ("pe", "eps", "roe", "debt_equity", "revenue_growth", "sector", "updated_at")


class NewsSentimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsSentiment
        fields = ("headline", "sentiment_score", "published_date", "source", "url")


class PredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prediction
        fields = ("module_type", "score", "confidence", "label", "created_at")
