import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import "../styles/news-sentiment.css";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Screener", to: "/screener" },
  { label: "Stock Details", to: "/stock-details" },
  { label: "News", to: "/news" },
];
const FILTERS = ["All", "Positive", "Neutral", "Negative"];

const NEWS_ITEMS = [
  {
    title: "Company posts record quarterly profit",
    source: "Business Standard",
    time: "2h ago",
    sentiment: "Positive",
  },
  {
    title: "Brokerage keeps neutral outlook on sector",
    source: "Economic Times",
    time: "5h ago",
    sentiment: "Neutral",
  },
  {
    title: "Regulatory update may impact margins",
    source: "Mint",
    time: "1d ago",
    sentiment: "Negative",
  },
  {
    title: "Order wins strengthen revenue visibility",
    source: "Moneycontrol",
    time: "1d ago",
    sentiment: "Positive",
  },
];

function sentimentClass(sentiment) {
  return sentiment.toLowerCase();
}

export default function NewsSentiment() {
  const [activeTab, setActiveTab] = useState("News");
  const [filter, setFilter] = useState("All");

  const filteredNews = useMemo(() => {
    if (filter === "All") return NEWS_ITEMS;
    return NEWS_ITEMS.filter((item) => item.sentiment === filter);
  }, [filter]);

  return (
    <div className="news-sentiment">
      <header className="top-nav">
        <div className="brand">Stock Prediction</div>
        <nav className="nav-tabs">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-tab ${isActive ? "active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="theme-toggle" type="button">
            🌗
          </button>
          <div className="user-chip">PK</div>
        </div>
      </header>

      <main className="news-content">
        <section className="page-header">
          <div>
            <h1>News & Sentiment</h1>
            <p>Latest market headlines with sentiment tagging</p>
          </div>
          <div className="filters">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={`filter-btn ${filter === item ? "active" : ""}`}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="news-list">
          {filteredNews.map((item) => (
            <article key={item.title} className="news-card">
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.source} · {item.time}
                </p>
              </div>
              <span className={`sentiment ${sentimentClass(item.sentiment)}`}>
                {item.sentiment}
              </span>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
