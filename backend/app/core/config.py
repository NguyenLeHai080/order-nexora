"""Cấu hình hệ thống đọc từ biến môi trường (.env)."""
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "Order Nexora API"
    app_env: str = "local"  # local | staging | prod
    debug: bool = True
    api_prefix: str = "/api"

    # Database — mặc định SQLite cho dev, đổi sang Postgres qua DATABASE_URL
    database_url: str = "sqlite:///./order_nexora.db"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle_seconds: int = 1800
    auto_create_tables: bool = True

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 ngày

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    trusted_hosts: list[str] = ["*"]

    # Frontend build (SPA) — để FastAPI phục vụ luôn file tĩnh đã build.
    # Rỗng = tự dò ../frontend/dist so với mã nguồn backend.
    frontend_dist_dir: str = ""

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str) and value.lower() in {"release", "prod", "production"}:
            return False
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
