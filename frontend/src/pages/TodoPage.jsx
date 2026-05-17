import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";

const STATUS_COLUMNS = [
  {
    key: "open",
    title: "Todo",
    help: "まだ着手していないタスク",
  },
  {
    key: "in_progress",
    title: "In Progress",
    help: "いま作業中のタスク",
  },
  {
    key: "completed",
    title: "Done",
    help: "完了したタスク",
  },
];

function normalizeStatus(todo) {
  if (todo.is_completed || todo.status === "completed") return "completed";
  if (todo.status === "in_progress") return "in_progress";
  return "open";
}

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
  const [filter, setFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [draggingTodoId, setDraggingTodoId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

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
      status: "open",
    });

    setForm((current) => ({
      ...current,
      title: "",
      description: "",
    }));

    await fetchAll();
  }

  async function moveTodo(todo, nextStatus) {
    const currentStatus = normalizeStatus(todo);
    if (currentStatus === nextStatus) return;

    await api.put(`/api/todos/${todo.id}`, {
      status: nextStatus,
      is_completed: nextStatus === "completed",
    });

    await fetchAll();
  }

  async function deleteTodo(todoId) {
    await api.delete(`/api/todos/${todoId}`);
    await fetchAll();
  }

  function handleDragStart(event, todo) {
    setDraggingTodoId(todo.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(todo.id));
  }

  function handleDragEnd() {
    setDraggingTodoId(null);
    setDragOverStatus(null);
  }

  function handleDragOver(event, status) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }

  async function handleDrop(event, status) {
    event.preventDefault();

    const todoId = Number(event.dataTransfer.getData("text/plain"));
    const todo = todos.find((item) => item.id === todoId);

    setDraggingTodoId(null);
    setDragOverStatus(null);

    if (!todo) return;

    await moveTodo(todo, status);
  }

  const projectMap = useMemo(() => {
    const map = {};

    for (const project of projects) {
      map[project.id] = project;
    }

    return map;
  }, [projects]);

  const visibleTodos = useMemo(() => {
    return todos.filter((todo) => {
      const status = normalizeStatus(todo);

      if (filter !== "all" && status !== filter) return false;

      if (projectFilter !== "all" && Number(todo.project_id) !== Number(projectFilter)) {
        return false;
      }

      return true;
    });
  }, [todos, filter, projectFilter]);

  const todosByStatus = useMemo(() => {
    const groups = {
      open: [],
      in_progress: [],
      completed: [],
    };

    for (const todo of visibleTodos) {
      groups[normalizeStatus(todo)].push(todo);
    }

    return groups;
  }, [visibleTodos]);

  const counts = useMemo(() => {
    const open = todos.filter((todo) => normalizeStatus(todo) === "open").length;
    const inProgress = todos.filter((todo) => normalizeStatus(todo) === "in_progress").length;
    const completed = todos.filter((todo) => normalizeStatus(todo) === "completed").length;
    const high = todos.filter((todo) => priorityClass(todo.priority) === "high").length;

    return {
      total: todos.length,
      open,
      inProgress,
      completed,
      high,
    };
  }, [todos]);

  const backlogTodos = todosByStatus.open.slice(6);

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
          <Link to="/logs">▤ 作業ログ</Link>
          <Link to="/settings">⚙ 設定</Link>
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
              <b>{summary?.total ?? counts.total}</b>
            </div>

            <div>
              <span>Todo</span>
              <b>{counts.open}</b>
            </div>

            <div>
              <span>In Progress</span>
              <b>{counts.inProgress}</b>
            </div>

            <div>
              <span>Done</span>
              <b>{counts.completed}</b>
            </div>

            <div>
              <span>高優先度</span>
              <b>{summary?.high ?? counts.high}</b>
            </div>
          </div>
        </section>

        <section className="panel todo-main-panel">
          <div className="todo-title-line">
            <div>
              <h1>TODO</h1>
              <p>ドラッグ＆ドロップで Todo / In Progress / Done に状態遷移できます。</p>
            </div>

            <div className="todo-filters">
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">すべて</option>
                <option value="open">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Done</option>
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
              <span>Todo</span>
              <b>{counts.open}</b>
            </div>

            <div>
              <span>In Progress</span>
              <b>{counts.inProgress}</b>
            </div>

            <div>
              <span>Done</span>
              <b>{counts.completed}</b>
            </div>

            <div>
              <span>表示中</span>
              <b>{visibleTodos.length}</b>
            </div>
          </div>

          <div className="todo-kanban-board">
            {STATUS_COLUMNS.map((column) => {
              const columnTodos = todosByStatus[column.key] || [];

              return (
                <section
                  className={
                    dragOverStatus === column.key
                      ? "todo-kanban-column drag-over"
                      : "todo-kanban-column"
                  }
                  key={column.key}
                  onDragOver={(event) => handleDragOver(event, column.key)}
                  onDragLeave={() => setDragOverStatus(null)}
                  onDrop={(event) => handleDrop(event, column.key)}
                >
                  <div className="todo-kanban-head">
                    <div>
                      <h2>{column.title}</h2>
                      <p>{column.help}</p>
                    </div>

                    <span>{columnTodos.length}</span>
                  </div>

                  <div className="todo-kanban-list">
                    {columnTodos.map((todo) => (
                      <article
                        className={
                          draggingTodoId === todo.id
                            ? "todo-task-card dragging"
                            : "todo-task-card"
                        }
                        key={todo.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, todo)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="todo-task-main">
                          <button
                            type="button"
                            className={normalizeStatus(todo) === "completed" ? "todo-check done" : "todo-check"}
                            onClick={() => (
                              normalizeStatus(todo) === "completed"
                                ? moveTodo(todo, "open")
                                : moveTodo(todo, "completed")
                            )}
                            title="クリックで完了/未完了を切り替え"
                          >
                            {normalizeStatus(todo) === "completed" ? "✓" : ""}
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

                          <div className="todo-move-actions">
                            {STATUS_COLUMNS.filter((item) => item.key !== normalizeStatus(todo)).map((item) => (
                              <button
                                type="button"
                                key={item.key}
                                onClick={() => moveTodo(todo, item.key)}
                              >
                                {item.title}
                              </button>
                            ))}
                          </div>

                          <button type="button" className="danger" onClick={() => deleteTodo(todo.id)}>
                            削除
                          </button>
                        </div>
                      </article>
                    ))}

                    {columnTodos.length === 0 && (
                      <div className="todo-empty small">
                        ここへドラッグできます。
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section className="panel todo-right-panel">
          <h2>バックログ</h2>

          <div className="backlog-list">
            {backlogTodos.map((todo) => (
              <div
                className="backlog-row"
                key={todo.id}
                draggable
                onDragStart={(event) => handleDragStart(event, todo)}
                onDragEnd={handleDragEnd}
              >
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