from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd
from django.db import transaction

from fundamentals.models import FundamentalData
from market_data.models import Stock


@dataclass
class FundamentalIngestResult:
    inserted: int
    updated: int


def upsert_fundamentals(stock: Stock, payload: dict) -> FundamentalIngestResult:
    obj, created = FundamentalData.objects.update_or_create(
        stock=stock,
        defaults={
            "pe": payload.get("pe"),
            "eps": payload.get("eps"),
            "roe": payload.get("roe"),
            "debt_equity": payload.get("debt_equity"),
            "revenue_growth": payload.get("revenue_growth"),
            "sector": payload.get("sector"),
        },
    )
    return FundamentalIngestResult(inserted=1 if created else 0, updated=0 if created else 1)


def ingest_fundamentals_from_dataframe(data: pd.DataFrame) -> FundamentalIngestResult:
    inserted = 0
    updated = 0
    with transaction.atomic():
        for _, row in data.iterrows():
            stock, _ = Stock.objects.get_or_create(
                symbol=row["symbol"],
                defaults={
                    "name": row.get("name", row["symbol"]),
                    "exchange": row.get("exchange", "NSE"),
                },
            )
            result = upsert_fundamentals(
                stock,
                {
                    "pe": row.get("pe"),
                    "eps": row.get("eps"),
                    "roe": row.get("roe"),
                    "debt_equity": row.get("debt_equity"),
                    "revenue_growth": row.get("revenue_growth"),
                    "sector": row.get("sector"),
                },
            )
            inserted += result.inserted
            updated += result.updated
    return FundamentalIngestResult(inserted=inserted, updated=updated)
