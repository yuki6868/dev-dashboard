import logging
import shutil
import subprocess
from pathlib import Path


logger = logging.getLogger("dev_dashboard.errors")


def project_error(
    code: str,
    message: str,
    local_path: str | None = None,
    action: str = "skip",
) -> dict:
    payload = {
        "code": code,
        "message": message,
        "local_path": local_path,
        "action": action,
    }
    logger.warning("[project-error] %s", payload)
    return payload


def validate_local_path(local_path: str) -> dict | None:
    path = Path(local_path)

    if not path.exists():
        return project_error(
            code="LOCAL_PATH_NOT_FOUND",
            message=f"local_path does not exist: {local_path}",
            local_path=local_path,
            action="skip",
        )

    if not path.is_dir():
        return project_error(
            code="LOCAL_PATH_NOT_DIRECTORY",
            message=f"local_path is not a directory: {local_path}",
            local_path=local_path,
            action="skip",
        )

    return None


def validate_git_repo(local_path: str) -> dict | None:
    path_error = validate_local_path(local_path)
    if path_error:
        return path_error

    git_dir = Path(local_path) / ".git"
    if not git_dir.exists():
        return project_error(
            code="GIT_DIRECTORY_NOT_FOUND",
            message=f".git directory not found: {local_path}",
            local_path=local_path,
            action="skip",
        )

    return None


def run_git_command(local_path: str, args: list[str], timeout: int = 10) -> tuple[bool, str]:
    repo_error = validate_git_repo(local_path)
    if repo_error:
        return False, repo_error["message"]

    try:
        result = subprocess.run(
            ["git", *args],
            cwd=local_path,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        if result.returncode != 0:
            message = result.stderr.strip() or result.stdout.strip() or "git command failed"
            project_error(
                code="GIT_COMMAND_FAILED",
                message=f"git {' '.join(args)} failed: {message}",
                local_path=local_path,
                action="skip",
            )
            return False, message

        return True, result.stdout.strip()

    except PermissionError as e:
        message = f"Permission denied: {e}"
        project_error("PERMISSION_ERROR", message, local_path, "skip")
        return False, message

    except subprocess.TimeoutExpired:
        message = f"git {' '.join(args)} timed out"
        project_error("GIT_COMMAND_TIMEOUT", message, local_path, "skip")
        return False, message

    except FileNotFoundError:
        message = "git command not found"
        project_error("GIT_COMMAND_NOT_FOUND", message, local_path, "skip")
        return False, message

    except Exception as e:
        message = str(e)
        project_error("UNKNOWN_GIT_ERROR", message, local_path, "skip")
        return False, message


def has_code_command() -> bool:
    return shutil.which("code") is not None