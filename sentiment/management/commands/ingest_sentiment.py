from django.core.management.base import BaseCommand

from market_data.models import Stock
from sentiment.services import fetch_news_headlines, score_headlines, ingest_sentiment


class Command(BaseCommand):
    help = "Fetch and ingest news sentiment for all stocks"

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=10)

    def handle(self, *args, **options):
        limit = options["limit"]
        for stock in Stock.objects.all():
            headlines = fetch_news_headlines(stock.symbol, limit=limit)
            scored = score_headlines(headlines)
            result = ingest_sentiment(stock, scored)
            self.stdout.write(self.style.SUCCESS(f"{stock.symbol}: sentiment added {result.inserted}"))
