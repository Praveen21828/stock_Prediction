from django.core.management.base import BaseCommand

from market_data.models import Stock
from market_data.services import compute_indicators, upsert_indicators


class Command(BaseCommand):
    help = "Compute technical indicators for all stocks"

    def handle(self, *args, **options):
        for stock in Stock.objects.all():
            prices = stock.prices.order_by("date")
            data = compute_indicators(prices)
            count = upsert_indicators(stock, data)
            self.stdout.write(self.style.SUCCESS(f"{stock.symbol}: indicators updated {count}"))
