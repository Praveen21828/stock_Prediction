from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect

from .data_service import DataService
from .simulation_engine import SimulationConfig, SimulationEngine
from .websocket_manager import WebSocketManager


manager = WebSocketManager()
data_service = DataService()
engine = SimulationEngine(data_service, SimulationConfig(tick_seconds=0.5, smoothing_factor=0.12, noise_abs=0.18))
stop_event = asyncio.Event()


async def broadcast_loop() -> None:
    while not stop_event.is_set():
        candle = await engine.snapshot()
        if candle:
            await manager.broadcast_json({"type": "update", "candle": candle})
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=0.5)
        except asyncio.TimeoutError:
            continue


@asynccontextmanager
async def lifespan(_: FastAPI):
    t1 = asyncio.create_task(data_service.run(stop_event))
    t2 = asyncio.create_task(engine.run(stop_event))
    t3 = asyncio.create_task(broadcast_loop())
    try:
        yield
    finally:
        stop_event.set()
        for t in (t1, t2, t3):
            t.cancel()
        await asyncio.gather(t1, t2, t3, return_exceptions=True)


app = FastAPI(title="Realtime Chart Server", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.websocket("/ws/chart")
async def ws_chart(
    websocket: WebSocket,
    symbol: str = Query(default="RELIANCE"),
    exchange: str = Query(default="NSE"),
    timeframe: str = Query(default="1m"),
) -> None:
    await manager.connect(websocket)
    await engine.set_symbol(symbol=symbol.upper(), exchange=exchange.upper())

    # send instant snapshot so client can render immediately
    snap = await engine.snapshot()
    if snap:
        await websocket.send_json(
            {
                "type": "history",
                "symbol": symbol.upper(),
                "exchange": exchange.upper(),
                "timeframe": timeframe,
                "candles": [snap],
            }
        )

    try:
        while True:
            # keep connection alive; supports future control messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)

