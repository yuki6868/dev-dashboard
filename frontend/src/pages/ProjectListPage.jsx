import { useEffect, useMemo, useState } from "react";
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

function formatDate(value) {
  if (!value) return "更新日時なし";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProjectListPage() {
  const [projects, setProjects] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubMessage, setGithubMessage] = useState("");

  useEffect(() => {
    fetchProjects();
    fetchRepositories();
  }, []);

  const registeredGithubUrls = useMemo(() => {
    return new Set(
      projects
        .map((project) => project.github_url)
        .filter(Boolean),
    );
  }, [projects]);

  async function fetchProjects() {
    const res = await api.get("/api/projects");
    setProjects(res.data || []);
  }

  async function fetchRepositories() {
    setGithubLoading(true);
    setGithubMessage("");

    try {
      const res = await api.get("/api/github/repositories");

      if (!res.data.ok) {
        setRepositories([]);
        setGithubMessage(res.data.error || "GitHubリポジトリを取得できませんでした。");
        return;
      }

      setRepositories(res.data.repositories || []);
    } catch (error) {
      setRepositories([]);
      setGithubMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "GitHubリポジトリを取得できませんでした。",
      );
    } finally {
      setGithubLoading(false);
    }
  }

  async function addRepository(repo) {
    try {
      await api.post("/api/github/repositories/add", {
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description,
        language: repo.language,
        updated_at: repo.updated_at,
      });

      await fetchProjects();
      setGithubMessage(`${repo.full_name || repo.name} をプロジェクトに追加しました。`);
    } catch (error) {
      setGithubMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "プロジェクト追加に失敗しました。",
      );
    }
  }

  async function refreshAll() {
    await fetchProjects();
    await fetchRepositories();
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
          <button type="button" onClick={refreshAll}>↻</button>
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
                    GitHub: {project.github_url ? "連携あり" : "未設定"}
                  </em>
                  <div className="project-tech-chips">
                    {(project.tech_stack?.length ? project.tech_stack : [project.github_language])
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((tech) => (
                        <span key={tech}>{tech}</span>
                        ))}

                    {!project.tech_stack?.length && !project.github_language ? (
                        <span className="muted">技術スタック未検出</span>
                    ) : null}
                  </div>
                </span>

                <i className={`status-chip ${project.status || "active"}`}>
                  {statusText(project.status)}
                </i>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel github-repo-panel">
          <div className="panel-head">
            <div>
              <h2>GitHubリポジトリから追加</h2>
              <p className="github-repo-sub">
                GitHub上のrepoを選んで、local_path空のプロジェクトとして登録します。
              </p>
            </div>

            <button type="button" onClick={fetchRepositories}>
              GitHub再取得
            </button>
          </div>

          {githubMessage ? (
            <p className="github-repo-message">{githubMessage}</p>
          ) : null}

          {githubLoading ? (
            <p className="github-repo-empty">GitHubリポジトリを読み込み中...</p>
          ) : null}

          {!githubLoading && repositories.length === 0 ? (
            <p className="github-repo-empty">
              GitHubリポジトリがありません。設定画面でGitHub連携を確認してください。
            </p>
          ) : null}

          <div className="github-repo-list">
            {repositories.map((repo) => {
              const added = registeredGithubUrls.has(repo.html_url);

              return (
                <article key={repo.html_url} className="github-repo-card">
                  <div>
                    <b>{repo.full_name || repo.name}</b>
                    <p>{repo.description || "説明なし"}</p>

                    <div className="github-repo-meta">
                      <span>{repo.language || "言語なし"}</span>
                      <span>{repo.private ? "Private" : "Public"}</span>
                      <span>更新: {formatDate(repo.updated_at)}</span>
                    </div>

                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {repo.html_url}
                    </a>
                  </div>

                  <button
                    type="button"
                    disabled={added}
                    onClick={() => addRepository(repo)}
                  >
                    {added ? "追加済み" : "プロジェクトに追加"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}