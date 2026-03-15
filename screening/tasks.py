from celery import shared_task

from market_data.models import Stock
from screening.services import generate_predictions


@shared_task
def run_predictions():
    for stock in Stock.objects.all():
        generate_predictions(stock)
