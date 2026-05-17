from sqlalchemy.orm import Session

from . import models


PRIORITY_SCORE = {
    "high": 100,
    "medium": 50,
    "low": 10,
}

TODO_TYPE_SCORE = {
    "Bug": 120,
    "Release": 100,
    "Improve": 70,
    "Idea": 30,
}


def calculate_project_score(project, todos):
    score = 0

    priority = (project.priority or "medium").lower()
    score += PRIORITY_SCORE.get(priority, 50)

    if project.next_action:
        score += 40

    active_todos = [t for t in todos if not t.is_completed]

    score += len(active_todos) * 5

    for todo in active_todos:
        score += TODO_TYPE_SCORE.get(todo.todo_type, 20)

        todo_priority = (todo.priority or "medium").lower()
        score += PRIORITY_SCORE.get(todo_priority, 50)

    return score


def recommend_next_task(db: Session):
    projects = db.query(models.Project).all()

    best_result = None
    best_score = -1

    for project in projects:
        todos = (
            db.query(models.Todo)
            .filter(models.Todo.project_id == project.id)
            .all()
        )

        score = calculate_project_score(project, todos)

        if score > best_score:
            active_todos = [t for t in todos if not t.is_completed]

            top_todo = None

            if active_todos:
                top_todo = sorted(
                    active_todos,
                    key=lambda t: (
                        PRIORITY_SCORE.get((t.priority or "medium").lower(), 50),
                        TODO_TYPE_SCORE.get(t.todo_type, 20),
                    ),
                    reverse=True,
                )[0]

            best_result = {
                "project_id": project.id,
                "project_name": project.name,
                "project_priority": project.priority,
                "project_status": project.status,
                "next_action": project.next_action,
                "recommended_todo": (
                    {
                        "id": top_todo.id,
                        "title": top_todo.title,
                        "todo_type": top_todo.todo_type,
                        "priority": top_todo.priority,
                    }
                    if top_todo
                    else None
                ),
                "score": score,
            }

            best_score = score

    return best_result