from django.db import models

from market_data.models import Stock


class FundamentalData(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="fundamentals")
    pe = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    eps = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    roe = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    debt_equity = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    revenue_growth = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    sector = models.CharField(max_length=100, null=True, blank=True)
    updated_at = models.DateField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["stock"]),
            models.Index(fields=["sector"]),
        ]
