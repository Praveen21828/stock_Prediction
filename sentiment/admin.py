from django.contrib import admin

from sentiment.models import NewsSentiment


@admin.register(NewsSentiment)
class NewsSentimentAdmin(admin.ModelAdmin):
    list_display = ("stock", "sentiment_score", "published_date", "source")
    list_filter = ("source",)
    search_fields = ("stock__symbol", "headline")
    date_hierarchy = "published_date"
