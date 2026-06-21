"""FastAPI application entrypoint.

Inventory & Order Management System API.
Interactive docs available at /docs (Swagger) and /redoc.
"""
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from .config import get_settings
from .database import Base, engine
from .routers import customers, dashboard, orders, products
from .seed import seed_if_empty

settings = get_settings()

app = FastAPI(
    title="Inventory & Order Management API",
    description="Backend API for managing products, customers, orders, and inventory.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _init_db(retries: int = 10, delay: float = 3.0) -> None:
    """Create tables, retrying while the database container comes up."""
    last_err = None
    for _ in range(retries):
        try:
            Base.metadata.create_all(bind=engine)
            if settings.SEED_DATA:
                seed_if_empty()
            return
        except OperationalError as exc:  # pragma: no cover - startup timing
            last_err = exc
            time.sleep(delay)
    if last_err:
        raise last_err


@app.on_event("startup")
def on_startup() -> None:
    _init_db()


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "Inventory & Order Management API",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)
