from pathlib import Path
from shutil import which
from urllib.parse import urlparse

from .readme_service import find_readme_path


def diagnose_project(project) -> dict:
    local_path = project.local_path or ""
    base = Path(local_path).expanduser() if local_path else None

    checks = []

    def add(key, label, ok, message):
        checks.append({
            "key": key,
            "label": label,
            "ok": bool(ok),
            "message": message,
        })

    path_exists = bool(base and base.exists() and base.is_dir())
    add(
        "local_path",
        "local_path が存在する",
        path_exists,
        local_path if path_exists else "local_path が存在しません。",
    )

    git_exists = bool(path_exists and (base / ".git").exists())
    add(
        "git",
        ".git がある",
        git_exists,
        ".git を確認しました。" if git_exists else "Git管理フォルダではありません。",
    )

    readme_path = find_readme_path(str(base)) if path_exists else None
    add(
        "readme",
        "README がある",
        readme_path is not None,
        str(readme_path) if readme_path else "README.md が見つかりません。",
    )

    github_url = project.github_url or ""
    parsed = urlparse(github_url)
    github_ok = (
        parsed.scheme in ["http", "https"]
        and parsed.netloc == "github.com"
        and len(parsed.path.strip("/").split("/")) >= 2
    )

    add(
        "github_url",
        "GitHub URL が正しい",
        github_ok,
        github_url if github_ok else "https://github.com/owner/repo 形式にしてください。",
    )

    code_path = which("code")
    add(
        "vscode",
        "VS Code 起動コマンドが使える",
        code_path is not None,
        code_path or "code コマンドが見つかりません。",
    )

    return {
        "ok": all(item["ok"] for item in checks),
        "checks": checks,
    }