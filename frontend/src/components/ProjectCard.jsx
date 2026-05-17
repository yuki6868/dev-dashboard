import { Link } from "react-router-dom";

export default function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div className="card">
        <h3>{project.name}</h3>

        <p>{project.description}</p>

        <p>Status: {project.status}</p>

        <p>Priority: {project.priority}</p>

        <p>Next: {project.next_action}</p>
      </div>
    </Link>
  );
}