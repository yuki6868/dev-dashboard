import platform
import subprocess
from pathlib import Path


def select_folder(initial_dir: str | None = None) -> dict:
    start_dir = initial_dir if initial_dir and Path(initial_dir).exists() else str(Path.home())

    if platform.system() == "Darwin":
        script = (
            'POSIX path of '
            f'(choose folder with prompt "プロジェクトフォルダを選択" default location POSIX file "{start_dir}")'
        )

        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "path": "",
                "error": result.stderr.strip() or "フォルダ選択をキャンセルしました。",
            }

        return {
            "success": True,
            "path": result.stdout.strip().rstrip("/"),
        }

    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)

        selected = filedialog.askdirectory(
            title="プロジェクトフォルダを選択",
            initialdir=start_dir,
        )

        root.destroy()

        return {
            "success": bool(selected),
            "path": selected,
            "error": "" if selected else "フォルダ選択をキャンセルしました。",
        }
    except Exception as e:
        return {
            "success": False,
            "path": "",
            "error": str(e),
        }