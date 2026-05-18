from sqlalchemy.orm import Session

from . import models, schemas


def get_projects(db: Session):
    return db.query(models.Project).order_by(models.Project.updated_at.desc()).all()


def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_project_by_github_url(db: Session, github_url: str):
    if not github_url:
        return None

    return (
        db.query(models.Project)
        .filter(models.Project.github_url == github_url)
        .first()
    )

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def update_project(db: Session, project_id: int, project: schemas.ProjectUpdate):
    db_project = get_project(db, project_id)

    if db_project is None:
        return None

    update_data = project.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_project, key, value)

    db.commit()
    db.refresh(db_project)
    return db_project


def delete_project(db: Session, project_id: int):
    db_project = get_project(db, project_id)

    if db_project is None:
        return False

    db.delete(db_project)
    db.commit()
    return True

def create_git_snapshot(db: Session, project_id: int, git_status: dict):
    db_snapshot = models.GitSnapshot(
        project_id=project_id,
        branch=git_status.get("branch"),
        latest_commit_hash=git_status.get("latest_commit_hash"),
        latest_commit_message=git_status.get("latest_commit_message"),
        latest_commit_at=git_status.get("latest_commit_at"),
        has_uncommitted_changes=git_status.get("has_uncommitted_changes", False),
        changed_files_count=git_status.get("changed_files_count", 0),
        ahead=git_status.get("ahead", 0),
        behind=git_status.get("behind", 0),
        error_message=git_status.get("error_message"),
    )

    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    return db_snapshot


def get_latest_git_snapshot(db: Session, project_id: int):
    return (
        db.query(models.GitSnapshot)
        .filter(models.GitSnapshot.project_id == project_id)
        .order_by(models.GitSnapshot.created_at.desc())
        .first()
    )

from datetime import datetime


def get_todos(db: Session, project_id: int | None = None):
    query = db.query(models.Todo)

    if project_id is not None:
        query = query.filter(models.Todo.project_id == project_id)

    return query.order_by(models.Todo.created_at.desc()).all()


def get_todo(db: Session, todo_id: int):
    return db.query(models.Todo).filter(models.Todo.id == todo_id).first()


def create_todo(db: Session, todo: schemas.TodoCreate):
    db_todo = models.Todo(**todo.model_dump())
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo


def update_todo(db: Session, todo_id: int, todo: schemas.TodoUpdate):
    db_todo = get_todo(db, todo_id)

    if db_todo is None:
        return None

    update_data = todo.model_dump(exclude_unset=True)

    next_status = update_data.get("status")

    if next_status == "completed":
        update_data["is_completed"] = True
        db_todo.completed_at = datetime.utcnow()
    elif next_status in ["open", "in_progress"]:
        update_data["is_completed"] = False
        db_todo.completed_at = None

    if "is_completed" in update_data:
        if update_data["is_completed"]:
            update_data["status"] = "completed"
            db_todo.completed_at = db_todo.completed_at or datetime.utcnow()
        else:
            if update_data.get("status") == "completed":
                update_data["status"] = "open"
            db_todo.completed_at = None

    for key, value in update_data.items():
        setattr(db_todo, key, value)

    db.commit()
    db.refresh(db_todo)
    return db_todo


def complete_todo(db: Session, todo_id: int):
    db_todo = get_todo(db, todo_id)

    if db_todo is None:
        return None

    db_todo.is_completed = True
    db_todo.status = "completed"
    db_todo.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(db_todo)
    return db_todo


def delete_todo(db: Session, todo_id: int):
    db_todo = get_todo(db, todo_id)

    if db_todo is None:
        return False

    db.delete(db_todo)
    db.commit()
    return True

def get_dev_notes(
    db: Session,
    project_id: int | None = None,
):
    query = db.query(models.DevNote)

    if project_id is not None:
        query = query.filter(
            models.DevNote.project_id == project_id
        )

    return query.order_by(
        models.DevNote.created_at.desc()
    ).all()


def get_dev_note(
    db: Session,
    note_id: int,
):
    return db.query(models.DevNote).filter(
        models.DevNote.id == note_id
    ).first()


def create_dev_note(
    db: Session,
    note: schemas.DevNoteCreate,
):
    db_note = models.DevNote(
        **note.model_dump()
    )

    db.add(db_note)
    db.commit()
    db.refresh(db_note)

    return db_note


def delete_dev_note(
    db: Session,
    note_id: int,
):
    db_note = get_dev_note(db, note_id)

    if db_note is None:
        return False

    db.delete(db_note)
    db.commit()

    return True

def get_todo_summary(db: Session):
    todos = db.query(models.Todo).all()

    total = len(todos)
    open_count = len([todo for todo in todos if not todo.is_completed])
    completed_count = len([todo for todo in todos if todo.is_completed])

    high_count = len([
        todo for todo in todos
        if str(todo.priority).lower() in ["high", "5", "urgent"]
    ])

    by_type = {}

    for todo in todos:
        key = todo.todo_type or "Other"
        by_type[key] = by_type.get(key, 0) + 1

    return {
        "total": total,
        "open": open_count,
        "completed": completed_count,
        "high": high_count,
        "by_type": by_type,
    }

def update_project_github_metadata(
    db: Session,
    project_id: int,
    metadata: dict,
):
    db_project = get_project(db, project_id)

    if db_project is None:
        return None

    db_project.github_updated_at = metadata.get("updated_at")
    db_project.github_pushed_at = metadata.get("pushed_at")
    db_project.github_language = metadata.get("language")
    db_project.github_open_issues_count = metadata.get("open_issues_count") or 0
    db_project.github_stars = metadata.get("stargazers_count") or 0

    db.commit()
    db.refresh(db_project)

    return db_project

def get_project_commits(
    db: Session,
    project_id: int,
    limit: int = 20,
):
    return (
        db.query(models.GitHubCommit)
        .filter(models.GitHubCommit.project_id == project_id)
        .order_by(models.GitHubCommit.author_date.desc())
        .limit(limit)
        .all()
    )


def save_github_commits(
    db: Session,
    project_id: int,
    commits: list,
):
    inserted = 0

    existing_shas = {
        row[0]
        for row in (
            db.query(models.GitHubCommit.sha)
            .filter(models.GitHubCommit.project_id == project_id)
            .all()
        )
    }

    for commit in commits:
        sha = commit.get("sha")

        if not sha or sha in existing_shas:
            continue

        commit_info = commit.get("commit", {})
        author = commit_info.get("author", {})

        db_commit = models.GitHubCommit(
            project_id=project_id,
            sha=sha,
            message=commit_info.get("message") or "",
            author_name=author.get("name"),
            author_date=author.get("date"),
            html_url=commit.get("html_url"),
        )

        db.add(db_commit)
        inserted += 1

    db.commit()

    return inserted

def get_todo_by_github_url(
    db: Session,
    project_id: int,
    github_url: str,
):
    if not github_url:
        return None

    return (
        db.query(models.Todo)
        .filter(models.Todo.project_id == project_id)
        .filter(models.Todo.description.contains(github_url))
        .first()
    )


def save_github_issues_as_todos(
    db: Session,
    project_id: int,
    issues: list,
):
    inserted = 0
    updated = 0
    completed = 0

    for issue in issues:
        html_url = issue.get("html_url")
        title = issue.get("title") or "GitHub Issue"

        if not html_url:
            continue

        labels = issue.get("labels") or []
        lower_labels = [str(label).lower() for label in labels]

        todo_type = "Issue"
        priority = "medium"

        if any(label in lower_labels for label in ["bug", "不具合"]):
            todo_type = "Bug"
            priority = "high"
        elif any(label in lower_labels for label in ["enhancement", "feature", "改善"]):
            todo_type = "Improve"
        elif any(label in lower_labels for label in ["documentation", "docs", "readme"]):
            todo_type = "Docs"
        elif any(label in lower_labels for label in ["task", "todo"]):
            todo_type = "Todo"

        if any(label in lower_labels for label in ["high", "priority: high", "重要"]):
            priority = "high"
        elif any(label in lower_labels for label in ["low", "priority: low", "低"]):
            priority = "low"

        is_closed = issue.get("state") == "closed"
        status = "completed" if is_closed else "open"

        description = "\n".join([
            "Source: GitHub",
            f"GitHub Issue: {html_url}",
            f"Issue No: #{issue.get('number')}",
            f"State: {issue.get('state')}",
            f"Labels: {', '.join(labels) if labels else '-'}",
            "",
            issue.get("body") or "",
        ])

        existing = get_todo_by_github_url(db, project_id, html_url)

        if existing is not None:
            existing.title = title
            existing.description = description
            existing.todo_type = todo_type
            existing.priority = priority
            existing.status = status
            existing.is_completed = is_closed

            if is_closed and existing.completed_at is None:
                existing.completed_at = datetime.utcnow()
                completed += 1

            if not is_closed:
                existing.completed_at = None

            updated += 1
            continue

        db_todo = models.Todo(
            project_id=project_id,
            title=title,
            description=description,
            todo_type=todo_type,
            priority=priority,
            status=status,
            is_completed=is_closed,
            completed_at=datetime.utcnow() if is_closed else None,
        )

        db.add(db_todo)
        inserted += 1

    db.commit()

    return {
        "inserted": inserted,
        "updated": updated,
        "completed": completed,
    }