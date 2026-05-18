from pathlib import Path


QUALITY_CHECKS = [
    {
        "key": "overview",
        "label": "概要",
        "keywords": ["# ", "概要", "Overview", "About"],
    },
    {
        "key": "features",
        "label": "機能",
        "keywords": ["機能", "Features", "できること"],
    },
    {
        "key": "installation",
        "label": "インストール方法",
        "keywords": ["インストール", "Install", "Installation", "Setup"],
    },
    {
        "key": "usage",
        "label": "使い方",
        "keywords": ["使い方", "Usage", "起動方法", "How to use"],
    },
    {
        "key": "screenshots",
        "label": "スクショ",
        "keywords": ["スクショ", "Screenshot", "Screenshots", "画像"],
    },
    {
        "key": "roadmap",
        "label": "今後の予定",
        "keywords": ["今後", "Roadmap", "TODO", "予定"],
    },
    {
        "key": "license",
        "label": "ライセンス",
        "keywords": ["ライセンス", "License"],
    },
    {
        "key": "tech_stack",
        "label": "技術構成",
        "keywords": ["技術構成", "Tech Stack", "Technology"],
    },
]


def build_empty_checks():
    return [
        {
            "key": item["key"],
            "label": item["label"],
            "passed": False,
        }
        for item in QUALITY_CHECKS
    ]


def find_readme_path(local_path: str) -> Path | None:
    if not local_path or not local_path.strip():
        return None

    base = Path(local_path).expanduser()

    if not base.exists() or not base.is_dir():
        return None

    direct_candidates = [
        base / "README.md",
        base / "readme.md",
        base / "README.txt",
        base / "readme.txt",
    ]

    for path in direct_candidates:
        if path.exists() and path.is_file():
            return path

    nested_candidates = []

    try:
        for path in base.rglob("*"):
            if not path.is_file():
                continue

            name = path.name.lower()

            if name not in {
                "readme.md",
                "readme.txt",
            }:
                continue

            # node_modules や .git は除外
            parts = {part.lower() for part in path.parts}

            if ".git" in parts:
                continue

            if "node_modules" in parts:
                continue

            nested_candidates.append(path)

    except Exception:
        return None

    if not nested_candidates:
        return None

    # 一番浅いREADMEを優先
    nested_candidates.sort(key=lambda p: len(p.parts))

    return nested_candidates[0]


def check_readme_quality(local_path: str) -> dict:
    readme_path = find_readme_path(local_path)

    if readme_path is None:
        empty_checks = build_empty_checks()

        return {
            "score": 0,
            "max_score": len(QUALITY_CHECKS),
            "percentage": 0,
            "checks": empty_checks,
            "missing": [item["label"] for item in QUALITY_CHECKS],
            "error_message": "README not found",
        }

    try:
        text = readme_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = readme_path.read_text(encoding="utf-8", errors="ignore")

    checks = []
    score = 0

    for item in QUALITY_CHECKS:
        passed = any(keyword.lower() in text.lower() for keyword in item["keywords"])

        if passed:
            score += 1

        checks.append({
            "key": item["key"],
            "label": item["label"],
            "passed": passed,
        })

    max_score = len(QUALITY_CHECKS)
    percentage = round(score / max_score * 100)

    return {
        "score": score,
        "max_score": max_score,
        "percentage": percentage,
        "checks": checks,
        "missing": [
            item["label"]
            for item, check in zip(QUALITY_CHECKS, checks)
            if not check["passed"]
        ],
        "error_message": None,
    }