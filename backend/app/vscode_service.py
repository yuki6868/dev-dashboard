import subprocess
from pathlib import Path
import shlex

from .error_service import project_error, validate_local_path
from .settings_service import get_settings


def build_editor_command(command: str, local_path: str) -> list[str]:
    command = (command or "code").strip()
    path = str(Path(local_path))

    if command.endswith(".app"):
        return ["open", "-a", command, path]

    parts = shlex.split(command)

    if not parts:
        return ["code", path]

    return [*parts, path]


def open_project_in_vscode(local_path: str):
    path_error = validate_local_path(local_path)

    if path_error:
        return {
            "success": False,
            "error": path_error["message"],
        }

    settings = get_settings()
    editor_command = settings.get("editor", {}).get("command", "code")

    try:
        command = build_editor_command(editor_command, local_path)

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode != 0:
            message = result.stderr.strip() or result.stdout.strip() or "editor command failed"
            project_error("EDITOR_COMMAND_FAILED", message, local_path, "skip")

            return {
                "success": False,
                "error": message,
                "command": command,
            }

        return {
            "success": True,
            "message": "Editor opened",
            "command": command,
        }

    except FileNotFoundError:
        message = f"Editor command not found: {editor_command}"
        project_error("EDITOR_COMMAND_NOT_FOUND", message, local_path, "skip")

        return {
            "success": False,
            "error": message,
        }

    except PermissionError as e:
        message = f"Permission denied: {e}"
        project_error("PERMISSION_ERROR", message, local_path, "skip")

        return {
            "success": False,
            "error": message,
        }

    except Exception as e:
        message = str(e)
        project_error("UNKNOWN_EDITOR_ERROR", message, local_path, "skip")

        return {
            "success": False,
            "error": message,
        }