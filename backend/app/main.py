from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from .database import SessionLocal, Base, engine
from . import crud, schemas
from .git_service import get_git_status
from .readme_service import parse_dashboard_metadata
from .readme_quality_service import check_readme_quality
from .tech_service import analyze_tech_stack
from .recommend_service import recommend_next_task
from .inactivity_service import detect_inactivity
from .vscode_service import open_project_in_vscode
from .project_detail_service import get_project_detail_summary
from .worklog_service import get_worklog
from .settings_service import get_settings, update_settings, reset_settings
from .github_service import (
    get_github_settings,
    connect_github,
    disconnect_github,
    get_authenticated_user,
    get_repositories,
    get_repository_commits,
    get_repository_issues,
)
from pydantic import BaseModel
from .folder_picker_service import select_folder


Base.metadata.create_all(bind=engine)

def ensure_project_github_columns():
    columns = {
        "github_updated_at": "VARCHAR",
        "github_pushed_at": "VARCHAR",
        "github_language": "VARCHAR",
        "github_open_issues_count": "INTEGER DEFAULT 0",
        "github_stars": "INTEGER DEFAULT 0",
    }

    with engine.connect() as connection:
        existing = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(projects)").fetchall()
        }

        for column_name, column_type in columns.items():
            if column_name not in existing:
                connection.exec_driver_sql(
                    f"ALTER TABLE projects ADD COLUMN {column_name} {column_type}"
                )

        connection.commit()


ensure_project_github_columns()

app = FastAPI(title="Dev Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def health_check():
    return {"status": "ok"}

class FolderSelectRequest(BaseModel):
    initial_dir: Optional[str] = None


@app.post("/api/system/select-folder")
def select_system_folder(payload: FolderSelectRequest):
    return select_folder(payload.initial_dir)

@app.get("/api/projects", response_model=List[schemas.ProjectResponse])
def read_projects(db: Session = Depends(get_db)):
    projects = crud.get_projects(db)

    result = []

    for project in projects:
        tech_result = analyze_tech_stack(project.local_path)
        tech_stack = [
            item["language"]
            for item in tech_result.get("items", [])[:5]
        ]

        result.append({
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "local_path": project.local_path,
            "github_url": project.github_url,
            "github_updated_at": project.github_updated_at,
            "github_pushed_at": project.github_pushed_at,
            "github_language": project.github_language,
            "github_open_issues_count": project.github_open_issues_count or 0,
            "github_stars": project.github_stars or 0,
            "status": project.status,
            "priority": project.priority,
            "next_action": project.next_action,
            "tech_stack": tech_stack,
            "readme_quality": check_readme_quality(project.local_path),
            "created_at": project.created_at,
            "updated_at": project.updated_at,
        })

    return result


@app.get("/api/projects/inactivity")
def read_project_inactivity(db: Session = Depends(get_db)):
    return detect_inactivity(db)


@app.post("/api/projects", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    return crud.create_project(db, project)


@app.get("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
def read_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return db_project


@app.put("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
def update_project(
    project_id: int,
    project: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
):
    db_project = crud.update_project(db, project_id, project)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return db_project


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_project(db, project_id)

    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"deleted": True}


@app.get("/api/projects/{project_id}/git-status")
def read_project_git_status(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return get_git_status(db_project.local_path)


@app.post("/api/projects/{project_id}/refresh-git")
def refresh_project_git_status(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    git_status = get_git_status(db_project.local_path)
    snapshot = crud.create_git_snapshot(db, project_id, git_status)

    return {
        "project_id": project_id,
        "git_status": git_status,
        "snapshot_id": snapshot.id,
    }


@app.get("/api/projects/{project_id}/git-snapshot/latest")
def read_latest_git_snapshot(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return crud.get_latest_git_snapshot(db, project_id)


@app.get("/api/projects/{project_id}/readme-dashboard")
def read_project_readme_dashboard(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return parse_dashboard_metadata(db_project.local_path)


@app.get("/api/projects/{project_id}/readme-quality")
def read_project_readme_quality(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return check_readme_quality(db_project.local_path)


@app.get("/api/projects/{project_id}/tech-stack")
def read_project_tech_stack(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return analyze_tech_stack(db_project.local_path)


@app.get("/api/todos/summary")
def read_todo_summary(db: Session = Depends(get_db)):
    return crud.get_todo_summary(db)


@app.get("/api/todos", response_model=List[schemas.TodoResponse])
def read_todos(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return crud.get_todos(db, project_id)


@app.post("/api/todos", response_model=schemas.TodoResponse)
def create_todo(todo: schemas.TodoCreate, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, todo.project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return crud.create_todo(db, todo)


@app.put("/api/todos/{todo_id}", response_model=schemas.TodoResponse)
def update_todo(
    todo_id: int,
    todo: schemas.TodoUpdate,
    db: Session = Depends(get_db),
):
    db_todo = crud.update_todo(db, todo_id, todo)

    if db_todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")

    return db_todo


@app.post("/api/todos/{todo_id}/complete", response_model=schemas.TodoResponse)
def complete_todo(todo_id: int, db: Session = Depends(get_db)):
    db_todo = crud.complete_todo(db, todo_id)

    if db_todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")

    return db_todo


@app.delete("/api/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_todo(db, todo_id)

    if not ok:
        raise HTTPException(status_code=404, detail="Todo not found")

    return {"deleted": True}


@app.get("/api/recommend/next-task")
def get_next_task_recommendation(db: Session = Depends(get_db)):
    result = recommend_next_task(db)

    if result is None:
        return {"message": "No projects found"}

    return result

@app.post("/api/projects/{project_id}/open-vscode")
def open_project_vscode(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return open_project_in_vscode(db_project.local_path)

@app.get("/api/dev-notes", response_model=List[schemas.DevNoteResponse])
def read_dev_notes(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return crud.get_dev_notes(db, project_id)


@app.post("/api/dev-notes", response_model=schemas.DevNoteResponse)
def create_dev_note(
    note: schemas.DevNoteCreate,
    db: Session = Depends(get_db),
):
    db_project = crud.get_project(db, note.project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return crud.create_dev_note(db, note)


@app.delete("/api/dev-notes/{note_id}")
def delete_dev_note(
    note_id: int,
    db: Session = Depends(get_db),
):
    ok = crud.delete_dev_note(db, note_id)

    if not ok:
        raise HTTPException(status_code=404, detail="Dev note not found")

    return {"deleted": True}

@app.get("/api/projects/{project_id}/detail-summary")
def read_project_detail_summary(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)

    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    todos = crud.get_todos(db, project_id)

    return get_project_detail_summary(db_project.local_path, todos)

@app.get("/api/worklogs")
def read_worklogs(date: Optional[str] = None, db: Session = Depends(get_db)):
    return get_worklog(db, date)

@app.get("/api/settings")
def read_settings():
    return get_settings()


@app.put("/api/settings")
def update_app_settings(settings: dict):
    return update_settings(settings)


@app.post("/api/settings/reset")
def reset_app_settings():
    return reset_settings()

@app.get("/api/github/status")
def read_github_status():
    return get_github_settings()


@app.post("/api/github/connect")
def connect_github_account(payload: dict):
    token = payload.get("token", "")
    return connect_github(token)


@app.post("/api/github/disconnect")
def disconnect_github_account():
    return disconnect_github()


@app.get("/api/github/user")
def read_github_user():
    return get_authenticated_user()


@app.get("/api/github/repositories")
def read_github_repositories():
    return get_repositories()

@app.post("/api/github/repositories/add", response_model=schemas.ProjectResponse)
def add_github_repository_as_project(
    payload: dict,
    db: Session = Depends(get_db),
):
    github_url = payload.get("html_url")

    if not github_url:
        raise HTTPException(status_code=400, detail="GitHub URL is required")

    existing = crud.get_project_by_github_url(db, github_url)

    if existing is not None:
        return existing

    project = schemas.ProjectCreate(
        name=payload.get("name") or payload.get("full_name") or "GitHub Project",
        local_path="",
        github_url=github_url,
        description=payload.get("description") or "",
        status="active",
        priority="medium",
        next_action="ローカルにcloneする、またはlocal_pathを設定する",
    )

    return crud.create_project(db, project)

@app.post("/api/github/sync-projects")
def sync_github_projects(db: Session = Depends(get_db)):
    result = get_repositories()

    if not result.get("ok"):
        return result

    repos = result.get("repositories", [])
    repos_by_url = {
        repo.get("html_url"): repo
        for repo in repos
        if repo.get("html_url")
    }

    projects = crud.get_projects(db)
    updated_projects = []

    for project in projects:
        if not project.github_url:
            continue

        repo = repos_by_url.get(project.github_url)

        if repo is None:
            continue

        updated_project = crud.update_project_github_metadata(
            db,
            project.id,
            {
                "updated_at": repo.get("updated_at"),
                "pushed_at": repo.get("pushed_at"),
                "language": repo.get("language"),
                "open_issues_count": repo.get("open_issues_count"),
                "stargazers_count": repo.get("stargazers_count"),
            },
        )

        if updated_project is not None:
            updated_projects.append(updated_project)

    return {
        "ok": True,
        "updated_count": len(updated_projects),
    }

@app.post("/api/github/sync-commits")
def sync_github_commits(
    db: Session = Depends(get_db),
):
    projects = crud.get_projects(db)

    total_inserted = 0

    for project in projects:
        if not project.github_url:
            continue

        try:
            parts = project.github_url.rstrip("/").split("/")

            owner = parts[-2]
            repo = parts[-1]

        except Exception:
            continue

        result = get_repository_commits(owner, repo)

        if not result.get("ok"):
            continue

        inserted = crud.save_github_commits(
            db,
            project.id,
            result.get("commits", []),
        )

        total_inserted += inserted

    return {
        "ok": True,
        "inserted": total_inserted,
    }


@app.post("/api/github/sync-issues")
def sync_github_issues(
    db: Session = Depends(get_db),
):
    projects = crud.get_projects(db)

    total_inserted = 0
    total_updated = 0
    skipped = 0

    for project in projects:
        if not project.github_url:
            continue

        try:
            parts = project.github_url.rstrip("/").split("/")
            owner = parts[-2]
            repo = parts[-1]
        except Exception:
            skipped += 1
            continue

        result = get_repository_issues(owner, repo)

        if not result.get("ok"):
            skipped += 1
            continue

        saved = crud.save_github_issues_as_todos(
            db,
            project.id,
            result.get("issues", []),
        )

        total_inserted += saved["inserted"]
        total_updated += saved["updated"]

    return {
        "ok": True,
        "inserted": total_inserted,
        "updated": total_updated,
        "skipped": skipped,
    }

@app.get(
    "/api/projects/{project_id}/commits",
    response_model=list[schemas.GitHubCommitResponse],
)
def get_project_commits(
    project_id: int,
    db: Session = Depends(get_db),
):
    return crud.get_project_commits(db, project_id)