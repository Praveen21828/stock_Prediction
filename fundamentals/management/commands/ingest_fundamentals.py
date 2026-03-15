from django.core.management.base import BaseCommand

import pandas as pd

from fundamentals.services import ingest_fundamentals_from_dataframe


class Command(BaseCommand):
    help = "Ingest fundamentals from a CSV file (screener export)"

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str)

    def handle(self, *args, **options):
        csv_path = options["csv_path"]
        data = pd.read_csv(csv_path)
        result = ingest_fundamentals_from_dataframe(data)
        self.stdout.write(
            self.style.SUCCESS(
                f"Fundamentals: inserted={result.inserted}, updated={result.updated}"
            )
        )
