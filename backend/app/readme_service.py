from pathlib import Path
from .error_service import project_error, validate_local_path

DASHBOARD_KEYS = {
    "status": "status",
    "priority": "priority",
    "next": "next_action",
    "problem": "problem",
    "tags": "tags",
}


def find_readme_path(local_path: str) -> Path | None:
    base = Path(local_path)

    for name in ["README.md", "readme.md", "README.txt", "readme.txt"]:
        path = base / name
        if path.exists() and path.is_file():
            return path

    return None


def extract_dashboard_section(text: str) -> str:
    lines = text.splitlines()
    start_index = None

    for i, line in enumerate(lines):
        if line.strip().lower() == "## dashboard":
            start_index = i + 1
            break

    if start_index is None:
        return ""

    section_lines = []

    for line in lines[start_index:]:
        stripped = line.strip()

        if stripped.startswith("## "):
            break

        section_lines.append(line)

    return "\n".join(section_lines).strip()


def parse_dashboard_metadata(local_path: str) -> dict:
    result = {
        "status": None,
        "priority": None,
        "next_action": None,
        "problem": None,
        "tags": [],
        "error_message": None,
    }

    path_error = validate_local_path(local_path)
    if path_error:
        result["error_message"] = path_error["message"]
        return result

    readme_path = find_readme_path(local_path)

    if readme_path is None:
        message = "README not found"
        project_error("README_NOT_FOUND", message, local_path, "skip")
        result["error_message"] = message
        return result

    try:
        text = readme_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = readme_path.read_text(encoding="utf-8", errors="ignore")
    except PermissionError as e:
        message = f"Permission denied: {e}"
        project_error("PERMISSION_ERROR", message, local_path, "skip")
        result["error_message"] = message
        return result
    except Exception as e:
        message = str(e)
        project_error("README_READ_ERROR", message, local_path, "skip")
        result["error_message"] = message
        return result

    section = extract_dashboard_section(text)

    if not section:
        result["error_message"] = "Dashboard section not found"
        return result

    for line in section.splitlines():
        stripped = line.strip()

        if not stripped.startswith("-"):
            continue

        body = stripped.lstrip("-").strip()

        if ":" not in body:
            continue

        key, value = body.split(":", 1)
        key = key.strip().lower()
        value = value.strip()

        mapped_key = DASHBOARD_KEYS.get(key)

        if mapped_key is None:
            continue

        if mapped_key == "tags":
            result["tags"] = [
                tag.strip()
                for tag in value.replace("、", ",").split(",")
                if tag.strip()
            ]
        else:
            result[mapped_key] = value

    return result

def build_dashboard_section(payload: dict) -> str:
    tags = payload.get("tags") or []
    if isinstance(tags, str):
        tags = [tag.strip() for tag in tags.replace("、", ",").split(",") if tag.strip()]

    return "\n".join([
        "## Dashboard",
        f"- status: {payload.get('status') or ''}",
        f"- priority: {payload.get('priority') or ''}",
        f"- next: {payload.get('next_action') or payload.get('next') or ''}",
        f"- problem: {payload.get('problem') or ''}",
        f"- tags: {', '.join(tags)}",
        "",
    ])


def update_dashboard_metadata(local_path: str, payload: dict) -> dict:
    path_error = validate_local_path(local_path)
    if path_error:
        return {"ok": False, "error": path_error["message"]}

    readme_path = find_readme_path(local_path)

    if readme_path is None:
        readme_path = Path(local_path) / "README.md"
        text = ""
    else:
        text = readme_path.read_text(encoding="utf-8", errors="ignore")

    new_section = build_dashboard_section(payload)
    lines = text.splitlines()
    start = None
    end = None

    for i, line in enumerate(lines):
        if line.strip().lower() == "## dashboard":
            start = i
            break

    if start is not None:
        end = len(lines)
        for i in range(start + 1, len(lines)):
            if lines[i].startswith("## "):
                end = i
                break

        updated = "\n".join(lines[:start] + new_section.splitlines() + lines[end:]).strip() + "\n"
    else:
        updated = text.rstrip() + "\n\n" + new_section

    readme_path.write_text(updated, encoding="utf-8")

    return {
        "ok": True,
        "readme_path": str(readme_path),
        "dashboard": parse_dashboard_metadata(local_path),
    }