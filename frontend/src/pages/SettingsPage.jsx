import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { clearApiCache } from "../services/api";

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      className={checked ? "settings-toggle on" : "settings-toggle"}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [github, setGithub] = useState(null);
  const [githubToken, setGithubToken] = useState("");
  const [githubMessage, setGithubMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchGithubStatus();
  }, []);

  async function fetchSettings() {
    setSettingsError("");

    try {
        const res = await api.get("/api/settings");
        setSettings(res.data);
        localStorage.setItem("dev-dashboard-settings", JSON.stringify(res.data));
        window.dispatchEvent(new CustomEvent("dev-dashboard-settings-updated", {
        detail: res.data,
        }));
    } catch (error) {
        setSettingsError(
        error?.response?.data?.detail ||
        error.message ||
        "設定の取得に失敗しました。"
        );
    }
  }

  async function fetchGithubStatus() {
    try {
      const res = await api.get("/api/github/status");
      setGithub(res.data);
    } catch (error) {
      setGithubMessage("GitHub連携状態の取得に失敗しました。");
    }
  }

  async function connectGithub() {
    setGithubMessage("");

    if (!githubToken.trim()) {
      setGithubMessage("GitHub tokenを入力してください。");
      return;
    }

    try {
      const res = await api.post("/api/github/connect", {
        token: githubToken.trim(),
      });

      if (!res.data.ok) {
        const detail = res.data.detail ? ` 詳細: ${res.data.detail}` : "";
        const status = res.data.status ? ` status=${res.data.status}` : "";

        setGithubMessage(
          `${res.data.error || "GitHub連携に失敗しました。"}${status}${detail}`,
        );
        return;
      }

      setGithub(res.data.github);
      setGithubToken("");
      setGithubMessage("GitHubアカウントを連携しました。");
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error.message ||
        "GitHub連携に失敗しました。";

      setGithubMessage(`GitHub連携に失敗しました。詳細: ${message}`);
    }
  }

  async function disconnectGithub() {
    try {
      const res = await api.post("/api/github/disconnect");
      setGithub(res.data.github);
      setGithubToken("");
      setGithubMessage("GitHub連携を解除しました。");
    } catch (error) {
      setGithubMessage("GitHub連携解除に失敗しました。");
    }
  }

  function patch(section, key, value) {
    setSettings((current) => ({
        ...current,
        [section]: {
        ...(current?.[section] || {}),
        [key]: value,
        },
    }));

    setSaved(false);
    setSettingsError("");
  }

  function patchTodoTypes(value) {
    patch(
      "todo",
      "types",
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  async function save() {
    setSaving(true);
    setSettingsError("");

    try {
        const res = await api.put("/api/settings", settings);

        setSettings(res.data);
        localStorage.setItem("dev-dashboard-settings", JSON.stringify(res.data));

        clearApiCache();

        window.dispatchEvent(new CustomEvent("dev-dashboard-settings-updated", {
        detail: res.data,
        }));

        setSaved(true);
    } catch (error) {
        setSettingsError(
        error?.response?.data?.detail ||
        error.message ||
        "設定の保存に失敗しました。"
        );
    } finally {
        setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    setSettingsError("");

    try {
        const res = await api.post("/api/settings/reset");

        setSettings(res.data);
        localStorage.setItem("dev-dashboard-settings", JSON.stringify(res.data));

        clearApiCache();

        window.dispatchEvent(new CustomEvent("dev-dashboard-settings-updated", {
        detail: res.data,
        }));

        setSaved(true);
    } catch (error) {
        setSettingsError(
        error?.response?.data?.detail ||
        error.message ||
        "設定の初期化に失敗しました。"
        );
    } finally {
        setSaving(false);
    }
  }

  if (!settings) {
    return <div className="devos-shell settings-loading">設定を読み込み中...</div>;
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
          <Link to="/projects">□ プロジェクト</Link>
          <Link to="/todos">✦ TODO</Link>
          <Link to="/logs">▤ 作業ログ</Link>
          <Link className="active" to="/settings">⚙ 設定</Link>
        </nav>

        <div className="sync-state">
          {saved ? <span className="saved">保存済み</span> : <span>未保存</span>}
          <button type="button" onClick={save} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </header>

      <main className="settings-page">
        <section className="settings-head panel">
          <div>
            <h1>設定</h1>
            <p>Git取得、表示、TODO、作業ログ、AI連携の動作をまとめて調整します。</p>
          </div>

          <button type="button" className="settings-reset" onClick={reset}>
            初期値に戻す
          </button>
          {settingsError ? (
            <p className="settings-error">{settingsError}</p>
          ) : null}
        </section>

        <section className="settings-grid">
          <div className="panel settings-card">
            <h2>Git取得設定</h2>

            <Field label="自動更新">
              <Toggle
                checked={settings.git.auto_refresh}
                onChange={(value) => patch("git", "auto_refresh", value)}
              />
            </Field>

            <Field label="更新間隔">
              <input
                type="number"
                min="1"
                value={settings.git.refresh_interval_minutes}
                onChange={(e) => patch("git", "refresh_interval_minutes", Number(e.target.value))}
              />
            </Field>

            <Field label="対象ブランチ">
              <input
                value={settings.git.target_branch}
                onChange={(e) => patch("git", "target_branch", e.target.value)}
              />
            </Field>

            <Field label="エディタ起動コマンド">
            <input
                value={settings.editor?.command || "code"}
                onChange={(e) => patch("editor", "command", e.target.value)}
                placeholder="code"
            />
            </Field>

            <small className="settings-help">
            例: code / cursor / Visual Studio Code.app / Cursor.app
            </small>

            <Field label="起動時に再スキャン">
              <Toggle
                checked={settings.git.scan_on_startup}
                onChange={(value) => patch("git", "scan_on_startup", value)}
              />
            </Field>
          </div>

          <div className="panel settings-card">
            <h2>ダッシュボード表示</h2>

            <Field label="アラート表示">
              <Toggle checked={settings.dashboard.show_alerts} onChange={(v) => patch("dashboard", "show_alerts", v)} />
            </Field>

            <Field label="技術構成グラフ">
              <Toggle checked={settings.dashboard.show_tech_chart} onChange={(v) => patch("dashboard", "show_tech_chart", v)} />
            </Field>

            <Field label="今日やること">
              <Toggle checked={settings.dashboard.show_today_todos} onChange={(v) => patch("dashboard", "show_today_todos", v)} />
            </Field>

            <Field label="未コミット警告数">
              <input type="number" value={settings.dashboard.uncommitted_warning_count} onChange={(e) => patch("dashboard", "uncommitted_warning_count", Number(e.target.value))} />
            </Field>

            <Field label="未更新警告日数">
              <input type="number" value={settings.dashboard.inactive_days_warning} onChange={(e) => patch("dashboard", "inactive_days_warning", Number(e.target.value))} />
            </Field>

            <Field label="TODO放置日数">
              <input type="number" value={settings.dashboard.todo_stale_days} onChange={(e) => patch("dashboard", "todo_stale_days", Number(e.target.value))} />
            </Field>
          </div>

          <div className="panel settings-card">
            <h2>TODO設定</h2>

            <Field label="初期優先度">
              <select value={settings.todo.default_priority} onChange={(e) => patch("todo", "default_priority", e.target.value)}>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </Field>

            <Field label="初期ステータス">
              <select value={settings.todo.default_status} onChange={(e) => patch("todo", "default_status", e.target.value)}>
                <option value="open">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Done</option>
              </select>
            </Field>

            <Field label="Done非表示日数">
              <input type="number" value={settings.todo.hide_done_after_days} onChange={(e) => patch("todo", "hide_done_after_days", Number(e.target.value))} />
            </Field>

            <Field label="TODO種類">
              <input value={settings.todo.types.join(", ")} onChange={(e) => patchTodoTypes(e.target.value)} />
            </Field>
          </div>

          <div className="panel settings-card">
            <h2>作業ログ設定</h2>

            <Field label="1コミットの分数">
              <input type="number" value={settings.worklog.commit_minutes} onChange={(e) => patch("worklog", "commit_minutes", Number(e.target.value))} />
            </Field>

            <Field label="TODO完了の分数">
              <input type="number" value={settings.worklog.todo_completed_minutes} onChange={(e) => patch("worklog", "todo_completed_minutes", Number(e.target.value))} />
            </Field>

            <Field label="TODO作成の分数">
              <input type="number" value={settings.worklog.todo_created_minutes} onChange={(e) => patch("worklog", "todo_created_minutes", Number(e.target.value))} />
            </Field>

            <Field label="コミット表示">
              <Toggle checked={settings.worklog.show_commits} onChange={(v) => patch("worklog", "show_commits", v)} />
            </Field>

            <Field label="TODO作成表示">
              <Toggle checked={settings.worklog.show_todo_created} onChange={(v) => patch("worklog", "show_todo_created", v)} />
            </Field>

            <Field label="TODO完了表示">
              <Toggle checked={settings.worklog.show_todo_completed} onChange={(v) => patch("worklog", "show_todo_completed", v)} />
            </Field>
          </div>

          <div className="panel settings-card">
            <h2>見た目設定</h2>

            <Field label="テーマ">
              <select value={settings.appearance.theme} onChange={(e) => patch("appearance", "theme", e.target.value)}>
                <option value="dark">ダーク</option>
                <option value="light">ライト</option>
              </select>
            </Field>

            <Field label="アクセントカラー">
              <select value={settings.appearance.accent_color} onChange={(e) => patch("appearance", "accent_color", e.target.value)}>
                <option value="blue">ブルー</option>
                <option value="purple">パープル</option>
                <option value="green">グリーン</option>
                <option value="orange">オレンジ</option>
              </select>
            </Field>

            <Field label="コンパクト表示">
              <Toggle checked={settings.appearance.compact_mode} onChange={(v) => patch("appearance", "compact_mode", v)} />
            </Field>

            <Field label="1画面に収める">
              <Toggle checked={settings.appearance.fit_one_screen} onChange={(v) => patch("appearance", "fit_one_screen", v)} />
            </Field>
          </div>

          <div className="panel settings-card">
            <h2>AI用設定</h2>

            <Field label="AIサマリー">
              <Toggle checked={settings.ai.summary_enabled} onChange={(v) => patch("ai", "summary_enabled", v)} />
            </Field>

            <Field label="次にやること提案">
              <Toggle checked={settings.ai.suggest_next_action} onChange={(v) => patch("ai", "suggest_next_action", v)} />
            </Field>

            <Field label="要約の長さ">
              <select value={settings.ai.summary_length} onChange={(e) => patch("ai", "summary_length", e.target.value)}>
                <option value="short">短め</option>
                <option value="normal">標準</option>
                <option value="long">長め</option>
              </select>
            </Field>

            {[
              ["include_readme", "README"],
              ["include_todos", "TODO"],
              ["include_commits", "コミット履歴"],
              ["include_worklogs", "作業ログ"],
              ["include_tech_stack", "技術構成"],
            ].map(([key, label]) => (
              <Field key={key} label={`AIに渡す: ${label}`}>
                <Toggle checked={settings.ai[key]} onChange={(v) => patch("ai", key, v)} />
              </Field>
            ))}
          </div>
          <div className="panel settings-card github-settings-card">
            <h2>GitHubアカウント連携</h2>

            {github?.connected ? (
              <div className="github-connected-box">
                {github.avatar_url ? (
                  <img
                    className="github-avatar"
                    src={github.avatar_url}
                    alt="GitHub avatar"
                  />
                ) : null}

                <div>
                  <b>{github.username}</b>
                  <p>GitHub連携済み</p>
                  <small>token: {github.token_masked}</small>
                </div>
              </div>
            ) : (
              <p className="github-help">
                GitHub Personal Access Tokenを登録すると、GitHub上のリポジトリ情報を取得してダッシュボードに反映できます。
              </p>
            )}

            <Field label="GitHub Personal Access Token">
              <input
                type="password"
                placeholder="github_pat_..."
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
              />
            </Field>

            <div className="github-actions">
              <button type="button" onClick={connectGithub}>
                連携する
              </button>

              {github?.connected ? (
                <button
                  type="button"
                  className="danger"
                  onClick={disconnectGithub}
                >
                  連携解除
                </button>
              ) : null}
            </div>

            {githubMessage ? (
              <p className="github-message">{githubMessage}</p>
            ) : null}

            <div className="github-note">
              <b>必要な権限</b>
              <span>public_repo: 公開リポジトリ取得</span>
              <span>repo: privateリポジトリも取得したい場合</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}