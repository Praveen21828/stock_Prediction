# Stock Screening Backend (Django)

## Architecture Overview

This backend is a modular Django REST system that powers the NSE/BSE stock screening UI. It follows a clean separation by domain:

- **market_data**: stock master + price history + technical indicators
- **fundamentals**: financial ratios and sector metadata
- **sentiment**: news ingestion + VADER sentiment scoring
- **screening**: rule-based scoring and predictions for intraday/swing/delivery
- **api**: REST endpoints used by the React frontend

Core configuration lives in [`backend/core/settings.py`](backend/core/settings.py:1) and routes in [`backend/core/urls.py`](backend/core/urls.py:1).

## Data Flow (End-to-End)

1. **Price Ingestion** → pulls OHLCV from yfinance into [`market_data/PriceData`](market_data/models.py:20).
2. **Indicator Engine** → computes EMA/RSI/MACD/VWAP into [`market_data/IndicatorData`](market_data/models.py:44).
3. **Fundamentals** → CSV import into [`fundamentals/FundamentalData`](fundamentals/models.py:6).
4. **News Sentiment** → headlines + VADER into [`sentiment/NewsSentiment`](sentiment/models.py:6).
5. **Rule Engine** → intraday/swing/delivery scoring in [`screening/services.py`](screening/services.py:1).
6. **REST API** → aggregated responses in [`api/views.py`](api/views.py:1).

## Key Modules

### market_data
- Models: [`Stock`](market_data/models.py:6), [`PriceData`](market_data/models.py:20), [`IndicatorData`](market_data/models.py:44)
- Services: ingestion + indicator computation in [`market_data/services.py`](market_data/services.py:1)
- Commands: [`ingest_prices`](market_data/management/commands/ingest_prices.py:1), [`calc_indicators`](market_data/management/commands/calc_indicators.py:1)

### fundamentals
- Model: [`FundamentalData`](fundamentals/models.py:6)
- Services: CSV ingest in [`fundamentals/services.py`](fundamentals/services.py:1)
- Command: [`ingest_fundamentals`](fundamentals/management/commands/ingest_fundamentals.py:1)

### sentiment
- Model: [`NewsSentiment`](sentiment/models.py:6)
- Services: news fetch + VADER scoring in [`sentiment/services.py`](sentiment/services.py:1)
- Command: [`ingest_sentiment`](sentiment/management/commands/ingest_sentiment.py:1)

### screening
- Model: [`Prediction`](screening/models.py:6)
- Rule engine: intraday/swing/delivery scoring in [`screening/services.py`](screening/services.py:1)
- Command: [`score_predictions`](screening/management/commands/score_predictions.py:1)

### api
- Serializers: [`api/serializers.py`](api/serializers.py:1)
- Views: [`api/views.py`](api/views.py:1)
- Routes: [`api/urls.py`](api/urls.py:1)

## Setup

1. Create and activate venv (already created in `backend/.venv`).
2. Configure database and API keys in `.env`.

```
DB_ENGINE=django.db.backends.postgresql
DB_NAME=stock_prediction
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
```

3. Run migrations:

```
backend\.venv\Scripts\python.exe backend\manage.py makemigrations
backend\.venv\Scripts\python.exe backend\manage.py migrate
```

4. Create a superuser (optional):

```
backend\.venv\Scripts\python.exe backend\manage.py createsuperuser
```

## Data Ingestion Commands

- Ingest prices (yfinance):

```
backend\.venv\Scripts\python.exe backend\manage.py ingest_prices --period 6mo --interval 1d
```

- Compute indicators:

```
backend\.venv\Scripts\python.exe backend\manage.py calc_indicators
```

- Ingest fundamentals from CSV (Screener export):

```
backend\.venv\Scripts\python.exe backend\manage.py ingest_fundamentals path\to\fundamentals.csv
```

- Fetch and score sentiment:

```
backend\.venv\Scripts\python.exe backend\manage.py ingest_sentiment --limit 10
```

- Generate predictions:

```
backend\.venv\Scripts\python.exe backend\manage.py score_predictions
```

## API Endpoints

- `GET /api/stocks`
- `GET /api/stocks/{symbol}`
- `GET /api/stocks/{symbol}/history`
- `GET /api/stocks/{symbol}/indicators`
- `GET /api/stocks/{symbol}/fundamentals`
- `GET /api/stocks/{symbol}/sentiment`
- `GET /api/stocks/{symbol}/prediction`
- `GET /api/screener`

## Celery (optional)

Configure Redis and run:

```
backend\.venv\Scripts\python.exe -m celery -A core worker -l info
```
