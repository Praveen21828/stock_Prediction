from django.urls import path

from api.views import (
    StockListAPIView,
    StockDetailAPIView,
    StockHistoryAPIView,
    StockIndicatorAPIView,
    StockFundamentalsAPIView,
    StockSentimentAPIView,
    StockPredictionAPIView,
    ScreenerAPIView,
)


urlpatterns = [
    path("stocks", StockListAPIView.as_view(), name="stock-list"),
    path("stocks/<str:symbol>", StockDetailAPIView.as_view(), name="stock-detail"),
    path("stocks/<str:symbol>/history", StockHistoryAPIView.as_view(), name="stock-history"),
    path("stocks/<str:symbol>/indicators", StockIndicatorAPIView.as_view(), name="stock-indicators"),
    path("stocks/<str:symbol>/fundamentals", StockFundamentalsAPIView.as_view(), name="stock-fundamentals"),
    path("stocks/<str:symbol>/sentiment", StockSentimentAPIView.as_view(), name="stock-sentiment"),
    path("stocks/<str:symbol>/prediction", StockPredictionAPIView.as_view(), name="stock-prediction"),
    path("screener", ScreenerAPIView.as_view(), name="screener"),
]
