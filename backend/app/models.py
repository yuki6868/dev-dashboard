from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func

from .database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    local_path = Column(String, nullable=False)
    github_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="active")
    priority = Column(String, default="medium")
    next_action = Column(Text, nullable=True)

    github_updated_at = Column(String, nullable=True)
    github_pushed_at = Column(String, nullable=True)
    github_language = Column(String, nullable=True)
    github_open_issues_count = Column(Integer, default=0)
    github_stars = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class GitHubCommit(Base):
    __tablename__ = "github_commits"

    id = Column(Integer, primary_key=True, index=True)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    sha = Column(String, nullable=False)
    message = Column(Text, nullable=False)

    author_name = Column(String, nullable=True)
    author_date = Column(String, nullable=True)

    html_url = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    
class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    todo_type = Column(String, default="Improve")
    priority = Column(String, default="medium")
    status = Column(String, default="open")
    is_completed = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class GitSnapshot(Base):
    __tablename__ = "git_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    branch = Column(String, nullable=True)
    latest_commit_hash = Column(String, nullable=True)
    latest_commit_message = Column(Text, nullable=True)
    latest_commit_at = Column(String, nullable=True)
    has_uncommitted_changes = Column(Boolean, default=False)
    changed_files_count = Column(Integer, default=0)
    ahead = Column(Integer, default=0)
    behind = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TechStack(Base):
    __tablename__ = "tech_stacks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    language = Column(String, nullable=False)
    files_count = Column(Integer, default=0)
    lines_count = Column(Integer, default=0)
    percentage = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DevNote(Base):
    __tablename__ = "dev_notes"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    content = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())