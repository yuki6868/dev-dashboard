import json
import logging
import urllib.error
import urllib.request
import certifi
import ssl

from .settings_service import get_settings, update_settings

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"


def _parse_error_body(body: str):
    try:
        data = json.loads(body)
        return data.get("message") or body
    except Exception:
        return body


def _request_github(path: str, token: str | None = None):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "dev-dashboard-local",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    if token:
        # GitHub Personal Access Token は token 形式が安定
        headers["Authorization"] = f"token {token}"

    request = urllib.request.Request(
        f"{GITHUB_API_BASE}{path}",
        headers=headers,
        method="GET",
    )

    context = ssl.create_default_context(cafile=certifi.where())

    try:
        with urllib.request.urlopen(
            request,
            timeout=15,
            context=context,
        ) as response:
            body = response.read().decode("utf-8")
            return {
                "ok": True,
                "status": response.status,
                "data": json.loads(body) if body else {},
            }

    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        message = _parse_error_body(body)

        logger.exception(
            "GitHub API HTTP error: status=%s path=%s message=%s",
            e.code,
            path,
            message,
        )

        return {
            "ok": False,
            "status": e.code,
            "error": message,
        }

    except Exception as e:
        logger.exception("GitHub API request failed: path=%s", path)

        return {
            "ok": False,
            "status": None,
            "error": str(e),
        }


def mask_token(token: str | None):
    if not token:
        return None

    if len(token) <= 8:
        return "********"

    return f"{token[:4]}...{token[-4:]}"


def get_github_settings():
    settings = get_settings()
    github = settings.get("github", {})

    return {
        "enabled": github.get("enabled", False),
        "username": github.get("username"),
        "avatar_url": github.get("avatar_url"),
        "html_url": github.get("html_url"),
        "token_masked": mask_token(github.get("token")),
        "connected": bool(github.get("token")),
    }


def connect_github(token: str):
    token = (token or "").strip()

    if not token:
        return {
            "ok": False,
            "error": "GitHub tokenが空です。",
        }

    result = _request_github("/user", token)

    if not result["ok"]:
        status = result.get("status")
        detail = result.get("error")

        if status == 401:
            message = "GitHub認証に失敗しました。tokenが間違っているか、期限切れです。"
        elif status == 403:
            message = "GitHub APIに拒否されました。tokenの権限、SSO承認、またはRate Limitを確認してください。"
        else:
            message = "GitHub連携に失敗しました。"

        return {
            "ok": False,
            "error": message,
            "detail": detail,
            "status": status,
        }

    user = result["data"]

    settings = get_settings()
    settings["github"] = {
        **settings.get("github", {}),
        "enabled": True,
        "token": token,
        "username": user.get("login"),
        "avatar_url": user.get("avatar_url"),
        "html_url": user.get("html_url"),
    }

    update_settings(settings)

    return {
        "ok": True,
        "github": get_github_settings(),
    }


def disconnect_github():
    settings = get_settings()
    settings["github"] = {
        "enabled": False,
        "token": None,
        "username": None,
        "avatar_url": None,
        "html_url": None,
    }

    update_settings(settings)

    return {
        "ok": True,
        "github": get_github_settings(),
    }


def get_authenticated_user():
    settings = get_settings()
    token = settings.get("github", {}).get("token")

    if not token:
        return {
            "ok": False,
            "error": "GitHubが未連携です。",
        }

    result = _request_github("/user", token)

    if not result["ok"]:
        return result

    return {
        "ok": True,
        "user": result["data"],
    }


def get_repositories():
    settings = get_settings()
    token = settings.get("github", {}).get("token")

    if not token:
        return {
            "ok": False,
            "error": "GitHubが未連携です。",
            "repositories": [],
        }

    result = _request_github(
        "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
        token,
    )

    if not result["ok"]:
        return {
            "ok": False,
            "error": result.get("error"),
            "repositories": [],
        }

    repositories = []

    for repo in result["data"]:
        repositories.append(
            {
                "name": repo.get("name"),
                "full_name": repo.get("full_name"),
                "private": repo.get("private"),
                "html_url": repo.get("html_url"),
                "clone_url": repo.get("clone_url"),
                "ssh_url": repo.get("ssh_url"),
                "description": repo.get("description"),
                "language": repo.get("language"),
                "default_branch": repo.get("default_branch"),
                "updated_at": repo.get("updated_at"),
                "pushed_at": repo.get("pushed_at"),
                "open_issues_count": repo.get("open_issues_count"),
                "stargazers_count": repo.get("stargazers_count"),
                "forks_count": repo.get("forks_count"),
            }
        )

    return {
        "ok": True,
        "repositories": repositories,
    }