import { Routes, Route } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectListPage from "./pages/ProjectListPage";
import TodoPage from "./pages/TodoPage";

import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/projects" element={<ProjectListPage />} />
      <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
      <Route path="/todos" element={<TodoPage />} />
    </Routes>
  );
}

export default App;