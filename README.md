# Dev Dashboard

複数の個人開発プロジェクトを管理・可視化するためのローカルダッシュボードです。

## 概要

Dev Dashboard は、ローカルにある複数の個人開発プロジェクトを登録し、Git 状態・README 情報・技術構成・TODO・作業ログをまとめて確認するためのツールです。

「次に何をやるか」を迷わないようにすることを目的にしています。

## 主な機能

- プロジェクト一覧表示
- プロジェクト詳細表示
- ローカル Git リポジトリの状態取得
  - ブランチ
  - 最新コミット
  - 未コミット変更
  - ahead / behind
- README Dashboard 情報の読み取り
- README 品質チェック
- 技術構成の可視化
- TODO 管理
- 作業ログ表示
- 放置プロジェクト検知
- 次にやる作業の提案
- VS Code 起動
- 設定画面

## 技術構成

### Backend

- Python
- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- Uvicorn

### Frontend

- React
- Vite
- React Router
- Axios
- Recharts

## セットアップ

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## 起動方法

### Backend 起動

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

確認:

```txt
http://localhost:8000/
```

正常なら以下が返ります。

```json
{"status":"ok"}
```

### Frontend 起動

別ターミナルで実行します。

```bash
cd frontend
npm run dev
```

画面:

```txt
http://localhost:5173
```

## 環境変数

現時点では必須の環境変数はありません。

SQLite は backend 配下の DB を使用します。

```txt
backend/dev_dashboard.sqlite
```

## プロジェクト登録方法

画面からプロジェクトを登録します。

主な入力項目:

- プロジェクト名
- 説明
- ローカルパス
- GitHub URL

local_path には、ローカルに存在するプロジェクトフォルダを指定します。

例:

```txt
/Users/nakagawa/Desktop/application_file/dev-dashboard
```

## README Dashboard 形式

登録した各プロジェクトの README に以下の形式で書くと、ダッシュボードが読み取ります。

```md
## Dashboard

- status: active
- priority: high
- next: 次にやる作業を書く
- problem: 現在困っていることを書く
- tags: React, FastAPI, SQLite
```

### 対応キー

| key | 内容 |
| --- | --- |
| status | プロジェクト状態 |
| priority | 優先度 |
| next | 次にやること |
| problem | 現在の問題 |
| tags | 技術タグ |

## VS Code 起動

VS Code 起動には `code` コマンドが必要です。

Mac の場合:

1. VS Code を開く
2. Command Palette を開く
3. `Shell Command: Install 'code' command in PATH` を実行

## エラーハンドリング方針

壊れたプロジェクトが登録されても、アプリ全体は落としません。

以下の場合は処理を止めずにスキップし、画面/APIにはエラー情報を返し、ログにも出します。

- local_path が存在しない
- `.git` がない
- git コマンド失敗
- README がない
- code コマンドがない
- 権限エラー

エラーは握り潰さず、ログに出します。

## よく使うコマンド

### Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm run dev
```

### Git

```bash
git status
git add .
git commit -m "message"
```

## 今後の予定

- エラー表示 UI の改善
- README Dashboard 編集機能
- TODO 状態遷移の強化
- 作業ログ集計の改善
- 放置プロジェクト検知条件の調整
- 設定画面の拡張
- デスクトップアプリ化