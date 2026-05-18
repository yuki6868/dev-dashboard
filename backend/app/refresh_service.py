from datetime import datetime, timezone

REFRESH_STATUS = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def status_key(project_id: int, kind: str):
    return f"{project_id}:{kind}"


def start_refresh(project_id: int, kind: str):
    REFRESH_STATUS[status_key(project_id, kind)] = {
        "kind": kind,
        "state": "running",
        "message": "更新中",
        "started_at": now_iso(),
        "finished_at": None,
        "error": None,
    }


def finish_refresh(project_id: int, kind: str, message: str, error: str | None = None):
    REFRESH_STATUS[status_key(project_id, kind)] = {
        **REFRESH_STATUS.get(status_key(project_id, kind), {}),
        "kind": kind,
        "state": "failed" if error else "success",
        "message": message,
        "finished_at": now_iso(),
        "error": error,
    }


def get_project_refresh_status(project_id: int):
    result = {}

    for key, value in REFRESH_STATUS.items():
        if key.startswith(f"{project_id}:"):
            result[value["kind"]] = value

    return result