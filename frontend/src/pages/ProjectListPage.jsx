import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";

function projectIcon(name = "P") {
  return name.trim().slice(0, 2).toUpperCase();
}

function statusText(status) {
  if (status === "active") return "開発中";
  if (status === "paused") return "停止中";
  if (status === "done") return "完了";
  return status || "未設定";
}

export default function ProjectListPage() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const res = await api.get("/api/projects");
    setProjects(res.data || []);
  }

  return (
    <div className="devos-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">◇</span>
          <span>
            <b>DevDashboard</b>
            <small>個人開発Gitダッシュボード</small>
          </span>
        </Link>

        <nav className="topnav">
          <Link to="/">▦ ダッシュボード</Link>
          <Link className="active" to="/projects">□ プロジェクト</Link>
          <Link to="/todos">✦ TODO</Link>
          <Link to="/logs">▤ 作業ログ</Link>
          <Link to="/settings">⚙ 設定</Link>
        </nav>

        <div className="sync-state">
          <span className="dot" /> 自動更新: ON
          <button type="button" onClick={fetchProjects}>↻</button>
        </div>
      </header>

      <main className="project-list-page">
        <section className="panel project-list-full">
          <div className="panel-head">
            <h2>プロジェクト一覧</h2>
            <button type="button">＋ 新規追加</button>
          </div>

          <div className="project-list-grid">
            {projects.map((project) => (
              <Link
                key={project.id}
                className="project-list-card"
                to={`/projects/${project.id}`}
              >
                <span className="project-avatar">
                  {projectIcon(project.name)}
                </span>

                <span>
                  <b>{project.name}</b>
                  <small>{project.description || "説明なし"}</small>
                  <em>
                    ★ {project.stars || 0}　⑂ {project.branch || "main"}　◎{" "}
                    {project.commit_count || 0}
                  </em>
                </span>

                <i className={`status-chip ${project.status || "active"}`}>
                  {statusText(project.status)}
                </i>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}