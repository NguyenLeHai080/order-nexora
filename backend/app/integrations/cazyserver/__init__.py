"""Adapter Cazyserver reseller domain API.

Base URL: https://cazyserver.com/modules/addons/reseller_manager/api.php
Auth: X-API-Key + X-API-Secret. Không có webhook.
"""
from app.integrations.cazyserver.client import CazyClient
from app.integrations.cazyserver.errors import CazyError
from app.integrations.registry import register

register(CazyClient)

__all__ = ["CazyClient", "CazyError"]
