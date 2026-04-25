"""FastAPI WebSocket chart server.

Endpoint:
  ws://localhost:8000/ws/chart?symbol=RELIANCE&exchange=NSE&timeframe=1m

Server -> Client messages:
  {"type":"history","symbol":"RELIANCE","exchange":"NSE","timeframe":"1m","candles":[...]} 
  {"type":"update","candle":{...}} 
  {"type":"error","message":"..."}

Run:
  python -m uvicorn fastapi_server.main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from fastapi_server.data_service import fetch_history_candles
from fastapi_server.simulation_engine import StreamKey, StreamSupervisor
from fastapi_server.websocket_manager import WebSocketManager


logging.basicConfig(level=logging.INFO, format="[fastapi-ws] %(message)s")

app = FastAPI(title="Dynamic Chart WebSocket")

ws_manager = WebSocketManager()
supervisor = StreamSupervisor(ws_manager=ws_manager)


@app.on_event("startup")
async def _startup() -> None:
    # Supervisor lazily starts streams when the first client subscribes.
    logging.info("startup")


@app.on_event("shutdown")
async def _shutdown() -> None:
    logging.info("shutdown")
    await supervisor.stop_all()


@app.websocket("/ws/chart")
async def ws_chart(
    ws: WebSocket,
    symbol: str = "RELIANCE",
    exchange: str = "NSE",
    timeframe: str = "1m",
    smoothing: float = 0.12,
    noise: float = 0.20,
    drift: float = 0.00,
) -> None:
    """Chart websocket.

    Query params:
      - symbol/exchange/timeframe: subscription key
      - smoothing: 0.05..0.2 recommended
      - noise: absolute price noise amplitude per tick
      - drift: small bias added per tick (can be negative)
    """

    key = StreamKey(
        symbol=(symbol or "").strip().upper(),
        exchange=(exchange or "NSE").strip().upper(),
        timeframe=(timeframe or "1m").strip(),
        smoothing=float(smoothing),
        noise=float(noise),
        drift=float(drift),
    )

    await ws.accept()

    try:
        # Send initial history (slow, but done once per connection; yfinance runs in a thread).
        candles = await fetch_history_candles(symbol=key.symbol, exchange=key.exchange, timeframe=key.timeframe)
        await ws.send_json(
            {
                "type": "history",
                "symbol": key.symbol,
                "exchange": key.exchange,
                "timeframe": key.timeframe,
                "candles": candles,
            }
        )

        # Subscribe and ensure simulation for this key is running.
        await ws_manager.connect(key.to_group(), ws)
        await supervisor.ensure_running(key)

        # Keep the socket alive; we don't expect inbound messages currently.
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        await ws_manager.disconnect(key.to_group(), ws)
        await supervisor.maybe_stop_if_unused(key)

