from datetime import datetime, timezone
from sqlalchemy.orm import Session

from . import models


def parse_git_datetime(value: str | None):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def get_days_since(dt):
    if dt is None:
        return None

    now = datetime.now(timezone.utc)

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return (now - dt).days


def detect_inactivity(db: Session):
    projects = db.query(models.Project).all()
    results = []

    for project in projects:
        latest_snapshot = (
            db.query(models.GitSnapshot)
            .filter(models.GitSnapshot.project_id == project.id)
            .order_by(models.GitSnapshot.created_at.desc())
            .first()
        )

        status = "正常"
        reasons = []
        days_since_commit = None

        if project.status in ["paused", "stopped", "停止中"]:
            status = "停止中"
            reasons.append("プロジェクトが停止中のため警告対象外")
        elif latest_snapshot is None:
            status = "要整理"
            reasons.append("Git状態がまだ取得されていない")
        elif latest_snapshot.error_message:
            status = "要整理"
            reasons.append(latest_snapshot.error_message)
        else:
            latest_commit_dt = parse_git_datetime(latest_snapshot.latest_commit_at)
            days_since_commit = get_days_since(latest_commit_dt)

            if days_since_commit is None:
                status = "要整理"
                reasons.append("最新コミット日時を取得できない")
            elif days_since_commit >= 30:
                status = "放置気味"
                reasons.append(f"{days_since_commit}日以上コミットがない")
            elif days_since_commit >= 14:
                status = "注意"
                reasons.append(f"{days_since_commit}日コミットがない")

            if latest_snapshot.has_uncommitted_changes:
                reasons.append("未コミット変更が残っている")

                if status == "正常":
                    status = "注意"

        open_todo_count = (
            db.query(models.Todo)
            .filter(
                models.Todo.project_id == project.id,
                models.Todo.is_completed == False,
            )
            .count()
        )

        if open_todo_count >= 10 and status == "正常":
            status = "注意"
            reasons.append("未完了TODOが多い")

        results.append({
            "project_id": project.id,
            "project_name": project.name,
            "status": status,
            "reasons": reasons,
            "days_since_commit": days_since_commit,
            "open_todo_count": open_todo_count,
        })

    return results