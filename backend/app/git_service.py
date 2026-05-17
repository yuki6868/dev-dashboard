import subprocess
from pathlib import Path


def run_git_command(local_path: str, args: list[str]) -> tuple[bool, str]:
    path = Path(local_path)

    if not path.exists():
        return False, f"Path does not exist: {local_path}"

    try:
        result = subprocess.run(
            ["git", *args],
            cwd=local_path,
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode != 0:
            return False, result.stderr.strip()

        return True, result.stdout.strip()

    except Exception as e:
        return False, str(e)


def get_git_status(local_path: str) -> dict:
    status = {
        "branch": None,
        "latest_commit_hash": None,
        "latest_commit_message": None,
        "latest_commit_at": None,
        "has_uncommitted_changes": False,
        "changed_files_count": 0,
        "ahead": 0,
        "behind": 0,
        "error_message": None,
    }

    ok, output = run_git_command(local_path, ["rev-parse", "--is-inside-work-tree"])
    if not ok or output != "true":
        status["error_message"] = output or "Not a git repository"
        return status

    commands = {
        "branch": ["rev-parse", "--abbrev-ref", "HEAD"],
        "latest_commit_hash": ["log", "-1", "--pretty=format:%H"],
        "latest_commit_message": ["log", "-1", "--pretty=format:%s"],
        "latest_commit_at": ["log", "-1", "--pretty=format:%cI"],
    }

    for key, args in commands.items():
        ok, output = run_git_command(local_path, args)
        if ok:
            status[key] = output
        else:
            status["error_message"] = output

    ok, output = run_git_command(local_path, ["status", "--porcelain"])
    if ok:
        lines = [line for line in output.splitlines() if line.strip()]
        status["changed_files_count"] = len(lines)
        status["has_uncommitted_changes"] = len(lines) > 0

    ok, output = run_git_command(
        local_path,
        ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
    )

    if ok and output:
        parts = output.split()
        if len(parts) == 2:
            status["ahead"] = int(parts[0])
            status["behind"] = int(parts[1])

    return status