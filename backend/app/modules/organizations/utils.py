"""Tiện ích cho module Organization."""
import re
import unicodedata


def slugify(text: str) -> str:
    """Chuyển tên thành slug không dấu, an toàn cho URL."""
    # Bỏ dấu tiếng Việt
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")
