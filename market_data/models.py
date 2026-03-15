from django.db import models


class Stock(models.Model):
    symbol = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    exchange = models.CharField(max_length=10)

    class Meta:
        ordering = ["symbol"]
        indexes = [
            models.Index(fields=["symbol"]),
            models.Index(fields=["exchange"]),
        ]

    def __str__(self) -> str:
        return f"{self.symbol} ({self.exchange})"


class PriceData(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="prices")
    date = models.DateField()
    open = models.DecimalField(max_digits=20, decimal_places=4)
    high = models.DecimalField(max_digits=20, decimal_places=4)
    low = models.DecimalField(max_digits=20, decimal_places=4)
    close = models.DecimalField(max_digits=20, decimal_places=4)
    volume = models.BigIntegerField()

    class Meta:
        ordering = ["-date"]
        unique_together = ("stock", "date")
        indexes = [
            models.Index(fields=["stock", "date"]),
        ]


class IndicatorData(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="indicators")
    date = models.DateField()
    ema_9 = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    ema_12 = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    ema_20 = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    ema_21 = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    ema_50 = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    ema_200 = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    rsi_14 = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    macd = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    macd_signal = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    vwap = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ("stock", "date")
        indexes = [
            models.Index(fields=["stock", "date"]),
        ]
