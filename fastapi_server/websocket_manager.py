"""WebSocket connection manager.

Manages group-based fan-out (one simulation -> many clients).
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import DefaultDict, Set

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self._groups: DefaultDict[str, Set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, group: str, ws: WebSocket) -> None:
        async with self._lock:
            self._groups[group].add(ws)

    async def disconnect(self, group: str, ws: WebSocket) -> None:
        async with self._lock:
            if group in self._groups and ws in self._groups[group]:
                self._groups[group].remove(ws)
            if group in self._groups and not self._groups[group]:
                del self._groups[group]

    async def broadcast_json(self, group: str, payload: dict) -> None:
        # Snapshot under lock, send outside lock.
        async with self._lock:
            sockets = list(self._groups.get(group, set()))

        if not sockets:
            return

        async def _send(ws: WebSocket) -> None:
            try:
                await ws.send_json(payload)
            except Exception:
                # Let disconnect cleanup happen via caller/heartbeat.
                pass

        await asyncio.gather(*(_send(ws) for ws in sockets), return_exceptions=True)

    async def group_size(self, group: str) -> int:
        async with self._lock:
            return len(self._groups.get(group, set()))

