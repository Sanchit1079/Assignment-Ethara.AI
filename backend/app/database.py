"""Database engine, session factory, and declarative base."""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import get_settings

settings = get_settings()


def _normalize_db_url(url: str) -> str:
    """Managed hosts (Render/Heroku) emit the legacy ``postgres://`` scheme,
    which SQLAlchemy no longer accepts. Normalize it to a psycopg2 driver URL."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


# pool_pre_ping avoids stale connections on managed/free Postgres tiers.
engine = create_engine(_normalize_db_url(settings.DATABASE_URL), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
