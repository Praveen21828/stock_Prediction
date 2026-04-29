// wsClient.js
// Robust WebSocket helper with auto-reconnect for live chart stream.

export function buildChartWsUrl({ symbol, exchange, timeframe }) {
  // Default to standalone ws_server.py endpoint.
  // Override via REACT_APP_CHART_WS_BASE, e.g. ws://127.0.0.1:8001/ws/chart
  const base = process.env.REACT_APP_CHART_WS_BASE || `ws://127.0.0.1:8765/`;
  const params = new URLSearchParams({
    symbol: symbol || "",
    exchange: exchange || "NSE",
    timeframe: timeframe || "1m",
  });
  return `${base}?${params.toString()}`;
}

export function connectChartStream({ symbol, exchange, timeframe, onMessage, onOpen, onError, onClose }) {
  const url = buildChartWsUrl({ symbol, exchange, timeframe });

  let ws = null;
  let isManuallyClosed = false;
  let reconnectTimer = null;
  let attempts = 0;

  const maxDelayMs = 8000;

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const connect = () => {
    if (isManuallyClosed) return;
    ws = new WebSocket(url);

    ws.onopen = () => {
      attempts = 0;
      onOpen?.(url);
    };

    ws.onerror = (event) => {
      onError?.(event);
    };

    ws.onclose = () => {
      onClose?.();
      if (isManuallyClosed) return;
      const delay = Math.min(1000 * Math.pow(1.7, attempts), maxDelayMs);
      attempts += 1;
      clearReconnect();
      reconnectTimer = setTimeout(connect, delay);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage?.(parsed);
      } catch (_) {
        // ignore invalid payloads
      }
    };
  };

  connect();

  return {
    close: () => {
      isManuallyClosed = true;
      clearReconnect();
      try {
        ws?.close();
      } catch (_) {
        // ignore
      }
    },
  };
}

