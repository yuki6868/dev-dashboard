import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import api from "../services/api";

import GitStatusCard from "../components/GitStatusCard";
import TechStackCard from "../components/TechStackCard";
import ReadmeDashboardCard from "../components/ReadmeDashboardCard";
import TodoList from "../components/TodoList";
import TechStackChart from "../components/TechStackChart";
import TodoTypeChart from "../components/TodoTypeChart";
import OpenVSCodeButton from "../components/OpenVSCodeButton";

export default function ProjectDetailPage() {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [gitStatus, setGitStatus] = useState(null);
  const [techStack, setTechStack] = useState(null);
  const [readmeDashboard, setReadmeDashboard] = useState(null);
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  async function fetchProject() {
    try {
      const [
        projectRes,
        gitRes,
        techRes,
        readmeRes,
        todosRes,
      ] = await Promise.all([
        api.get(`/api/projects/${projectId}`),
        api.get(`/api/projects/${projectId}/git-status`),
        api.get(`/api/projects/${projectId}/tech-stack`),
        api.get(`/api/projects/${projectId}/readme-dashboard`),
        api.get(`/api/todos?project_id=${projectId}`),
      ]);

      setProject(projectRes.data);
      setGitStatus(gitRes.data);
      setTechStack(techRes.data);
      setReadmeDashboard(readmeRes.data);
      setTodos(todosRes.data);
    } catch (error) {
      console.error(error);
    }
  }

  if (!project) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <Link
        to="/"
        style={{
          color: "#60a5fa",
        }}
      >
        ← Back
      </Link>

      <h1>{project.name}</h1>

      <OpenVSCodeButton projectId={project.id} />

      <p>{project.description}</p>

      <GitStatusCard gitStatus={gitStatus} />

      <ReadmeDashboardCard data={readmeDashboard} />

      <TechStackChart techStack={techStack} />

      <TodoTypeChart todos={todos} />

      <TechStackCard techStack={techStack} />

      <TodoList todos={todos} />
    </div>
  );
}