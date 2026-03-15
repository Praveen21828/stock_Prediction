from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

import requests
from django.conf import settings
from django.db import transaction
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from market_data.models import Stock
from sentiment.models import NewsSentiment


@dataclass
class SentimentIngestResult:
    inserted: int


def _get_news_api_key() -> str | None:
    return getattr(settings, "NEWS_API_KEY", None) or settings.__dict__.get("NEWS_API_KEY")


def _get_gnews_api_key() -> str | None:
    return getattr(settings, "GNEWS_API_KEY", None) or settings.__dict__.get("GNEWS_API_KEY")


def fetch_news_headlines(symbol: str, limit: int = 10) -> list[dict]:
    api_key = _get_news_api_key()
    gnews_key = _get_gnews_api_key()
    if api_key:
        url = "https://newsapi.org/v2/everything"
        params = {"q": symbol, "language": "en", "pageSize": limit, "apiKey": api_key}
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        return [
            {
                "headline": item["title"],
                "published": item["publishedAt"],
                "source": item.get("source", {}).get("name"),
                "url": item.get("url"),
            }
            for item in response.json().get("articles", [])
        ]
    if gnews_key:
        url = "https://gnews.io/api/v4/search"
        params = {"q": symbol, "lang": "en", "max": limit, "token": gnews_key}
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        return [
            {
                "headline": item["title"],
                "published": item["publishedAt"],
                "source": item.get("source", {}).get("name"),
                "url": item.get("url"),
            }
            for item in response.json().get("articles", [])
        ]
    return []


def score_headlines(headlines: Iterable[dict]) -> list[dict]:
    analyzer = SentimentIntensityAnalyzer()
    scored = []
    for item in headlines:
        polarity = analyzer.polarity_scores(item["headline"]).get("compound", 0)
        scored.append({
            "headline": item["headline"],
            "sentiment_score": polarity,
            "published": item["published"],
            "source": item.get("source"),
            "url": item.get("url"),
        })
    return scored


def ingest_sentiment(stock: Stock, headlines: list[dict]) -> SentimentIngestResult:
    if not headlines:
        return SentimentIngestResult(inserted=0)
    inserted = 0
    with transaction.atomic():
        for item in headlines:
            published = datetime.fromisoformat(item["published"].replace("Z", "+00:00"))
            obj, created = NewsSentiment.objects.get_or_create(
                stock=stock,
                headline=item["headline"],
                published_date=published,
                defaults={
                    "sentiment_score": item["sentiment_score"],
                    "source": item.get("source"),
                    "url": item.get("url"),
                },
            )
            if created:
                inserted += 1
    return SentimentIngestResult(inserted=inserted)
