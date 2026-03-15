from django.contrib import admin

from fundamentals.models import FundamentalData


@admin.register(FundamentalData)
class FundamentalDataAdmin(admin.ModelAdmin):
    list_display = ("stock", "pe", "eps", "roe", "debt_equity", "revenue_growth", "sector")
    list_filter = ("sector",)
    search_fields = ("stock__symbol", "stock__name")
