import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectListPage from "./pages/ProjectListPage";
import TodoPage from "./pages/TodoPage";
import WorkLogPage from "./pages/WorkLogPage";
import SettingsPage from "./pages/SettingsPage";

import api from "./services/api";
import "./App.css";

function applySettings(settings) {
  if (!settings) return;

  document.documentElement.dataset.theme =
    settings.appearance?.theme || "dark";

  document.documentElement.dataset.accent =
    settings.appearance?.accent_color || "blue";

  document.documentElement.dataset.compact =
    settings.appearance?.compact_mode ? "true" : "false";

  document.documentElement.dataset.fitOneScreen =
    settings.appearance?.fit_one_screen ? "true" : "false";
}

function App() {
  const [settings, setSettings] = useState(() => {
    const cached = localStorage.getItem("dev-dashboard-settings");
    return cached ? JSON.parse(cached) : null;
  });

  useEffect(() => {
    if (settings) {
      applySettings(settings);
    }

    async function loadSettings() {
      try {
        const res = await api.get("/api/settings");
        setSettings(res.data);
        localStorage.setItem("dev-dashboard-settings", JSON.stringify(res.data));
        applySettings(res.data);
      } catch (error) {
        console.error("[settings] load failed", error);
      }
    }

    loadSettings();

    function handleSettingsUpdated(event) {
      setSettings(event.detail);
      applySettings(event.detail);
    }

    window.addEventListener(
      "dev-dashboard-settings-updated",
      handleSettingsUpdated,
    );

    return () => {
      window.removeEventListener(
        "dev-dashboard-settings-updated",
        handleSettingsUpdated,
      );
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<DashboardPage settings={settings} />} />
      <Route path="/projects" element={<ProjectListPage settings={settings} />} />
      <Route path="/projects/:projectId" element={<ProjectDetailPage settings={settings} />} />
      <Route path="/todos" element={<TodoPage settings={settings} />} />
      <Route path="/logs" element={<WorkLogPage settings={settings} />} />
      <Route path="/worklogs" element={<WorkLogPage settings={settings} />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default App;