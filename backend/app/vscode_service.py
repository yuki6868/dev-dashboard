import subprocess
from pathlib import Path


def open_project_in_vscode(local_path: str):
    path = Path(local_path)

    if not path.exists():
        return {
            "success": False,
            "error": f"Path does not exist: {local_path}",
        }

    try:
        result = subprocess.run(
            ["code", local_path],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": result.stderr.strip(),
            }

        return {
            "success": True,
            "message": "VS Code opened",
        }

    except FileNotFoundError:
        return {
            "success": False,
            "error": (
                "VS Code command not found. "
                "Enable 'Shell Command: Install code command in PATH'"
            ),
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }