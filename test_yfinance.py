import sys
from typing import Iterable

import yfinance as yf


REQUIRED_COLUMNS = {"Open", "High", "Low", "Close", "Volume"}


def validate_data(symbol: str, data) -> bool:
    if data.empty:
        print(f"[WARN] No data found for {symbol}")
        return False

    missing = REQUIRED_COLUMNS - set(data.columns)
    if missing:
        print(f"[WARN] Missing columns for {symbol}: {sorted(missing)}")
        return False

    latest = data.tail(1)
    if latest.isnull().any().any():
        print(f"[WARN] Latest row has null values for {symbol}")
        print(latest)
        return False

    return True


def test_stock_data(symbol: str) -> None:
    print(f"[INFO] Fetching data for {symbol}")
    stock = yf.Ticker(symbol)
    data = stock.history(period="5d")
    print(f"[INFO] Data received for {symbol}")

    if validate_data(symbol, data):
        print(f"[OK] Data fetched successfully for {symbol}")
        print(data.tail())


def main(symbols: Iterable[str]) -> int:
    failures = 0
    for symbol in symbols:
        try:
            test_stock_data(symbol)
        except Exception as exc:  # noqa: BLE001 - test utility
            failures += 1
            print(f"[ERROR] Failed to fetch data for {symbol}: {exc}")
    return 1 if failures else 0


if __name__ == "__main__":
    default_symbols = ["TCS.NS", "RELIANCE.NS", "HDFCBANK.NS"]
    symbols_arg = sys.argv[1:]
    sys.exit(main(symbols_arg or default_symbols))
