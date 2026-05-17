from pathlib import Path
from copy import deepcopy

SETTINGS_PATH = Path(__file__).resolve().parent.parent / "app_settings.json"

DEFAULT_SETTINGS = {
    "git": {
        "auto_refresh": True,
        "refresh_interval_minutes": 5,
        "target_branch": "main",
        "scan_on_startup": True,
    },
    "dashboard": {
        "show_alerts": True,
        "show_tech_chart": True,
        "show_today_todos": True,
        "uncommitted_warning_count": 5,
        "inactive_days_warning": 7,
        "todo_stale_days": 5,
    },
    "todo": {
        "default_priority": "medium",
        "default_status": "open",
        "hide_done_after_days": 7,
        "types": ["Feature", "Bug", "Improve", "Docs", "Refactor"],
    },
    "worklog": {
        "commit_minutes": 30,
        "todo_completed_minutes": 15,
        "todo_created_minutes": 10,
        "show_commits": True,
        "show_todo_created": True,
        "show_todo_completed": True,
        "initial_date": "today",
    },
    "appearance": {
        "theme": "dark",
        "accent_color": "blue",
        "compact_mode": False,
        "fit_one_screen": True,
    },
    "ai": {
        "summary_enabled": True,
        "suggest_next_action": True,
        "summary_length": "normal",
        "include_readme": True,
        "include_todos": True,
        "include_commits": True,
        "include_worklogs": True,
        "include_tech_stack": True,
    },
    "github": {
        "enabled": False,
        "token": None,
        "username": None,
        "avatar_url": None,
        "html_url": None,
    },
}


def deep_merge(base, override):
    result = deepcopy(base)

    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value

    return result


def get_settings():
    if not SETTINGS_PATH.exists():
        save_settings(DEFAULT_SETTINGS)
        return deepcopy(DEFAULT_SETTINGS)

    import json

    try:
        data = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    except Exception:
        data = {}

    return deep_merge(DEFAULT_SETTINGS, data)


def save_settings(settings):
    import json

    SETTINGS_PATH.write_text(
        json.dumps(settings, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def update_settings(payload):
    current = get_settings()
    next_settings = deep_merge(current, payload)
    save_settings(next_settings)
    return next_settings


def reset_settings():
    save_settings(DEFAULT_SETTINGS)
    return deepcopy(DEFAULT_SETTINGS)