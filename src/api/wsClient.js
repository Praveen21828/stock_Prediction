// wsClient.js
// Minimal WebSocket helper for the live chart stream.

export function buildChartWsUrl({ symbol, exchange, timeframe, pollSeconds = 5 }) {
  // FastAPI websocket endpoint
  const base = `ws://127.0.0.1:8000/ws/chart`;
  const params = new URLSearchParams({
    symbol: symbol || "",
    exchange: exchange || "NSE",
    timeframe: timeframe || "5m",
  });
  return `${base}?${params.toString()}`;
}

export function connectChartStream({ symbol, exchange, timeframe, pollSeconds, onMessage, onOpen, onError, onClose }) {
  const url = buildChartWsUrl({ symbol, exchange, timeframe, pollSeconds });
  const ws = new WebSocket(url);

  ws.onopen = () => onOpen?.(url);
  ws.onerror = (event) => onError?.(event);
  ws.onclose = () => onClose?.();
  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      onMessage?.(parsed);
    } catch (e) {
      // ignore invalid payloads
    }
  };
  return ws;
}

