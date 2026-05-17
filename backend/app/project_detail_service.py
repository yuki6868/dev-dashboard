import subprocess
from pathlib import Path
from datetime import datetime
from .error_service import run_git_command

def run_git(local_path: str, args: list[str]) -> tuple[bool, str]:
    return run_git_command(local_path, args)


def get_recent_commits(local_path: str, limit: int = 8) -> list[dict]:
    ok, output = run_git(
        local_path,
        [
            "log",
            f"-{limit}",
            "--pretty=format:%H%x1f%h%x1f%s%x1f%cI",
        ],
    )

    if not ok or not output:
        return []

    commits = []

    for line in output.splitlines():
        parts = line.split("\x1f")
        if len(parts) != 4:
            continue

        full_hash, short_hash, message, committed_at = parts

        commits.append(
            {
                "hash": full_hash,
                "short_hash": short_hash,
                "message": message,
                "committed_at": committed_at,
            }
        )

    return commits


def get_commit_count(local_path: str) -> int:
    ok, output = run_git(local_path, ["rev-list", "--count", "HEAD"])

    if not ok:
        return 0

    try:
        return int(output)
    except ValueError:
        return 0


def get_active_branches_count(local_path: str) -> int:
    ok, output = run_git(local_path, ["branch", "--all"])

    if not ok or not output:
        return 0

    return len([line for line in output.splitlines() if line.strip()])


def get_contributors(local_path: str) -> list[dict]:
    ok, output = run_git(local_path, ["shortlog", "-sn", "--all"])

    if not ok or not output:
        return []

    rows = []

    for line in output.splitlines():
        body = line.strip()
        if not body:
            continue

        parts = body.split(maxsplit=1)
        if len(parts) != 2:
            continue

        count, name = parts

        try:
            commits = int(count)
        except ValueError:
            commits = 0

        rows.append(
            {
                "name": name,
                "commits": commits,
            }
        )

    total = sum(row["commits"] for row in rows) or 1

    for row in rows:
        row["percentage"] = round(row["commits"] / total * 100)

    return rows[:5]


def get_project_detail_summary(local_path: str, todos: list) -> dict:
    commits = get_recent_commits(local_path)
    commit_count = get_commit_count(local_path)
    branch_count = get_active_branches_count(local_path)
    contributors = get_contributors(local_path)

    open_todos = [todo for todo in todos if not todo.is_completed]
    done_todos = [todo for todo in todos if todo.is_completed]

    latest_commit = commits[0] if commits else None

    return {
        "commit_count": commit_count,
        "branch_count": branch_count,
        "recent_commits": commits,
        "contributors": contributors,
        "open_issues_count": len(open_todos),
        "closed_issues_count": len(done_todos),
        "latest_commit": latest_commit,
        "generated_at": datetime.now().isoformat(),
    }