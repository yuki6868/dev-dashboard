import { useEffect, useState } from "react";

import api from "../services/api";

import RecommendationCard from "../components/RecommendationCard";
import ProjectCard from "../components/ProjectCard";
import InactivityCard from "../components/InactivityCard";

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [inactivity, setInactivity] = useState([]);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [
        projectsRes,
        recommendationRes,
        inactivityRes,
      ] = await Promise.all([
        api.get("/api/projects"),
        api.get("/api/recommend/next-task"),
        api.get("/api/projects/inactivity"),
      ]);

      setProjects(projectsRes.data);
      setRecommendation(recommendationRes.data);
      setInactivity(inactivityRes.data);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="container">
      <h1>Dev Dashboard</h1>

      <RecommendationCard data={recommendation} />

      <InactivityCard items={inactivity} />

      <h2>Projects</h2>

      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
          />
        ))}
      </div>
    </div>
  );
}