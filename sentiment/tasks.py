from celery import shared_task

from market_data.models import Stock
from sentiment.services import fetch_news_headlines, score_headlines, ingest_sentiment


@shared_task
def update_sentiment(limit: int = 10):
    for stock in Stock.objects.all():
        headlines = fetch_news_headlines(stock.symbol, limit=limit)
        scored = score_headlines(headlines)
        ingest_sentiment(stock, scored)
