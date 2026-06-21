# 📦 Inventory & Order Management System

A production-ready, fully containerized full-stack application for managing **products, customers, orders, and inventory**. Built with **FastAPI + PostgreSQL + React**, orchestrated with **Docker Compose**, and ready to deploy on free hosting platforms.

> Technical Assessment — Software Engineer

---

## 🔗 Live Links & Deliverables

| Deliverable | Link |
| --- | --- |
| **Live Frontend** | _add your Vercel/Netlify URL here_ |
| **Live Backend API** | _add your Render/Railway URL here_ |
| **API Docs (Swagger)** | `<backend-url>/docs` |
| **GitHub Repository** | _add your repo URL here_ |
| **Docker Hub (backend image)** | _add your image link here_ |

---

## 🧱 Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 (Vite, JavaScript), React Router, Axios |
| Backend | Python, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL 16 |
| Containerization | Docker (multi-stage), Docker Compose |
| Web server (frontend) | nginx |

---

## ✨ Features

**Products** — create, list, view, update, delete · unique SKU · stock tracking
**Customers** — create, list, view, delete · unique email
**Orders** — create with multiple line items · view list & details · cancel (restores stock)
**Dashboard** — totals for products / customers / orders + low-stock list
**UX** — responsive (desktop + mobile), form validation, toast success/error messages, clean professional UI

### Business rules enforced by the backend
- ✅ Product SKU/code must be **unique**
- ✅ Customer email must be **unique**
- ✅ Product quantity can **never be negative** (DB check constraint + validation)
- ✅ Orders **cannot** be placed when stock is insufficient
- ✅ Placing an order **automatically reduces** stock (and cancelling restores it)
- ✅ Order **total is always computed server-side** (never trusted from the client)
- ✅ Proper HTTP status codes (201, 204, 400, 404, 409, 422) and request validation

---

## 🚀 Run Locally with Docker (recommended)

**Prerequisites:** Docker Desktop.

```bash
# 1. Clone
git clone <your-repo-url>
cd Assessment

# 2. Create your env file from the template
cp .env.example .env        # Windows: copy .env.example .env

# 3. Build & start everything (db + backend + frontend)
docker compose up --build
```

Then open:

| Service | URL |
| --- | --- |
| Frontend (React app) | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger API docs | http://localhost:8000/docs |

The database is seeded with sample products and customers on first run. PostgreSQL data persists in the named volume `pgdata`.

To stop: `docker compose down` (add `-v` to also wipe the database volume).

---

## 🧑‍💻 Run Without Docker (dev mode)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# point DATABASE_URL at a running Postgres, then:
export DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/inventory
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
npm run dev      # http://localhost:5173
```

---

## 📡 API Reference

Base URL: `<backend-url>` · Interactive docs at `/docs`.

### Products
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/products` | Create a product |
| GET | `/products` | List all products |
| GET | `/products/{id}` | Get one product |
| PUT | `/products/{id}` | Update a product |
| DELETE | `/products/{id}` | Delete a product |

### Customers
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/customers` | Create a customer |
| GET | `/customers` | List all customers |
| GET | `/customers/{id}` | Get one customer |
| DELETE | `/customers/{id}` | Delete a customer |

### Orders
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/orders` | Create an order (validates stock, reduces inventory, computes total) |
| GET | `/orders` | List all orders |
| GET | `/orders/{id}` | Get order details |
| DELETE | `/orders/{id}` | Cancel/delete an order (restores stock) |

### Dashboard
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/dashboard` | Totals + low-stock products |

**Example — create an order**
```bash
curl -X POST <backend-url>/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "items": [{"product_id": 1, "quantity": 2}]}'
```

---

## ⚙️ Environment Variables

**Root / Docker Compose** (`.env`)
| Variable | Description |
| --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials |
| `CORS_ORIGINS` | Allowed frontend origins (`*` or comma-separated) |
| `LOW_STOCK_THRESHOLD` | Stock level that flags a product as low |
| `SEED_DATA` | Seed demo data on first run (`true`/`false`) |

**Backend** (`backend/.env.example`) — `DATABASE_URL`, `CORS_ORIGINS`, `LOW_STOCK_THRESHOLD`, `SEED_DATA`
**Frontend** (`frontend/.env.example`) — `VITE_API_BASE_URL`

> No credentials are hardcoded anywhere; everything is read from environment variables.

---

## ☁️ Deployment Guide

### Backend → Render (free)
1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, select the repo. `render.yaml` provisions a free PostgreSQL DB + the Dockerized backend automatically.
3. Render injects `DATABASE_URL` from the database; the app normalizes the scheme automatically.
4. After deploy, your API is at `https://<your-backend>.onrender.com` (docs at `/docs`).

_(Railway/Fly.io work too — point them at `backend/Dockerfile`.)_

### Frontend → Vercel (free)
1. In Vercel: **New Project**, import the repo, set **Root Directory** to `frontend`.
2. Add an environment variable: `VITE_API_BASE_URL = https://<your-backend>.onrender.com`
3. Deploy. Vercel auto-detects Vite (`vercel.json` included). _(Netlify works the same via `netlify.toml`.)_

### Backend Docker image → Docker Hub
```bash
cd backend
docker build -t <your-dockerhub-username>/ioms-backend:latest .
docker login
docker push <your-dockerhub-username>/ioms-backend:latest
```

---

## 📁 Project Structure

```
Assessment/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + startup (create tables, seed)
│   │   ├── config.py        # Env-based settings
│   │   ├── database.py      # Engine, session, Base
│   │   ├── models.py        # SQLAlchemy models + constraints
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── crud.py          # Business logic (all rules live here)
│   │   ├── seed.py          # Demo data seeding
│   │   └── routers/         # products, customers, orders, dashboard
│   ├── Dockerfile           # Production image (python:3.11-slim, non-root)
│   ├── .dockerignore
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js     # Axios API client
│   │   ├── components/       # Layout, Modal, Toast, common
│   │   └── pages/            # Dashboard, Products, Customers, Orders
│   ├── Dockerfile            # Multi-stage build → nginx
│   ├── nginx.conf            # SPA routing + /api proxy
│   ├── .dockerignore
│   ├── vercel.json / netlify.toml
│   └── package.json
├── docker-compose.yml        # db + backend + frontend
├── render.yaml               # Render blueprint (backend + DB)
├── .env.example
└── README.md
```

---

## 🧪 Quick Test Checklist
- Create a product with a duplicate SKU → **409 Conflict**
- Create a customer with a duplicate email → **409 Conflict**
- Create an order exceeding stock → **400 Bad Request** with a clear message
- Create a valid order → stock decreases, total computed by backend
- Delete that order → stock is restored
