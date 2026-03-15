from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.response import Response
from rest_framework.views import APIView

from fundamentals.models import FundamentalData
from market_data.models import Stock, PriceData, IndicatorData
from screening.services import score_intraday, score_swing, score_delivery
from sentiment.models import NewsSentiment

from api.serializers import (
    StockSerializer,
    PriceDataSerializer,
    IndicatorDataSerializer,
    FundamentalDataSerializer,
    NewsSentimentSerializer,
)


class StockListAPIView(APIView):
    @method_decorator(cache_page(60))
    def get(self, request):
        stocks = Stock.objects.all()
        serializer = StockSerializer(stocks, many=True)
        return Response(serializer.data)


class StockDetailAPIView(APIView):
    @method_decorator(cache_page(60))
    def get(self, request, symbol: str):
        stock = get_object_or_404(Stock, symbol=symbol.upper())
        serializer = StockSerializer(stock)
        return Response(serializer.data)


class StockHistoryAPIView(APIView):
    def get(self, request, symbol: str):
        stock = get_object_or_404(Stock, symbol=symbol.upper())
        prices = stock.prices.order_by("-date")[:200]
        serializer = PriceDataSerializer(prices, many=True)
        return Response({"symbol": stock.symbol, "history": serializer.data})


class StockIndicatorAPIView(APIView):
    def get(self, request, symbol: str):
        stock = get_object_or_404(Stock, symbol=symbol.upper())
        indicators = stock.indicators.order_by("-date")[:200]
        serializer = IndicatorDataSerializer(indicators, many=True)
        return Response({"symbol": stock.symbol, "indicators": serializer.data})


class StockFundamentalsAPIView(APIView):
    def get(self, request, symbol: str):
        stock = get_object_or_404(Stock, symbol=symbol.upper())
        fundamentals = stock.fundamentals.order_by("-updated_at").first()
        serializer = FundamentalDataSerializer(fundamentals)
        return Response({"symbol": stock.symbol, "fundamentals": serializer.data})


class StockSentimentAPIView(APIView):
    def get(self, request, symbol: str):
        stock = get_object_or_404(Stock, symbol=symbol.upper())
        sentiments = stock.sentiments.order_by("-published_date")[:20]
        serializer = NewsSentimentSerializer(sentiments, many=True)
        return Response({"symbol": stock.symbol, "sentiment": serializer.data})


class StockPredictionAPIView(APIView):
    def get(self, request, symbol: str):
        stock = get_object_or_404(Stock, symbol=symbol.upper())
        intraday = score_intraday(stock)
        swing = score_swing(stock)
        delivery = score_delivery(stock)
        return Response(
            {
                "symbol": stock.symbol,
                "intraday": {"signal": intraday.label, "confidence": float(intraday.confidence)},
                "swing": {"signal": swing.label, "confidence": float(swing.confidence)},
                "delivery": {"signal": delivery.label, "confidence": float(delivery.confidence)},
            }
        )


class ScreenerAPIView(APIView):
    def get(self, request):
        stocks = Stock.objects.all().prefetch_related(
            Prefetch("indicators", queryset=IndicatorData.objects.order_by("-date")),
            Prefetch("fundamentals", queryset=FundamentalData.objects.order_by("-updated_at")),
            Prefetch("sentiments", queryset=NewsSentiment.objects.order_by("-published_date")),
        )
        results = []
        for stock in stocks:
            intraday = score_intraday(stock)
            swing = score_swing(stock)
            delivery = score_delivery(stock)
            results.append(
                {
                    "symbol": stock.symbol,
                    "name": stock.name,
                    "exchange": stock.exchange,
                    "intraday": {"signal": intraday.label, "confidence": float(intraday.confidence)},
                    "swing": {"signal": swing.label, "confidence": float(swing.confidence)},
                    "delivery": {"signal": delivery.label, "confidence": float(delivery.confidence)},
                }
            )
        return Response(results)
