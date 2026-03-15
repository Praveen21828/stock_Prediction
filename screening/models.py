from django.db import models

from market_data.models import Stock


class Prediction(models.Model):
    MODULE_INTRADAY = "intraday"
    MODULE_SWING = "swing"
    MODULE_DELIVERY = "delivery"

    LABEL_BUY = "BUY"
    LABEL_WATCH = "WATCH"
    LABEL_SELL = "SELL"

    MODULE_CHOICES = [
        (MODULE_INTRADAY, "Intraday"),
        (MODULE_SWING, "Swing"),
        (MODULE_DELIVERY, "Delivery"),
    ]

    LABEL_CHOICES = [
        (LABEL_BUY, "Buy"),
        (LABEL_WATCH, "Watch"),
        (LABEL_SELL, "Sell"),
    ]

    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="predictions")
    module_type = models.CharField(max_length=20, choices=MODULE_CHOICES)
    score = models.IntegerField()
    confidence = models.DecimalField(max_digits=6, decimal_places=2)
    label = models.CharField(max_length=10, choices=LABEL_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["stock", "module_type", "created_at"]),
        ]
