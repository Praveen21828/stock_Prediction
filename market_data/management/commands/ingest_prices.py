from django.core.management.base import BaseCommand

from market_data.models import Stock
from market_data.services import fetch_price_history, upsert_price_history


class Command(BaseCommand):
    help = "Ingest price history for all stocks using yfinance"

    def add_arguments(self, parser):
        parser.add_argument("--period", default="6mo")
        parser.add_argument("--interval", default="1d")

    def handle(self, *args, **options):
        period = options["period"]
        interval = options["interval"]
        for stock in Stock.objects.all():
            history = fetch_price_history(stock.symbol, period=period, interval=interval)
            result = upsert_price_history(stock, history)
            self.stdout.write(
                self.style.SUCCESS(
                    f"{stock.symbol}: inserted={result.inserted}, updated={result.updated}"
                )
            )
