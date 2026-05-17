from sqlalchemy.orm import Session

from . import models, schemas


def get_projects(db: Session):
    return db.query(models.Project).order_by(models.Project.updated_at.desc()).all()


def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()


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