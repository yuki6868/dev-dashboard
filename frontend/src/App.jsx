import { Routes, Route } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";

import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />

      <Route
        path="/projects/:projectId"
        element={<ProjectDetailPage />}
      />
    </Routes>
  );
}

export default App;