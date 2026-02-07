import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Screener from "./pages/Screener";
import StockDetails from "./pages/StockDetails";
import NewsSentiment from "./pages/NewsSentiment";

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/screener" element={<Screener />} />
        <Route path="/stock-details" element={<StockDetails />} />
        <Route path="/news" element={<NewsSentiment />} />
      </Routes>
    </MainLayout>
  );
}
