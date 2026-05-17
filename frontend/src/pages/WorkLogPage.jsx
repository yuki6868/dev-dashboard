import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function formatTime(value) {
  if (!value) return "--:--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const match = String(value).match(/\d{2}:\d{2}/);
    return match ? match[0] : "--:--";
  }

  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeLabel(type) {
  if (type === "commit") return "コミット";
  if (type === "todo_completed") return "TODO完了";
  if (type === "todo_created") return "TODO作成";
  return "作業";
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

export default function WorkLogPage() {
  const [selectedDate, setSelectedDate] = useState(todayText());
  const [worklog, setWorklog] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchWorklog();
  }, [selectedDate]);

  async function fetchWorklog() {
    const res = await api.get("/api/worklogs", {
      params: { date: selectedDate },
    });

    setWorklog(res.data);
  }

  const entries = useMemo(() => {
    const list = worklog?.entries || [];

    if (filter === "all") return list;

    return list.filter((entry) => entry.type === filter);
  }, [worklog, filter]);

  const summary = worklog?.summary || {};

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
          <Link to="/projects">□ プロジェクト</Link>
          <Link to="/todos">✦ TODO</Link>
          <Link className="active" to="/logs">▤ 作業ログ</Link>
          <Link to="/settings">⚙ 設定</Link>
        </nav>

        <div className="sync-state">
          <span className="dot" /> 自動更新: ON
          <button type="button" onClick={fetchWorklog}>↻</button>
        </div>
      </header>

      <main className="worklog-page">
        <aside className="panel worklog-left-panel">
          <h2>日付を選択</h2>

          <input
            className="worklog-date-input"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />

          <h2 className="worklog-section-title">日付タイムライン</h2>

          <div className="worklog-day-list">
            {(worklog?.daily_counts || []).map((day) => (
              <button
                type="button"
                key={day.date}
                className={day.date === selectedDate ? "active" : ""}
                onClick={() => setSelectedDate(day.date)}
              >
                <span>
                  <i />
                  {day.label}
                </span>
                <b>{day.count}</b>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel worklog-main-panel">
          <div className="worklog-main-head">
            <div>
              <h1>作業ログ</h1>
              <p>{selectedDate}</p>
            </div>

            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">すべてのアクティビティ</option>
              <option value="commit">コミット</option>
              <option value="todo_completed">TODO完了</option>
              <option value="todo_created">TODO作成</option>
            </select>
          </div>

          <div className="worklog-mini-stats">
            <span>作業時間: <b>{summary.estimated_hours ?? 0}h</b></span>
            <span>コミット: <b>{summary.commit_count ?? 0}</b></span>
            <span>完了TODO: <b>{summary.completed_todo_count ?? 0}</b></span>
            <span>作成TODO: <b>{summary.created_todo_count ?? 0}</b></span>
          </div>

          <div className="worklog-timeline">
            {entries.map((entry, index) => (
              <article className={`worklog-entry ${entry.type}`} key={`${entry.type}-${index}`}>
                <div className="worklog-time">{formatTime(entry.time)}</div>

                <div className="worklog-line">
                  <span>{entry.type === "commit" ? "⌘" : "✓"}</span>
                </div>

                <div className="worklog-card">
                  <div className="worklog-card-head">
                    <div>
                      <em>{typeLabel(entry.type)}</em>
                      <h2>{entry.title}</h2>
                    </div>

                    {entry.type === "commit" && (
                      <div className="worklog-diff">
                        <b>+{entry.additions || 0}</b>
                        <strong>-{entry.deletions || 0}</strong>
                      </div>
                    )}

                    {entry.type !== "commit" && (
                      <strong className="worklog-status">
                        {entry.type === "todo_completed" ? "完了" : "作成"}
                      </strong>
                    )}
                  </div>

                  {entry.description && <p>{entry.description}</p>}

                  <div className="worklog-meta">
                    <span>{entry.project_name}</span>

                    {entry.todo_type && <span>{entry.todo_type}</span>}
                    {entry.priority && <span>{entry.priority}</span>}
                    {entry.commit_hash && <span>{entry.commit_hash}</span>}
                    {entry.files_count ? <span>{entry.files_count} files</span> : null}
                  </div>
                </div>
              </article>
            ))}

            {entries.length === 0 && (
              <div className="worklog-empty">
                この日の作業ログはありません。
              </div>
            )}
          </div>
        </section>

        <aside className="panel worklog-right-panel">
          <h2>今日のサマリー</h2>

          <div className="worklog-summary-list">
            <div><span>作業時間</span><b>{summary.estimated_hours ?? 0} 時間</b></div>
            <div><span>コミット数</span><b>{summary.commit_count ?? 0} 回</b></div>
            <div><span>完了したTODO</span><b>{summary.completed_todo_count ?? 0} 件</b></div>
            <div><span>作成したTODO</span><b>{summary.created_todo_count ?? 0} 件</b></div>
          </div>

          <h2 className="worklog-section-title">最近のプロジェクト</h2>

          <div className="worklog-project-list">
            {(worklog?.recent_projects || []).map((project) => (
              <div key={project.name}>
                <span>{project.name}</span>
                <b>{project.hours}h</b>
              </div>
            ))}

            {(worklog?.recent_projects || []).length === 0 && (
              <p className="muted">プロジェクト作業はありません。</p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}