from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProjectBase(BaseModel):
    name: str
    local_path: str
    github_url: Optional[str] = None
    github_updated_at: Optional[str] = None
    github_pushed_at: Optional[str] = None
    github_language: Optional[str] = None
    github_open_issues_count: int = 0
    github_stars: int = 0
    description: Optional[str] = None
    status: str = "active"
    priority: str = "medium"
    next_action: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    local_path: Optional[str] = None
    github_url: Optional[str] = None
    github_updated_at: Optional[str] = None
    github_pushed_at: Optional[str] = None
    github_language: Optional[str] = None
    github_open_issues_count: Optional[int] = None
    github_stars: Optional[int] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    next_action: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TodoBase(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    todo_type: str = "Improve"
    priority: str = "medium"
    status: str = "open"


class TodoCreate(TodoBase):
    pass


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    todo_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    is_completed: Optional[bool] = None


class TodoResponse(TodoBase):
    id: int
    is_completed: bool
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DevNoteBase(BaseModel):
    project_id: int
    content: str


class DevNoteCreate(DevNoteBase):
    pass


class DevNoteUpdate(BaseModel):
    content: Optional[str] = None


class DevNoteResponse(DevNoteBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True