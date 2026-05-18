import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api, { cachedGet, clearApiCache } from "../services/api";

const ACCENT_PALETTES = {
  blue: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"],
  purple: ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6"],
  green: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"],
  orange: ["#f97316", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4"],
};

function getAccentColors(settings) {
  return ACCENT_PALETTES[settings?.appearance?.accent_color || "blue"] || ACCENT_PALETTES.blue;
}
const STATUS_LABEL = {
  active: "開発中",
  paused: "停止中",
  done: "完了",
  archived: "保留",
};

function priorityText(priority) {
  const n = Number(priority || 1);
  if (n >= 5) return "High";
  if (n >= 3) return "Medium";
  return "Low";
}

function statusText(status) {
  return STATUS_LABEL[status] || status || "未設定";
}

function daysFrom(dateText) {
  if (!dateText) return null;
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function formatGitHubDate(value) {
  if (!value) return "GitHub未取得";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "GitHub未取得";
  }

  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function projectIcon(name = "P") {
  return name.trim().slice(0, 2).toUpperCase();
}

function buildTechRows(projects) {
  const totals = new Map();

  projects.forEach((project) => {
    const tech = project.tech_stack || project.languages || project.language_stats || [];

    if (Array.isArray(tech)) {
      tech.forEach((item) => {
        const name = item.name || item.language || item.tech || item;
        const value = Number(item.percent || item.percentage || item.value || 1);
        if (name) totals.set(name, (totals.get(name) || 0) + value);
      });
      return;
    }

    if (typeof tech === "object" && tech !== null) {
      Object.entries(tech).forEach(([name, value]) => {
        totals.set(name, (totals.get(name) || 0) + Number(value || 1));
      });
    }
  });

  if (!totals.size) {
    return [
      { name: "Python", value: 45 },
      { name: "JavaScript", value: 30 },
      { name: "SQL", value: 10 },
      { name: "HTML/CSS", value: 10 },
      { name: "Other", value: 5 },
    ];
  }

  const sum = Array.from(totals.values()).reduce((a, b) => a + b, 0) || 1;
  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value: Math.round((value / sum) * 100) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export default function DashboardPage({ settings }) {
  const COLORS = getAccentColors(settings);
  const [projects, setProjects] = useState([]);
  const [todos, setTodos] = useState([]);
  const [inactivity, setInactivity] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [worklog, setWorklog] = useState(null);
  const [projectTechStacks, setProjectTechStacks] = useState({});

  useEffect(() => {
    fetchAll();
  }, []);

async function fetchAll({ forceSync = false } = {}) {
  if (forceSync) {
    clearApiCache();

    await Promise.allSettled([
      api.post("/api/github/sync-projects"),
      api.post("/api/github/sync-commits"),
      api.post("/api/github/sync-issues"),
    ]);
  }

  const [projectsRes, todosRes, inactivityRes, recommendationRes, worklogRes] =
    await Promise.allSettled([
      cachedGet("/api/projects"),
      cachedGet("/api/todos"),
      cachedGet("/api/projects/inactivity"),
      cachedGet("/api/recommend/next-task"),
      cachedGet("/api/worklogs", 60 * 1000),
    ]);

  if (worklogRes.status === "fulfilled") {
    setWorklog(worklogRes.value.data || null);
  }
  if (projectsRes.status === "fulfilled") {
    const projectList = projectsRes.value.data || [];
    setProjects(projectList);

    const techResults = await Promise.allSettled(
      projectList.map((project) =>
        cachedGet(`/api/projects/${project.id}/tech-stack`, 10 * 60 * 1000)
          .then((res) => [project.id, res.data])
      )
    );

    const nextTechStacks = {};

    techResults.forEach((result) => {
      if (result.status !== "fulfilled") return;

      const [projectId, data] = result.value;
      nextTechStacks[projectId] = data?.items || [];
    });

    setProjectTechStacks(nextTechStacks);
  }
  if (todosRes.status === "fulfilled") setTodos(todosRes.value.data || []);
  if (inactivityRes.status === "fulfilled") setInactivity(inactivityRes.value.data || []);
  if (recommendationRes.status === "fulfilled") {
    setRecommendation(recommendationRes.value.data || null);
  }
}

  const summary = useMemo(() => {
    const active = projects.filter((p) => p.status === "active").length;
    const paused = projects.filter((p) => p.status === "paused").length;
    const done = projects.filter((p) => p.status === "done").length;
    const highPriority = projects.filter((p) => Number(p.priority) >= 4).length;
    const openTodos = todos.filter((t) => !t.is_completed).length;
    const issueTotal = projects.reduce((sum, p) => sum + Number(p.open_issues || p.issue_count || 0), 0);

    return {
      total: projects.length,
      active,
      paused,
      done,
      highPriority,
      openTodos,
      alerts: inactivity.length,
      commits: projects.reduce((sum, p) => sum + Number(p.commit_count || p.commits || 0), 0),
      issues: issueTotal,
      release: projects.filter((p) => p.release_ready || p.status === "release").length,
    };
  }, [projects, todos, inactivity]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  }, [projects]);

  const topProjects = sortedProjects.slice(0, 5);
  const visibleProjects = sortedProjects;
  const todoOpen = todos.filter((todo) => !todo.is_completed);
  const nextTodo = recommendation?.recommended_todo || todoOpen[0];
  const nextProject = recommendation?.project_name || topProjects[0]?.name || "プロジェクト未登録";

  const todoBars = useMemo(() => {
    const counts = { Bug: 0, Improve: 0, Idea: 0, Release: 0 };
    todos.forEach((todo) => {
      const key = todo.todo_type || "Improve";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [todos]);

  const commitBars = useMemo(() => {
    const rows = worklog?.daily_counts || [];

    if (!rows.length) {
      return [];
    }

    return rows.map((row) => ({
      day: row.label,
      commit: row.commit_count || 0,
      todo: row.count || 0,
    }));
  }, [worklog]);

  const techRows = useMemo(() => {
    const projectsWithTech = projects.map((project) => ({
      ...project,
      tech_stack: projectTechStacks[project.id] || [],
    }));

    return buildTechRows(projectsWithTech);
  }, [projects, projectTechStacks]);

  const progressRows = useMemo(() => {
    return topProjects.map((project) => {
      const projectTodos = todos.filter(
        (todo) => Number(todo.project_id) === Number(project.id)
      );

      const totalTodos = projectTodos.length;

      const completedTodos = projectTodos.filter((todo) => {
        return (
          todo.is_completed ||
          todo.status === "completed"
        );
      }).length;

      const inProgressTodos = projectTodos.filter((todo) => {
        return todo.status === "in_progress";
      }).length;

      // TODO消化率
      const completionRate =
        totalTodos > 0
          ? Math.round((completedTodos / totalTodos) * 100)
          : 0;

      // プロジェクト進捗率
      // completed=100%
      // in_progress=50%
      // open=0%
      const weightedProgress =
        totalTodos > 0
          ? Math.round(
              (
                (
                  completedTodos +
                  inProgressTodos * 0.5
                ) /
                totalTodos
              ) * 100
            )
          : 0;

      return {
        id: project.id,
        name: project.name,
        completionRate,
        progress: weightedProgress,
        totalTodos,
        completedTodos,
      };
    });
  }, [topProjects, todos]);

  const readmeColumns = [
    { key: "overview", label: "概要" },
    { key: "usage", label: "使い方" },
    { key: "installation", label: "Install" },
    { key: "screenshots", label: "画像" },
    { key: "license", label: "License" },
  ];

  const readmeRows = visibleProjects.map((project) => {
    const checks = project.readme_quality?.checks || [];

    return {
      id: project.id,
      name: project.name,
      percentage: project.readme_quality?.percentage ?? 0,
      errorMessage: project.readme_quality?.error_message,
      checks: readmeColumns.map((column) => {
        const check = checks.find((item) => item.key === column.key);
        return Boolean(check?.passed);
      }),
    };
  });

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
          <Link className="active" to="/">▦ ダッシュボード</Link>
          <Link to="/projects">□ プロジェクト</Link>
          <Link to="/todos">✦ TODO</Link>
          <Link to="/logs">▤ 作業ログ</Link>
          <Link to="/settings">⚙ 設定</Link>
        </nav>

        <div className="sync-state">
          <span className="dot" /> 自動更新: ON
          <button type="button" onClick={() => fetchAll({ forceSync: true })}>↻</button>
        </div>
      </header>

      <main className="wide-board">
        <section className="panel project-list">
          <div className="panel-head">
            <h2>プロジェクト一覧</h2>
            <button type="button">＋ 新規追加</button>
          </div>

          <div className="project-stack">
            {visibleProjects.map((project, index) => {
              const latestDate = project.github_pushed_at || project.github_updated_at || project.last_commit_at || project.updated_at;
              const days = daysFrom(latestDate);
              return (
                <Link className={`project-row ${index === 0 ? "selected" : ""}`} key={project.id} to={`/projects/${project.id}`}>
                  <span className="project-avatar">{projectIcon(project.name)}</span>
                  <span className="project-main">
                    <b>{project.name}</b>
                    <small>{project.description || project.problem || "README / GitHub から状態を取得"}</small>
                    <em>
                      ★ {project.github_stars || project.stars || 0}
                      　⑂ {project.github_language || project.branch || "main"}
                      　Issue {project.github_open_issues_count || 0}
                    </em>
                    <em>GitHub更新: {formatGitHubDate(project.github_pushed_at || project.github_updated_at)}</em>
                  </span>
                  <span className="project-side">
                    <i className={`status-chip ${project.status || "active"}`}>{statusText(project.status)}</i>
                    <i className={`priority p${Number(project.priority || 1)}`}>{priorityText(project.priority)}</i>
                    <small>{days === null ? "未取得" : `${days}日前`}</small>
                  </span>
                </Link>
              );
            })}
          </div>

          <Link className="ghost-button" to="/projects">すべてのプロジェクトを見る →</Link>
        </section>

        <section className="panel today-card">
          <div className="panel-head">
            <h2>今日やること（次の1時間）</h2>
            <button type="button">すべてのTODOへ →</button>
          </div>

          <div className="main-task">
            <span className="urgent">最優先</span>
            <b>{nextProject}</b>
            <span>→</span>
            <strong>{nextTodo?.title || nextTodo?.description || "候補順位の理由ログを表示する"}</strong>
            <button type="button">VS Codeで開く</button>
          </div>

          <div className="subtasks">
            {todoOpen.slice(0, 3).map((todo, index) => (
              <div key={todo.id || index}>
                <span>{index + 1}</span>
                <b>{todo.project_name || todo.project?.name || "Project"}</b>
                <small>→ {todo.title || todo.description}</small>
                <em>{todo.todo_type || "Improve"}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="panel alert-card">
          <h2>アラート・注意</h2>
          <div className="alert-list">
            <div><span>⚠ 放置プロジェクト</span><b>{summary.alerts}件</b></div>
            <div><span>⚠ TODO過多</span><b>{summary.openTodos}件</b></div>
            <div><span>⚠ README不足</span><b>{Math.max(summary.total - summary.done, 0)}件</b></div>
            <div><span>▣ Issue未対応</span><b>{summary.issues}件</b></div>
          </div>
          <button type="button" className="full-button">詳細を確認 →</button>
        </section>

        <section className="panel summary-card">
          <h2>開発サマリー</h2>
          <div className="kpi-grid">
            <div><small>プロジェクト数</small><b>{summary.total}</b></div>
            <div><small>総コミット数</small><b>{summary.commits}</b></div>
            <div><small>未対応Issue</small><b>{summary.issues}</b></div>
            <div><small>TODO総数</small><b>{todos.length}</b></div>
            <div><small>今週のコミット</small><b>{Math.max(3, summary.active * 7)}</b></div>
            <div><small>リリース準備中</small><b>{summary.release}</b></div>
          </div>
        </section>

        <section className="panel chart-card commit-card">
          <h2>コミット頻度</h2>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={commitBars}>
              <XAxis dataKey="day" stroke="#93a4bd" tickLine={false} fontSize={11} />
              <YAxis stroke="#93a4bd" tickLine={false} fontSize={11} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,.05)" }} />
              <Bar dataKey="commit" radius={[6, 6, 0, 0]} fill={COLORS[0]} />
              <Bar dataKey="todo" radius={[6, 6, 0, 0]} fill={COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel todo-rate">
          <h2>TODO消化率</h2>

          <div className="todo-rate-scroll">
            <div className="bar-list">
              {progressRows.map((row, index) => (
                <div key={row.id || row.name}>
                  <span>{row.name}</span>
                  <b>
                    <i
                      style={{
                        width: `${row.completionRate}%`,
                        background: COLORS[index % COLORS.length],
                      }}
                    />
                  </b>
                  <em>{row.completionRate}%</em>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel progress-card">
          <h2>プロジェクト進捗率</h2>
          <div className="ring-grid">
            {progressRows.slice(0, 4).map((row, index) => (
              <div className="ring" style={{ "--value": `${row.progress}%`, "--ring": COLORS[index % COLORS.length] }} key={row.id || row.name}>
                <b>{row.progress}%</b>
                <small>{row.name}</small>
              </div>
            ))}
          </div>
        </section>

        {/* <section className="panel log-card">
          <h2>今週の作業ログ</h2>
          <div className="log-list">
            <b>今日の作業</b>

            {(worklog?.entries || []).slice(0, 5).map((entry, index) => (
              <p key={`${entry.type}-${entry.project_id}-${entry.time}-${index}`}>
                {entry.project_name} / {entry.title}
              </p>
            ))}

            {(!worklog?.entries || worklog.entries.length === 0) && (
              <p>今日の作業ログはまだありません</p>
            )}

            <b>集計</b>
            <p>コミット: {worklog?.summary?.commit_count || 0}件</p>
            <p>完了TODO: {worklog?.summary?.completed_todo_count || 0}件</p>
          </div>
        </section> */}

        <div className="bottom-left-stack">
          <section className="panel tech-card">
            <h2>技術スタック</h2>
            <div className="tech-body">
              <ResponsiveContainer width="72%" height="100%">
                <PieChart>
                  <Pie
                    data={techRows}
                    dataKey="value"
                    innerRadius={78}
                    outerRadius={142}
                    paddingAngle={3}
                  >
                    {techRows.map((_, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="tech-legend">
                {techRows.map((row, index) => (
                  <div key={row.name}>
                    <i style={{ background: COLORS[index % COLORS.length] }} />
                    {row.name}
                    <b>{row.value}%</b>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel tags-card">
            <h2>よく使う技術タグ</h2>
            <div className="tag-cloud">
              {["Python", "FastAPI", "React", "SQLite", "Docker", "Ollama", "Chrome拡張", "JavaScript", "TypeScript", "Tailwind CSS"].map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>
        </div>

        <section className="panel readme-card">
          <h2>README品質チェック</h2>
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>品質</th>
                {readmeColumns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {readmeRows.map((row) => (
                <tr key={row.id || row.name}>
                  <td>{row.name}</td>
                  <td>{row.errorMessage ? "READMEなし" : `${row.percentage}%`}</td>
                  {row.checks.map((ok, index) => (
                    <td key={index}>{ok ? "✓" : "×"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="right-bottom-stack">

        <section className="panel log-card">
          <h2>今週の作業ログ</h2>
          <div className="log-list">
            <b>今日の作業</b>

            {(worklog?.entries || []).slice(0, 5).map((entry, index) => (
              <p key={`${entry.type}-${entry.project_id}-${entry.time}-${index}`}>
                {entry.project_name} / {entry.title}
              </p>
            ))}

            {(!worklog?.entries || worklog.entries.length === 0) && (
              <p>今日の作業ログはまだありません</p>
            )}

            <b>集計</b>
            <p>コミット: {worklog?.summary?.commit_count || 0}件</p>
            <p>完了TODO: {worklog?.summary?.completed_todo_count || 0}件</p>
          </div>
        </section>

          <section className="panel abandoned-card">
            <h2>放置プロジェクト検知</h2>
            {(inactivity[0] || projects[projects.length - 1]) ? (
              <div className="abandoned-box">
                <b>{inactivity[0]?.project_name || projects[projects.length - 1]?.name}</b>
                <span>
                  最終コミット:{" "}
                  {inactivity[0]?.days_since_commit ??
                    daysFrom(projects[projects.length - 1]?.github_pushed_at) ??
                    daysFrom(projects[projects.length - 1]?.github_updated_at) ??
                    "-"}
                  日前
                </span>
                {(inactivity[0]?.reasons || ["状態確認が必要です"]).map((reason, index) => (
                  <em key={index}>⚠ {reason}</em>
                ))}
              </div>
            ) : (
              <p className="empty">プロジェクトを登録すると検知します</p>
            )}
          </section>

          <section className="panel memo-card">
            <h2>最近のメモ・感想</h2>
            <div className="memo-list">
              {(worklog?.entries || []).slice(0, 8).map((entry, index) => (
                <div
                  key={`${entry.project_id}-${entry.title}-${index}`}
                  className="memo-item"
                >
                  <b>{entry.project_name || "Unknown"}</b>

                  <p>{entry.title}</p>

                  <span>
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString("ja-JP")
                      : ""}
                  </span>
                </div>
              ))}

              {(!worklog?.entries || worklog.entries.length === 0) && (
                <p>まだ作業ログがありません</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
