from datetime import datetime, date, timedelta
from collections import defaultdict
from pathlib import Path
import subprocess

from sqlalchemy.orm import Session

from . import models
from .error_service import run_git_command

from .settings_service import get_settings


def parse_date(value):
    if value is None:
        return None


    if isinstance(value, datetime):
        return value

    text = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def run_git(local_path: str, args: list[str]):
    return run_git_command(local_path, args)


def get_git_commits(project, target_date: date):
    since = f"{target_date.isoformat()} 00:00:00"
    until = f"{target_date.isoformat()} 23:59:59"

    ok, output = run_git(
        project.local_path,
        [
            "log",
            f"--since={since}",
            f"--until={until}",
            "--pretty=format:%H%x1f%h%x1f%ad%x1f%s",
            "--date=iso",
            "--numstat",
        ],
    )

    if not ok or not output:
        return []

    entries = []
    current = None

    for line in output.splitlines():
        if "\x1f" in line:
            if current:
                entries.append(current)

            full_hash, short_hash, committed_at, message = line.split("\x1f", 3)

            current = {
                "type": "commit",
                "time": committed_at,
                "project_id": project.id,
                "project_name": project.name,
                "title": message,
                "description": "",
                "branch": None,
                "commit_hash": short_hash,
                "files_count": 0,
                "additions": 0,
                "deletions": 0,
            }
            continue

        if current and line.strip():
            parts = line.split("\t")
            if len(parts) >= 3:
                add, delete, _filename = parts[:3]

                current["files_count"] += 1

                if add.isdigit():
                    current["additions"] += int(add)

                if delete.isdigit():
                    current["deletions"] += int(delete)

    if current:
        entries.append(current)

    return entries


def get_worklog(db: Session, target_date_text: str | None = None):
    target_date = (
        datetime.fromisoformat(target_date_text).date()
        if target_date_text
        else date.today()
    )

    projects = db.query(models.Project).all()
    todos = db.query(models.Todo).all()

    entries = []

    for project in projects:
        entries.extend(get_git_commits(project, target_date))

    for todo in todos:
        project = next((item for item in projects if item.id == todo.project_id), None)
        project_name = project.name if project else f"Project {todo.project_id}"

        created_at = parse_date(todo.created_at)
        completed_at = parse_date(todo.completed_at)

        if created_at and created_at.date() == target_date:
            entries.append({
                "type": "todo_created",
                "time": created_at.isoformat(),
                "project_id": todo.project_id,
                "project_name": project_name,
                "title": todo.title,
                "description": todo.description or "",
                "todo_type": todo.todo_type,
                "priority": todo.priority,
            })

        if completed_at and completed_at.date() == target_date:
            entries.append({
                "type": "todo_completed",
                "time": completed_at.isoformat(),
                "project_id": todo.project_id,
                "project_name": project_name,
                "title": todo.title,
                "description": todo.description or "",
                "todo_type": todo.todo_type,
                "priority": todo.priority,
            })

    entries.sort(key=lambda item: item.get("time") or "", reverse=True)

    project_minutes = defaultdict(int)
    type_counts = defaultdict(int)

    settings = get_settings()
    worklog_settings = settings.get("worklog", {})

    commit_minutes = int(worklog_settings.get("commit_minutes", 30))
    todo_completed_minutes = int(worklog_settings.get("todo_completed_minutes", 15))
    todo_created_minutes = int(worklog_settings.get("todo_created_minutes", 10))

    for entry in entries:
        type_counts[entry["type"]] += 1

        if entry["type"] == "commit":
            project_minutes[entry["project_name"]] += commit_minutes
        elif entry["type"] == "todo_completed":
            project_minutes[entry["project_name"]] += todo_completed_minutes
        elif entry["type"] == "todo_created":
            project_minutes[entry["project_name"]] += todo_created_minutes

    commit_count = type_counts["commit"]
    completed_count = type_counts["todo_completed"]
    created_count = type_counts["todo_created"]

    estimated_minutes = (
        commit_count * commit_minutes
        + completed_count * todo_completed_minutes
        + created_count * todo_created_minutes
    )

    recent_projects = [
        {
            "name": name,
            "hours": round(minutes / 60, 1),
        }
        for name, minutes in sorted(
            project_minutes.items(),
            key=lambda item: item[1],
            reverse=True,
        )[:5]
    ]

    daily_counts = []

    for i in range(6, -1, -1):
        day = date.today() - timedelta(days=i)
        todo_count = 0
        commit_count_for_day = 0

        for project in projects:
            commit_count_for_day += len(get_git_commits(project, day))

        for todo in todos:
            created_at = parse_date(todo.created_at)
            completed_at = parse_date(todo.completed_at)

            if created_at and created_at.date() == day:
                todo_count += 1

            if completed_at and completed_at.date() == day:
                todo_count += 1

        daily_counts.append({
            "date": day.isoformat(),
            "label": day.strftime("%m/%d"),
            "count": todo_count,
            "commit_count": commit_count_for_day,
            "todo_count": todo_count,
        })

    return {
        "date": target_date.isoformat(),
        "summary": {
            "estimated_hours": round(estimated_minutes / 60, 1),
            "commit_count": commit_count,
            "completed_todo_count": completed_count,
            "created_todo_count": created_count,
            "activity_count": len(entries),
        },
        "entries": entries,
        "daily_counts": daily_counts,
        "recent_projects": recent_projects,
        "type_counts": dict(type_counts),
    }