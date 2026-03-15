# Database Setup & Schema Explanation

## 1) Create the PostgreSQL database

Open `psql` and run:

```sql
CREATE DATABASE stock_prediction;
```

If you use a different name/user/password, update [`backend/.env`](backend/.env:1).

## 2) Django migrations (schema creation)

Run from workspace root:

```bash
backend\.venv\Scripts\python.exe backend\manage.py makemigrations
backend\.venv\Scripts\python.exe backend\manage.py migrate
```

This generates and applies tables for all backend apps.

## 3) Schema explanation (core tables)

### market_data

- **Stock**: master list of NSE/BSE symbols
  - Columns: `symbol`, `name`, `exchange`
  - Code: [`market_data/models.py`](market_data/models.py:6)

- **PriceData**: OHLCV history
  - FK: `stock_id` → `Stock`
  - Columns: `date`, `open`, `high`, `low`, `close`, `volume`
  - Unique constraint: (`stock_id`, `date`)
  - Code: [`market_data/models.py`](market_data/models.py:20)

- **IndicatorData**: computed EMA/RSI/MACD/VWAP per day
  - FK: `stock_id` → `Stock`
  - Columns: `ema_9`, `ema_12`, `ema_20`, `ema_21`, `ema_50`, `ema_200`, `rsi_14`, `macd`, `macd_signal`, `vwap`
  - Unique constraint: (`stock_id`, `date`)
  - Code: [`market_data/models.py`](market_data/models.py:44)

### fundamentals

- **FundamentalData**: valuation + quality metrics
  - FK: `stock_id` → `Stock`
  - Columns: `pe`, `eps`, `roe`, `debt_equity`, `revenue_growth`, `sector`, `updated_at`
  - Code: [`fundamentals/models.py`](fundamentals/models.py:6)

### sentiment

- **NewsSentiment**: news headline scoring
  - FK: `stock_id` → `Stock`
  - Columns: `headline`, `sentiment_score`, `published_date`, `source`, `url`
  - Code: [`sentiment/models.py`](sentiment/models.py:6)

### screening

- **Prediction**: module scores and labels
  - FK: `stock_id` → `Stock`
  - Columns: `module_type`, `score`, `confidence`, `label`, `created_at`
  - Code: [`screening/models.py`](screening/models.py:6)

## 4) Indexes & performance

Indexes are defined at model level for fast lookup:

- Stock symbol, exchange: [`market_data/models.py`](market_data/models.py:6)
- Time series by stock/date: [`market_data/models.py`](market_data/models.py:20)
- Sentiment by stock/date: [`sentiment/models.py`](sentiment/models.py:6)
- Prediction by stock/module/date: [`screening/models.py`](screening/models.py:6)

These are applied automatically during migrations.
