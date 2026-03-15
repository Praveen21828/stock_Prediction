import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function StockRow({
  stock,
  isSelected,
  flashDirection,
  onSelect,
}) {
  if (!stock) return null;
  const priceChange = stock.price - stock.open;
  const percentChange = stock.change;
  const isPositive = percentChange >= 0;
  const changeClass = isPositive ? "up" : "down";

  return (
    <button
      type="button"
      className={`wl-row ${isSelected ? "selected" : ""} ${
        flashDirection ? `flash-${flashDirection}` : ""
      }`}
      onClick={onSelect}
    >
      <div className="wl-cell wl-symbol">
        <span>{stock.symbol}</span>
      </div>
      <div className={`wl-cell wl-change ${changeClass}`}>
        {priceChange.toFixed(2)}
      </div>
      <div className={`wl-cell wl-percent ${changeClass}`}>
        <span className="wl-trend">
          {isPositive ? "▲" : "▼"}
        </span>
        {percentChange.toFixed(2)}%
      </div>
      <div className={`wl-cell wl-last ${changeClass}`}>
        {stock.price.toFixed(2)}
      </div>
    </button>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div
      className="wl-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="wl-modal" onClick={(event) => event.stopPropagation()}>
        {title ? <h4>{title}</h4> : null}
        {children}
        <button type="button" className="wl-modal-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

export default function WatchlistManager({
  watchlists,
  activeWatchlistId,
  allSymbols,
  selectedSymbol,
  getStockBySymbol,
  flashMap,
  onSwitchWatchlist,
  onAddWatchlist,
  onRenameWatchlist,
  onDeleteWatchlist,
  onAddSymbol,
  onSelectSymbol,
}) {
  const [searchInput, setSearchInput] = useState("");
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my");
  const [showCreate, setShowCreate] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (!isManagerOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsManagerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isManagerOpen]);

  const activeWatchlistIndex = Math.max(
    0,
    watchlists.findIndex((item) => item.id === activeWatchlistId)
  );
  const activeWatchlist = watchlists[activeWatchlistIndex] || watchlists[0];

  const stocks = useMemo(() => {
    if (!activeWatchlist) return [];
    return activeWatchlist.symbols.map((symbol) => getStockBySymbol(symbol));
  }, [activeWatchlist, getStockBySymbol]);

  function handleAddSymbol(event) {
    event.preventDefault();
    if (!activeWatchlist) return;
    onAddSymbol(activeWatchlist.id, searchInput);
    setSearchInput("");
  }

  function openCreateModal() {
    setNameInput("");
    setShowCreate(true);
  }

  function openRenameModal(list) {
    setRenameTarget(list);
    setNameInput(list.name);
  }

  function openDeleteModal(list) {
    setDeleteTarget(list);
  }

  return (
    <div className="wl-panel">
      <form className="wl-search" onSubmit={handleAddSymbol}>
        <span className="wl-search-icon">🔍</span>
        <input
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search eg: infy bse, nifty fut, index fund"
        />
        <span className="wl-shortcut">Ctrl + K</span>
      </form>

      <div className="wl-header">
        <div className="wl-title">
          <span>
            Watchlist {activeWatchlistIndex + 1} ({
              activeWatchlist?.symbols.length ?? 0
            } / 250)
          </span>
          <div className="wl-sort">
            <button type="button" aria-label="Sort descending">
              ↓
            </button>
            <button type="button" aria-label="Sort ascending">
              ↑
            </button>
          </div>
        </div>
        <button type="button" className="wl-new-group">
          + New group
        </button>
      </div>

      <div className="wl-group">
        <div className="wl-group-header">
          <span>Default ({activeWatchlist?.symbols.length ?? 0})</span>
          <div className="wl-group-actions">
            <button type="button" aria-label="Collapse group">
              ⌃
            </button>
            <button type="button" aria-label="Expand group">
              ⌄
            </button>
            <button type="button" aria-label="Edit group">
              ✎
            </button>
            <button type="button" aria-label="More options">
              ⋮
            </button>
          </div>
        </div>

        <div className="wl-table">
          <div className="wl-table-header">
            <span>Symbol</span>
            <span>Change</span>
            <span>%</span>
            <span>Last</span>
          </div>
          <div className="wl-rows">
            {stocks.map((stock) => (
              <StockRow
                key={stock.symbol}
                stock={stock}
                isSelected={stock.symbol === selectedSymbol}
                flashDirection={flashMap[stock.symbol]}
                onSelect={() => onSelectSymbol(stock.symbol)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="wl-footer">
        <div className="wl-watchlist-tabs">
          {watchlists.map((list, index) => (
            <button
              key={list.id}
              type="button"
              className={list.id === activeWatchlistId ? "active" : ""}
              onClick={() => onSwitchWatchlist(list.id)}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="wl-manager-btn"
          onClick={() => setIsManagerOpen((prev) => !prev)}
          aria-label="Watchlist manager"
        >
          ☰
        </button>
      </div>

      {isManagerOpen
        ? createPortal(
            <div
              className="wl-manager-overlay"
              onClick={() => setIsManagerOpen(false)}
            >
              <div
                className="wl-manager"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="wl-manager-search">
                  <span>🔍</span>
                  <input type="text" placeholder="Search lists" />
                  <span className="wl-shortcut">Ctrl + Shift + K</span>
                </div>

                <div className="wl-manager-tabs">
                  <button
                    type="button"
                    className={activeTab === "my" ? "active" : ""}
                    onClick={() => setActiveTab("my")}
                  >
                    My lists
                  </button>
                  <button
                    type="button"
                    className={activeTab === "discover" ? "active" : ""}
                    onClick={() => setActiveTab("discover")}
                  >
                    Discover
                  </button>
                  <button
                    type="button"
                    className="wl-new-list"
                    onClick={openCreateModal}
                  >
                    + New list
                  </button>
                </div>

                <div className="wl-manager-body">
                  {activeTab === "my" ? (
                    <div className="wl-manager-lists">
                      <p className="wl-manager-label">Favorites</p>
                      {watchlists.map((list, index) => (
                        <div
                          key={list.id}
                          className={`wl-manager-item ${
                            list.id === activeWatchlistId ? "active" : ""
                          }`}
                        >
                          <span className="wl-manager-index">{index + 1}</span>
                          <span className="wl-manager-name">{list.name}</span>
                          <div className="wl-manager-actions">
                            <button
                              type="button"
                              aria-label={`Rename ${list.name}`}
                              onClick={() => openRenameModal(list)}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${list.name}`}
                              onClick={() => openDeleteModal(list)}
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="wl-manager-discover">
                      <p>Discover curated watchlists here.</p>
                    </div>
                  )}
                </div>
              </div>

              {showCreate ? (
                <ModalShell title={"Name"} onClose={() => setShowCreate(false)}>
                  <div className="wl-modal-field">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(event) => setNameInput(event.target.value)}
                      placeholder=""
                    />
                  </div>
                  <div className="wl-modal-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        onAddWatchlist(nameInput);
                        setShowCreate(false);
                      }}
                    >
                      Create
                    </button>
                    <button type="button" onClick={() => setShowCreate(false)}>
                      Cancel
                    </button>
                  </div>
                </ModalShell>
              ) : null}

              {renameTarget ? (
                <ModalShell title={"Name"} onClose={() => setRenameTarget(null)}>
                  <div className="wl-modal-field">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(event) => setNameInput(event.target.value)}
                    />
                  </div>
                  <div className="wl-modal-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        onRenameWatchlist(renameTarget.id, nameInput);
                        setRenameTarget(null);
                      }}
                    >
                      Update
                    </button>
                    <button type="button" onClick={() => setRenameTarget(null)}>
                      Cancel
                    </button>
                  </div>
                </ModalShell>
              ) : null}

              {deleteTarget ? (
                <ModalShell
                  title={"Are you sure?"}
                  onClose={() => setDeleteTarget(null)}
                >
                  <p className="wl-modal-text">Delete list {deleteTarget.name}</p>
                  <div className="wl-modal-actions">
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        onDeleteWatchlist(deleteTarget.id);
                        setDeleteTarget(null);
                      }}
                    >
                      Delete
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(null)}>
                      Cancel
                    </button>
                  </div>
                </ModalShell>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
