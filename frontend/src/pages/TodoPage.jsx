import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";

function priorityLabel(priority) {
  const value = String(priority || "medium").toLowerCase();

  if (value === "high" || value === "urgent" || value === "5") return "高";
  if (value === "low" || value === "1") return "低";
  return "中";
}

function priorityClass(priority) {
  const value = String(priority || "medium").toLowerCase();

  if (value === "high" || value === "urgent" || value === "5") return "high";
  if (value === "low" || value === "1") return "low";
  return "medium";
}

function formatDate(dateText) {
  if (!dateText) return "-";

  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  });
}

export default function TodoPage() {
  const [todos, setTodos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState("open");
  const [projectFilter, setProjectFilter] = useState("all");

  const [form, setForm] = useState({
    project_id: "",
    title: "",
    description: "",
    todo_type: "Improve",
    priority: "medium",
    status: "open",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [todosRes, projectsRes, summaryRes] = await Promise.all([
      api.get("/api/todos"),
      api.get("/api/projects"),
      api.get("/api/todos/summary"),
    ]);

    const projectList = projectsRes.data || [];

    setTodos(todosRes.data || []);
    setProjects(projectList);
    setSummary(summaryRes.data);

    setForm((current) => ({
      ...current,
      project_id: current.project_id || projectList[0]?.id || "",
    }));
  }

  async function createTodo(event) {
    event.preventDefault();

    if (!form.project_id || !form.title.trim()) return;

    await api.post("/api/todos", {
      ...form,
      project_id: Number(form.project_id),
      title: form.title.trim(),
    });

    setForm((current) => ({
      ...current,
      title: "",
      description: "",
    }));

    await fetchAll();
  }

  async function completeTodo(todoId) {
    await api.post(`/api/todos/${todoId}/complete`);
    await fetchAll();
  }

  async function reopenTodo(todo) {
    await api.put(`/api/todos/${todo.id}`, {
      is_completed: false,
      status: "open",
    });

    await fetchAll();
  }

  async function deleteTodo(todoId) {
    await api.delete(`/api/todos/${todoId}`);
    await fetchAll();
  }

  const projectMap = useMemo(() => {
    const map = {};

    for (const project of projects) {
      map[project.id] = project;
    }

    return map;
  }, [projects]);

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === "open" && todo.is_completed) return false;
      if (filter === "completed" && !todo.is_completed) return false;

      if (projectFilter !== "all" && Number(todo.project_id) !== Number(projectFilter)) {
        return false;
      }

      return true;
    });
  }, [todos, filter, projectFilter]);

  const todayTodos = filteredTodos.slice(0, 6);
  const backlogTodos = filteredTodos.slice(6);

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
          <Link className="active" to="/todos">✦ TODO</Link>
          <span>▤ 作業ログ</span>
          <span>⚙ 設定</span>
        </nav>

        <div className="sync-state">
          <span className="dot" /> 自動更新: ON
          <button type="button" onClick={fetchAll}>↻</button>
        </div>
      </header>

      <main className="todo-page">
        <section className="panel todo-left-panel">
          <div className="panel-head">
            <h2>TODO追加</h2>
          </div>

          <form className="todo-form" onSubmit={createTodo}>
            <label>
              プロジェクト
              <select
                value={form.project_id}
                onChange={(event) => setForm({ ...form, project_id: event.target.value })}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              タイトル
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="例: READMEに画像を追加する"
              />
            </label>

            <label>
              説明
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="作業内容をメモ"
              />
            </label>

            <div className="todo-form-row">
              <label>
                種類
                <select
                  value={form.todo_type}
                  onChange={(event) => setForm({ ...form, todo_type: event.target.value })}
                >
                  <option value="Improve">Improve</option>
                  <option value="Feature">Feature</option>
                  <option value="Bug">Bug</option>
                  <option value="Docs">Docs</option>
                  <option value="Refactor">Refactor</option>
                </select>
              </label>

              <label>
                優先度
                <select
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </label>
            </div>

            <button type="submit">＋ TODOを追加</button>
          </form>

          <div className="todo-side-summary">
            <h3>集計</h3>

            <div>
              <span>全TODO</span>
              <b>{summary?.total ?? 0}</b>
            </div>

            <div>
              <span>未完了</span>
              <b>{summary?.open ?? 0}</b>
            </div>

            <div>
              <span>完了</span>
              <b>{summary?.completed ?? 0}</b>
            </div>

            <div>
              <span>高優先度</span>
              <b>{summary?.high ?? 0}</b>
            </div>
          </div>
        </section>

        <section className="panel todo-main-panel">
          <div className="todo-title-line">
            <div>
              <h1>TODO</h1>
              <p>プロジェクト横断で、今日やること・未完了・完了を管理します。</p>
            </div>

            <div className="todo-filters">
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="open">未完了</option>
                <option value="completed">完了</option>
                <option value="all">すべて</option>
              </select>

              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="all">すべてのプロジェクト</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="todo-stat-grid">
            <div>
              <span>未完了</span>
              <b>{summary?.open ?? 0}</b>
            </div>

            <div>
              <span>完了</span>
              <b>{summary?.completed ?? 0}</b>
            </div>

            <div>
              <span>高優先度</span>
              <b>{summary?.high ?? 0}</b>
            </div>

            <div>
              <span>表示中</span>
              <b>{filteredTodos.length}</b>
            </div>
          </div>

          <div className="todo-section-head">
            <h2>今日やること</h2>
            <span>{todayTodos.length}件</span>
          </div>

          <div className="todo-card-list">
            {todayTodos.map((todo) => (
              <article className="todo-task-card" key={todo.id}>
                <div className="todo-task-main">
                  <button
                    type="button"
                    className={todo.is_completed ? "todo-check done" : "todo-check"}
                    onClick={() => (
                      todo.is_completed ? reopenTodo(todo) : completeTodo(todo.id)
                    )}
                  >
                    {todo.is_completed ? "✓" : ""}
                  </button>

                  <div>
                    <strong>{todo.title}</strong>
                    <p>{todo.description || "説明なし"}</p>

                    <div className="todo-tags">
                      <span>{projectMap[todo.project_id]?.name || `Project ${todo.project_id}`}</span>
                      <em>{todo.todo_type}</em>
                      <i className={priorityClass(todo.priority)}>
                        {priorityLabel(todo.priority)}
                      </i>
                    </div>
                  </div>
                </div>

                <div className="todo-task-actions">
                  <small>{formatDate(todo.created_at)}</small>
                  <button type="button" onClick={() => deleteTodo(todo.id)}>削除</button>
                </div>
              </article>
            ))}

            {todayTodos.length === 0 && (
              <div className="todo-empty">表示するTODOがありません。</div>
            )}
          </div>
        </section>

        <section className="panel todo-right-panel">
          <h2>バックログ</h2>

          <div className="backlog-list">
            {backlogTodos.map((todo) => (
              <div className="backlog-row" key={todo.id}>
                <span>
                  <b>{todo.title}</b>
                  <small>{projectMap[todo.project_id]?.name || `Project ${todo.project_id}`}</small>
                </span>

                <em className={priorityClass(todo.priority)}>
                  {priorityLabel(todo.priority)}
                </em>
              </div>
            ))}

            {backlogTodos.length === 0 && (
              <p className="muted">バックログはありません。</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}