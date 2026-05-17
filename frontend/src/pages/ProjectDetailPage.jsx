import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import api from "../services/api";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"];

function shortName(name = "P") {
  return name.trim().slice(0, 2).toUpperCase();
}

function formatDate(dateText) {
  if (!dateText) return "-";
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateText) {
  if (!dateText) return "-";

  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) return `${Math.max(minutes, 1)}分前`;
  if (hours < 24) return `${hours}時間前`;
  return `${days}日前`;
}

function statusLabel(status) {
  if (status === "active") return "開発中";
  if (status === "paused") return "停止中";
  if (status === "done") return "完了";
  return status || "未設定";
}

function priorityLabel(priority) {
  const value = Number(priority || 1);
  if (value >= 5) return "High";
  if (value >= 3) return "Medium";
  return "Low";
}

function normalizeTechItems(techStack) {
  return techStack?.items || [];
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [gitStatus, setGitStatus] = useState(null);
  const [techStack, setTechStack] = useState(null);
  const [readmeQuality, setReadmeQuality] = useState(null);
  const [readmeDashboard, setReadmeDashboard] = useState(null);
  const [todos, setTodos] = useState([]);
  const [devNotes, setDevNotes] = useState([]);
  const [noteInput, setNoteInput] = useState("");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commits, setCommits] = useState([]);

  useEffect(() => {
    fetchProjectDetail();
    // fetchCommits();
  }, [projectId]);

  async function fetchProjectDetail() {
    setLoading(true);

    await Promise.allSettled([
        api.post("/api/github/sync-projects"),
        api.post("/api/github/sync-commits"),
        api.post("/api/github/sync-issues"),
    ]);

    const [
        projectRes,
        gitRes,
        techRes,
        readmeQualityRes,
        readmeDashboardRes,
        todosRes,
        devNotesRes,
        detailRes,
        commitsRes,
    ] = await Promise.allSettled([
        api.get(`/api/projects/${projectId}`),
        api.get(`/api/projects/${projectId}/git-status`),
        api.get(`/api/projects/${projectId}/tech-stack`),
        api.get(`/api/projects/${projectId}/readme-quality`),
        api.get(`/api/projects/${projectId}/readme-dashboard`),
        api.get(`/api/todos?project_id=${projectId}`),
        api.get(`/api/dev-notes?project_id=${projectId}`),
        api.get(`/api/projects/${projectId}/detail-summary`),
        api.get(`/api/projects/${projectId}/commits`),
    ]);

    if (projectRes.status === "fulfilled") setProject(projectRes.value.data);
    if (gitRes.status === "fulfilled") setGitStatus(gitRes.value.data);
    if (techRes.status === "fulfilled") setTechStack(techRes.value.data);
    if (readmeQualityRes.status === "fulfilled") setReadmeQuality(readmeQualityRes.value.data);
    if (readmeDashboardRes.status === "fulfilled") setReadmeDashboard(readmeDashboardRes.value.data);
    if (todosRes.status === "fulfilled") setTodos(todosRes.value.data || []);
    if (devNotesRes.status === "fulfilled") setDevNotes(devNotesRes.value.data || []);
    if (detailRes.status === "fulfilled") setDetail(detailRes.value.data);
    if (commitsRes.status === "fulfilled") setCommits(commitsRes.value.data || []);

    setLoading(false);
  }

//   async function fetchCommits() {
//     const res = await api.get(`/api/projects/${projectId}/commits`);
//     setCommits(res.data || []);
//   }

  async function createDevNote() {
    const content = noteInput.trim();

    if (!content) return;

    const res = await api.post("/api/dev-notes", {
        project_id: Number(projectId),
        content,
    });

    setDevNotes((current) => [res.data, ...current]);
    setNoteInput("");
  }

  async function deleteDevNote(noteId) {
    await api.delete(`/api/dev-notes/${noteId}`);
    setDevNotes((current) => current.filter((note) => note.id !== noteId));
  }

  async function openVSCode() {
    await api.post(`/api/projects/${projectId}/open-vscode`);
  }

  const techItems = useMemo(() => normalizeTechItems(techStack), [techStack]);

  const openTodos = todos.filter((todo) => !todo.is_completed);
  const doneTodos = todos.filter((todo) => todo.is_completed);

  const recentCommits = detail?.recent_commits || [];
  const githubRecentCommits = commits.slice(0, 8);

  const mergedCommits =
    recentCommits.length > 0
        ? recentCommits
        : githubRecentCommits.map((commit) => ({
            hash: commit.sha,
            short_hash: commit.sha?.slice(0, 7),
            message: commit.message,
            committed_at: commit.author_date,
            html_url: commit.html_url,
        }));

  const latestCommit = mergedCommits[0] || null;

  const commitCount =
    Number(detail?.commit_count || 0) > 0
        ? Number(detail?.commit_count || 0)
        : commits.length;

  const branchName =
    gitStatus?.branch ||
    project?.github_default_branch ||
    "main";

  const languageText =
    techItems.slice(0, 3).map((item) => item.language).join(", ") ||
    project?.github_language ||
    "-";

  const contributors = detail?.contributors || [];

  const readmeChecks = readmeQuality?.checks || [];

  if (loading && !project) {
    return <div className="project-detail-shell">Loading...</div>;
  }

  if (!project) {
    return <div className="project-detail-shell">Project not found.</div>;
  }

  return (
    <div className="project-detail-shell">
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
          <button type="button" onClick={fetchProjectDetail}>↻</button>
        </div>
      </header>

      <main className="project-detail-board">
        <aside className="project-detail-sidebar panel">
          <Link className="back-link" to="/projects">
            ← プロジェクト一覧に戻る
          </Link>

          <div className="side-project-card selected">
            <span className="project-avatar">{shortName(project.name)}</span>
            <span>
              <b>{project.name}</b>
              <small>{project.description || "説明なし"}</small>
              <em>★ {project.github_stars || 0}　⑂ {branchName}　◎ {commitCount}</em>
            </span>
            <i className="status-chip active">{statusLabel(project.status)}</i>
          </div>

          <nav className="detail-menu">
            <a className="active">▣ 概要</a>
            <a>◎ Issues <span>{openTodos.length}</span></a>
            <a>⑂ コミット <span>{commitCount}</span></a>
            <a>⑃ ブランチ <span>{detail?.branch_count || 0}</span></a>
            <a>◇ タグ</a>
            <a>⚙ 設定</a>
          </nav>
        </aside>

        <section className="project-main-panel panel">
          <div className="project-hero">
            <div className="project-title-block">
              <span className="project-avatar big">{shortName(project.name)}</span>
              <div>
                <h1>{project.name}</h1>
                <p>{project.description || readmeDashboard?.problem || "プロジェクト説明が未設定です。"}</p>

                <div className="project-meta-line">
                  <span>★ {project.github_stars || 0}</span>
                  <span>⑂ {branchName}</span>
                  <span>
                    ◎ 最終更新: {timeAgo(
                        gitStatus?.latest_commit_at ||
                        project.github_pushed_at ||
                        project.github_updated_at ||
                        project.updated_at
                    )}
                  </span>
                  <span className="status-pill">{statusLabel(project.status)}</span>
                  <span className="priority-pill">{priorityLabel(project.priority)}</span>
                </div>
              </div>
            </div>

            <div className="project-actions">
              {project.github_url && (
                <a href={project.github_url} target="_blank" rel="noreferrer">
                  GitHubで開く
                </a>
              )}
              <button type="button" onClick={openVSCode}>
                VS Codeで開く
              </button>
            </div>
          </div>

          <div className="detail-tabs">
            <span className="active">概要</span>
            <span>Issues</span>
            <span>コミット</span>
            <span>ブランチ</span>
            <span>タグ</span>
            <span>設定</span>
          </div>

          <div className="detail-stat-grid">
            <div className="detail-stat-card">
              <span>オープンIssues</span>
              <b>{openTodos.length}</b>
              <small>全体の {todos.length ? Math.round((openTodos.length / todos.length) * 100) : 0}%</small>
            </div>

            <div className="detail-stat-card">
              <span>完了Issues</span>
              <b>{doneTodos.length}</b>
              <small>全体の {todos.length ? Math.round((doneTodos.length / todos.length) * 100) : 0}%</small>
            </div>

            <div className="detail-stat-card">
              <span>総コミット数</span>
              <b>{commitCount}</b>
              <small>{recentCommits.length > 0 ? "ローカルGitから取得" : "GitHubから取得"}</small>
            </div>

            <div className="detail-stat-card">
              <span>アクティブブランチ</span>
              <b>{detail?.branch_count || 0}</b>
              <small>local / remote 合計</small>
            </div>

            <div className="detail-stat-card">
              <span>最終コミット</span>
              <b>{timeAgo(
                gitStatus?.latest_commit_at ||
                latestCommit?.committed_at ||
                project.github_pushed_at ||
                project.github_updated_at
              )}</b>
              <small>{formatDate(
                gitStatus?.latest_commit_at ||
                latestCommit?.committed_at ||
                project.github_pushed_at ||
                project.github_updated_at
              )}</small>
            </div>
          </div>

          <section className="issues-panel">
            <div className="section-head">
              <h2>最近のIssues / TODO</h2>
              <div>
                <button type="button">すべてのラベル</button>
                <button type="button">ソート: 更新日</button>
                <button type="button">Issues一覧へ →</button>
              </div>
            </div>

            <div className="issue-table">
              <div className="issue-row issue-head">
                <span>タイトル</span>
                <span>ラベル</span>
                <span>優先度</span>
                <span>状態</span>
                <span>更新日</span>
              </div>

              {todos.slice(0, 10).map((todo) => (
                <div className="issue-row" key={todo.id}>
                  <span>
                    <i className={todo.is_completed ? "ok-dot done" : "ok-dot"} />
                    #{todo.id}　{todo.title}
                  </span>
                  <span>
                    <em className="label-chip">{todo.todo_type}</em>
                  </span>
                  <span>{priorityLabel(todo.priority)}</span>
                  <span>{todo.is_completed ? "完了" : "未完了"}</span>
                  <span>{timeAgo(todo.created_at)}</span>
                </div>
              ))}

              {todos.length === 0 && (
                <div className="empty-row">TODO がまだ登録されていません。</div>
              )}
            </div>
          </section>
        </section>

        <aside className="right-detail-column">
          <section className="panel activity-panel">
            <h2>アクティビティ</h2>

            <div className="activity-list">
              {mergedCommits.slice(0, 5).map((commit, index) => (
                <div
                    className="activity-item"
                    key={`${commit.hash || commit.sha || "commit"}-${index}`}
                >
                    <i className={`activity-dot c${index % 4}`} />
                    <span>
                    <b>{timeAgo(commit.committed_at)}</b>
                    <small>
                        コミット <strong>{commit.short_hash || commit.hash?.slice(0, 7)}</strong>
                    </small>
                    <em>{commit.message}</em>
                    </span>
                </div>
              ))}

              {mergedCommits.length === 0 && (
                <p className="muted">コミット履歴を取得できませんでした。</p>
              )}
            </div>
          </section>

          <section className="panel contributors-panel">
            <h2>コントリビューター</h2>
            <p>総コントリビューター数: {contributors.length}</p>

            {contributors.map((user, index) => (
              <div className="contributor-row" key={user.name}>
                <span className="project-avatar small">{shortName(user.name)}</span>
                <span>
                  <b>{user.name}</b>
                  <small>{user.commits} commits</small>
                </span>
                <div className="mini-bar">
                  <i style={{ width: `${user.percentage}%` }} />
                </div>
                <em>{user.percentage}%</em>
              </div>
            ))}

            {contributors.length === 0 && (
              <p className="muted">コントリビューター情報を取得できませんでした。</p>
            )}
          </section>

          <section className="panel dev-notes-panel">
            <div className="dev-notes-head">
                <h2>開発ノート</h2>
                <span>{devNotes.length}件</span>
            </div>

            <textarea
                className="dev-note-input"
                placeholder="今日気づいたこと、詰まったこと、次に直すことを書く"
                value={noteInput}
                onChange={(event) => setNoteInput(event.target.value)}
            />

            <button
                className="dev-note-add-button"
                type="button"
                onClick={createDevNote}
            >
                ノート追加
            </button>

            <div className="dev-note-list">
                {devNotes.map((note) => (
                <article className="dev-note-card" key={note.id}>
                    <div className="dev-note-card-head">
                    <time>{formatDate(note.created_at)}</time>
                    <button
                        type="button"
                        onClick={() => deleteDevNote(note.id)}
                    >
                        削除
                    </button>
                    </div>

                    <p>{note.content}</p>
                </article>
                ))}

                {devNotes.length === 0 && (
                <p className="muted">まだ開発ノートはありません。</p>
                )}
            </div>
          </section>

          <section className="panel info-panel">
            <h2>プロジェクト情報</h2>

            <dl>
              <dt>作成日</dt>
              <dd>{formatDate(project.created_at)}</dd>

              <dt>最終更新</dt>
              <dd>
                {formatDate(
                    project.github_pushed_at ||
                    project.github_updated_at ||
                    project.updated_at
                )}
              </dd>

              <dt>言語</dt>
              <dd>{languageText}</dd>

              <dt>README品質</dt>
              <dd>{readmeQuality?.percentage ?? 0}%</dd>

              <dt>デフォルトブランチ</dt>
              <dd>{branchName}</dd>
            </dl>
          </section>
        </aside>

        <section className="bottom-detail-grid">
          <div className="panel tech-detail-panel">
            <h2>技術スタック</h2>

            <div className="tech-detail-body">
              <div className="mini-pie">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={techItems}
                      dataKey="percentage"
                      nameKey="language"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                    >
                      {techItems.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="tech-list">
                {techItems.map((item, index) => (
                  <div key={item.language}>
                    <span>
                      <i style={{ background: COLORS[index % COLORS.length] }} />
                      {item.language}
                    </span>
                    <b>{item.percentage}%</b>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel readme-detail-panel">
            <h2>README品質チェック</h2>

            <div className="readme-check-grid">
              {readmeChecks.map((check) => (
                <div key={check.key} className={check.passed ? "passed" : "missing"}>
                  <span>{check.label}</span>
                  <b>{check.passed ? "✓" : "×"}</b>
                </div>
              ))}
            </div>
          </div>

          <section className="panel github-commit-panel">
            <div className="panel-head">
                <h2>GitHub Commit履歴</h2>
            </div>

            <div className="github-commit-list">
                {commits.map((commit, index) => (
                <article
                key={`${commit.sha || "github-commit"}-${index}`}
                className="github-commit-card"
                >
                    <div>
                    <b>{commit.message}</b>

                    <p>
                        {commit.author_name || "unknown"}
                        　
                        {commit.author_date
                        ? new Date(commit.author_date).toLocaleString("ja-JP")
                        : ""}
                    </p>

                    <small>{commit.sha?.slice(0, 7) || "-"}</small>
                    </div>

                    {commit.html_url ? (
                    <a href={commit.html_url} target="_blank" rel="noreferrer">
                        GitHub
                    </a>
                    ) : null}
                </article>
                ))}

                {commits.length === 0 && (
                <p className="muted">GitHub Commit履歴はまだありません。</p>
                )}
            </div>
          </section>

          <div className="panel next-action-panel">
            <h2>次の作業</h2>
            <strong>{project.next_action || readmeDashboard?.next_action || openTodos[0]?.title || "次の作業は未設定です。"}</strong>
            <p>{readmeDashboard?.problem || "README の Dashboard セクションや TODO から次の作業を表示します。"}</p>
          </div>
        </section>
      </main>
    </div>
  );
}