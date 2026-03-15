from django.core.management.base import BaseCommand

from market_data.models import Stock
from screening.services import generate_predictions


class Command(BaseCommand):
    help = "Generate predictions for all stocks"

    def handle(self, *args, **options):
        for stock in Stock.objects.all():
            generate_predictions(stock)
            self.stdout.write(self.style.SUCCESS(f"{stock.symbol}: predictions generated"))
