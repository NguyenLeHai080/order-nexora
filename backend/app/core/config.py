"""Cấu hình hệ thống đọc từ biến môi trường (.env)."""
from functools import lru_cache

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

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 ngày

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
