"""Application configuration loaded from environment variables.

No credentials are hardcoded. All sensitive values come from the environment
(see .env.example). Sensible local defaults are provided only for convenience
when running outside Docker.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database connection string, e.g.
    # postgresql+psycopg2://user:password@host:5432/dbname
    DATABASE_URL: str = (
        "postgresql+psycopg2://postgres:postgres@localhost:5432/inventory"
    )

    # CORS: comma-separated list of allowed frontend origins.
    # Use "*" to allow any origin (handy for assessment/demo deployments).
    CORS_ORIGINS: str = "*"

    # Threshold at/below which a product is flagged as "low stock".
    LOW_STOCK_THRESHOLD: int = 10

    # Seed the database with demo data on first startup.
    SEED_DATA: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
