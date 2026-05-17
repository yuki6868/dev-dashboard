from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .database import SessionLocal, Base, engine
from . import crud, schemas, models
from .git_service import get_git_status
from .readme_service import parse_dashboard_metadata
from .readme_quality_service import check_readme_quality
from .tech_service import analyze_tech_stack
from typing import List, Optional
from .recommend_service import recommend_next_task

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dev Dashboard API")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.get("/api/projects", response_model=List[schemas.ProjectResponse])
def read_projects(db: Session = Depends(get_db)):
    return crud.get_projects(db)


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

    snapshot = crud.get_latest_git_snapshot(db, project_id)

    if snapshot is None:
        return None

    return snapshot

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
        return {
            "message": "No projects found"
        }

    return result