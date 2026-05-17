from pathlib import Path


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

    readme_path = find_readme_path(local_path)

    if readme_path is None:
        result["error_message"] = "README not found"
        return result

    try:
        text = readme_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = readme_path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        result["error_message"] = str(e)
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