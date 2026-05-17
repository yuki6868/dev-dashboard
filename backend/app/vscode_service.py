import subprocess
from pathlib import Path

from .error_service import has_code_command, project_error, validate_local_path


def open_project_in_vscode(local_path: str):
    path_error = validate_local_path(local_path)
    if path_error:
        return {
            "success": False,
            "error": path_error["message"],
        }

    if not has_code_command():
        message = (
            "code command not found. VS Codeで "
            "'Shell Command: Install code command in PATH' を実行してください。"
        )
        project_error("CODE_COMMAND_NOT_FOUND", message, local_path, "skip")
        return {
            "success": False,
            "error": message,
        }

    try:
        result = subprocess.run(
            ["code", str(Path(local_path))],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode != 0:
            message = result.stderr.strip() or result.stdout.strip() or "code command failed"
            project_error("CODE_COMMAND_FAILED", message, local_path, "skip")
            return {
                "success": False,
                "error": message,
            }

        return {
            "success": True,
            "message": "VS Code opened",
        }

    except PermissionError as e:
        message = f"Permission denied: {e}"
        project_error("PERMISSION_ERROR", message, local_path, "skip")
        return {"success": False, "error": message}

    except Exception as e:
        message = str(e)
        project_error("UNKNOWN_VSCODE_ERROR", message, local_path, "skip")
        return {"success": False, "error": message}