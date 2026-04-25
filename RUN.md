# Run Guide (Frontend + Backend)

## 1) Backend setup (Django)

From the workspace root `d:/stock_prediction1`:

```bash
backend\.venv\Scripts\python.exe backend\manage.py makemigrations
backend\.venv\Scripts\python.exe backend\manage.py migrate
backend\.venv\Scripts\python.exe backend\manage.py createsuperuser
```

Ensure PostgreSQL is running and credentials are set in [`backend/.env`](backend/.env:1).

### PostgreSQL connection error (port 5432 refused)

If you see `connection to server at "127.0.0.1", port 5432 failed`, do the following:

1. **Start PostgreSQL service** (Windows):
   - Open **Services** → find **postgresql-x64-** service → **Start**.
2. **Create database** (if missing):

```
psql -U postgres -h 127.0.0.1 -p 5432
CREATE DATABASE stock_prediction;
```

3. **Verify credentials** in [`backend/.env`](backend/.env:1) match your local Postgres user/password.
4. Re-run migrations:

```
backend\.venv\Scripts\python.exe backend\manage.py makemigrations
backend\.venv\Scripts\python.exe backend\manage.py migrate
```

### Optional data ingestion

```bash
backend\.venv\Scripts\python.exe backend\manage.py ingest_prices --period 6mo --interval 1d
backend\.venv\Scripts\python.exe backend\manage.py calc_indicators
backend\.venv\Scripts\python.exe backend\manage.py ingest_fundamentals path\to\fundamentals.csv
backend\.venv\Scripts\python.exe backend\manage.py ingest_sentiment --limit 10
backend\.venv\Scripts\python.exe backend\manage.py score_predictions
```

### Run backend server

```bash
backend\.venv\Scripts\python.exe backend\manage.py runserver
```

Backend API base URL: `http://127.0.0.1:8000/api/`

### Frontend ↔ Backend connection

The frontend uses a local proxy to forward `/api/*` calls to Django.

- Proxy is set in [`package.json`](package.json:1): `http://127.0.0.1:8000`
- API routes are defined in [`api/urls.py`](api/urls.py:1)

Run backend on `127.0.0.1:8000` and frontend on `localhost:3000`.

## 2) Frontend setup (React)

```bash
npm install
npm start
```

Frontend will run on `http://localhost:3000` and call the Django endpoints defined in [`api/urls.py`](api/urls.py:1).

## 3) Background tasks (optional)

If you want scheduled jobs, run a Redis broker and then start Celery:

```bash
backend\.venv\Scripts\python.exe -m celery -A core worker -l info
```

## 4) Quick health check

Open in browser:

- `http://127.0.0.1:8000/api/stocks`
- `http://127.0.0.1:8000/api/screener`
# Live NSE/BSE Dynamic Chart (WebSocket, no DB)

This project now supports a **dynamic candle chart** using a **WebSocket server** that streams candles from **yfinance** (free/public; may be delayed).

## 1) Start the WebSocket candle server

In terminal 1 (workspace root):

```bash
python ws_server.py
```

It listens on:

- `ws://127.0.0.1:8765/?symbol=TCS&exchange=NSE&timeframe=5m`

Supported params:

- `symbol` = `TCS`, `INFY`, `RELIANCE`, ...
- `exchange` = `NSE` or `BSE`
- `timeframe` = `1m | 5m | 15m | 30m | 1H | 1D | 1W`

Notes:

- Uses **in-memory cache** only (no database).
- Updates are sent by polling yfinance every ~5 seconds (configurable via `poll`).

## 2) Start Django backend (existing)

In terminal 2:

```bash
cd backend && python manage.py runserver 127.0.0.1:8000
```

## 3) Start React frontend

In terminal 3 (workspace root):

```bash
npm start
```

Open:

- `http://localhost:3000/dashboard`

## What changed

- The dashboard chart switched from TradingView widget to a WebSocket-driven chart:
  - [`src/pages/Dashboard.jsx`](src/pages/Dashboard.jsx:1)
  - [`src/components/LiveCandleChart.jsx`](src/components/LiveCandleChart.jsx:1)
  - WebSocket URL builder: [`src/api/wsClient.js`](src/api/wsClient.js:1)
  - Server: [`ws_server.py`](ws_server.py:1)
