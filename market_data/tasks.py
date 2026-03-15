from celery import shared_task

from market_data.models import Stock
from market_data.services import fetch_price_history, upsert_price_history, compute_indicators, upsert_indicators


@shared_task
def update_prices(period: str = "6mo", interval: str = "1d"):
    for stock in Stock.objects.all():
        history = fetch_price_history(stock.symbol, period=period, interval=interval)
        upsert_price_history(stock, history)


@shared_task
def update_indicators():
    for stock in Stock.objects.all():
        prices = stock.prices.order_by("date")
        data = compute_indicators(prices)
        upsert_indicators(stock, data)
