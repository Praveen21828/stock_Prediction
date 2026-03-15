from django.contrib import admin

from market_data.models import Stock, PriceData, IndicatorData


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ("symbol", "name", "exchange")
    search_fields = ("symbol", "name")
    list_filter = ("exchange",)


@admin.register(PriceData)
class PriceDataAdmin(admin.ModelAdmin):
    list_display = ("stock", "date", "open", "high", "low", "close", "volume")
    list_filter = ("stock",)
    date_hierarchy = "date"


@admin.register(IndicatorData)
class IndicatorDataAdmin(admin.ModelAdmin):
    list_display = ("stock", "date", "ema_9", "ema_21", "rsi_14", "macd", "vwap")
    list_filter = ("stock",)
    date_hierarchy = "date"
