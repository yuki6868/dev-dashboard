from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .database import SessionLocal, Base, engine
from . import crud, schemas, models
from .git_service import get_git_status

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