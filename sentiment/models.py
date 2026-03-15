from django.db import models

from market_data.models import Stock


class NewsSentiment(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="sentiments")
    headline = models.TextField()
    sentiment_score = models.DecimalField(max_digits=6, decimal_places=4)
    published_date = models.DateTimeField()
    source = models.CharField(max_length=200, null=True, blank=True)
    url = models.URLField(max_length=500, null=True, blank=True)

    class Meta:
        ordering = ["-published_date"]
        indexes = [
            models.Index(fields=["stock", "published_date"]),
        ]
