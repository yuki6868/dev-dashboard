import { Routes, Route } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectListPage from "./pages/ProjectListPage";
import TodoPage from "./pages/TodoPage";
import WorkLogPage from "./pages/WorkLogPage";
import SettingsPage from "./pages/SettingsPage";

import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/projects" element={<ProjectListPage />} />
      <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
      <Route path="/todos" element={<TodoPage />} />
      <Route path="/logs" element={<WorkLogPage />} />
      <Route path="/worklogs" element={<WorkLogPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default App;