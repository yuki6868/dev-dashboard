from pathlib import Path


EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    "dist",
    "build",
    ".next",
    ".pytest_cache",
}

EXCLUDE_SUFFIXES = {
    ".db",
    ".sqlite",
    ".sqlite3",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
}

EXTENSION_LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".html": "HTML",
    ".css": "CSS",
    ".sql": "SQL",
    ".md": "Markdown",
    ".json": "JSON",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".toml": "TOML",
    ".dockerfile": "Docker",
}


def should_skip(path: Path) -> bool:
    if any(part in EXCLUDE_DIRS for part in path.parts):
        return True

    if path.suffix.lower() in EXCLUDE_SUFFIXES:
        return True

    return False


def detect_language(path: Path) -> str | None:
    name = path.name.lower()

    if name == "dockerfile":
        return "Docker"

    return EXTENSION_LANGUAGE_MAP.get(path.suffix.lower())


def count_lines(path: Path) -> int:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
        return len(text.splitlines())
    except Exception:
        return 0


def analyze_tech_stack(local_path: str) -> dict:
    if not local_path or not local_path.strip():
        return {
            "items": [],
            "total_lines": 0,
            "error_message": "local_path is empty",
        }

    base = Path(local_path).expanduser()

    if not base.exists():
        return {
            "items": [],
            "total_lines": 0,
            "error_message": f"Path does not exist: {local_path}",
        }

    if not base.is_dir():
        return {
            "items": [],
            "total_lines": 0,
            "error_message": f"Path is not a directory: {local_path}",
        }

    stats = {}

    for path in base.rglob("*"):
        if not path.is_file():
            continue

        if should_skip(path):
            continue

        language = detect_language(path)

        if language is None:
            continue

        lines = count_lines(path)

        if language not in stats:
            stats[language] = {
                "language": language,
                "files_count": 0,
                "lines_count": 0,
                "percentage": 0,
            }

        stats[language]["files_count"] += 1
        stats[language]["lines_count"] += lines

    total_lines = sum(item["lines_count"] for item in stats.values())

    items = []

    for item in stats.values():
        if total_lines > 0:
            item["percentage"] = round(item["lines_count"] / total_lines * 100)
        items.append(item)

    items.sort(key=lambda x: x["lines_count"], reverse=True)

    return {
        "items": items,
        "total_lines": total_lines,
        "error_message": None,
    }