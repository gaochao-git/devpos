# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DBA自动化管理平台 (DBA Automation Management Platform) - a full-stack platform for database administration automation, SQL audit/approval workflows, server resource management, and operational monitoring.

## Tech Stack

- **Backend:** Python 3.6 + Django 2.1.1 + Celery 3.1.26 + MySQL 5.7 + Redis
- **Frontend:** Node.js 12+ + React 16.12 + Ant Design 3.26 + Webpack 4
- **MCP Server:** Python 3.12+ + FastMCP (separate component in `mcp_server/`)
- **External Tools:** Inception/Go-Inception (SQL audit), SOAR (SQL optimization), Zabbix, Ansible

## Development Commands

### Backend (from `django_backend/`)
```bash
# Install dependencies
pip3.6 install -r requirements.txt

# Run Django dev server
python3.6 manage.py runserver 0.0.0.0:8000

# Database migrations
python3.6 manage.py migrate
python3.6 manage.py createsuperuser

# Celery workers
python manage.py celery worker -E -c 2 -O fair --loglevel=INFO -f logs/celery_async_worker.log -Q async_task --purge   # async tasks
python manage.py celery worker -E -c 2 -O fair --loglevel=INFO -f logs/celery_cron_worker.log -Q default --purge       # cron tasks
python manage.py celery beat -l debug -f logs/celery_beat.log                                                           # beat scheduler

# Run backend tests
python manage.py test apps.unit_test
python manage.py test app_audit_sql.unit_test
```

### Frontend (from `react_front/`)
```bash
npm install
yarn start                  # dev server
yarn build                  # production build
npm run build:build_gaochao # custom env build
npm test                    # Jest tests
```

## Architecture

### Backend: Controller → Service → DAO Pattern

```
django_backend/
├── django_backend/          # Django project config
│   ├── settings.py          # Main settings (imports dev.py or pro.py based on host IP)
│   ├── auth_config.py       # DB/Inception connection info (SM4 encrypted passwords)
│   ├── dev.py / pro.py      # Environment-specific DB + Celery + Redis config
│   └── urls.py              # Root URL routing with RouterAccess RBAC enum
├── apps/                    # Core app (server/MySQL resource management)
│   ├── controller/          # HTTP handlers: *_controller.py
│   ├── service/             # Business logic layer
│   ├── dao/                 # Database access layer (raw SQL via db_helper)
│   ├── models.py            # Django ORM models
│   ├── utils/               # Shared utilities
│   │   ├── base_view.py     # Base API view class
│   │   ├── db_helper.py     # Raw MySQL query helper
│   │   ├── middleware/      # Auth + logging middleware
│   │   └── enc_sm4.py       # SM4 encryption for sensitive config
│   └── celery_task/         # Async/cron task definitions
├── app_audit_sql/           # SQL audit & approval workflow module
├── app_db_dcl/              # Database privilege (DCL) management
├── app_web_console/         # Web-based SQL query console
├── app_fault_tree/          # Fault tree analysis
├── app_login/               # Authentication (JWT + SSO/CAS)
├── app_permission/          # RBAC permission management
├── app_task_manage/         # Task/job scheduling
└── app_jks/                 # Jenkins integration
```

### Frontend: Feature-based React Components

```
react_front/src/
├── App.js                   # Layout, routing, navigation menu
├── scripts/                 # Feature modules (each is a page/feature)
│   ├── common/
│   │   ├── util.js          # backendServerApiRoot (API base URL) + env config
│   │   └── interface/       # API call functions (Axios wrappers)
│   ├── aiApp/               # AI integration
│   ├── auditSql/            # SQL audit UI
│   ├── console/             # SQL query console
│   ├── mysql/               # MySQL cluster/instance management
│   ├── login/               # Login page
│   └── ...                  # Other feature modules
└── styles/                  # Global CSS/SCSS
```

### Key Patterns

- **Environment switching:** `settings.py` detects the host IP and imports `dev.py` or `pro.py` accordingly. `auth_config.py` similarly switches connection info.
- **API routing:** All backend APIs are under `/api/` prefix. URL patterns use `RouterAccess` enum for role-based access control (common/dba/admin).
- **Authentication:** JWT tokens via `djangorestframework-jwt`. Custom `MyAuthMiddleware` handles token validation. SSO/CAS supported but optional (controlled by `LOGIN_TYPE` in settings).
- **Frontend API base URL:** Configured in `react_front/src/scripts/common/util.js` via `env()` function, switched by `process.env.NODE_ENV`.
- **Celery queues:** Two queues - `default` (cron tasks) and `async_task` (SQL audit execution, MySQL deployment). Routes defined in dev.py/pro.py.
- **Logging:** Uses `logging.getLogger('devops')` throughout backend. Logs go to `django_backend/logs/` (access.log, error.log, sql.log).

## Adding a New Feature

1. **Backend:** Add URL in `urls.py` → Create controller in `apps/controller/` → Create service in `apps/service/` → Create DAO in `apps/dao/`
2. **Frontend:** Create feature directory in `src/scripts/` → Add route in `App.js` → Import component in `App.js`

## MCP Server

Standalone component in `mcp_server/` using Python 3.12+ and `uv` package manager. Provides database and Zabbix monitoring tools via FastMCP protocol.

```bash
cd mcp_server
uv sync        # install deps
uv run db_mcp_server.py
```
