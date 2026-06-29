"""Router Uploads — nhận file ảnh, lưu vào thư mục tĩnh, trả URL công khai.

Dùng cho ảnh QR ngân hàng và các ảnh khác. File lưu trong storage/uploads,
được serve tại /uploads/<filename>. DB chỉ lưu đường dẫn URL.
"""
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile
from fastapi import File as FastAPIFile

from app.core.exceptions import AppException
from app.core.response import success
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# Thư mục lưu file tĩnh (tạo nếu chưa có).
UPLOAD_DIR = Path("storage/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
_MAX_BYTES = 5 * 1024 * 1024  # 5MB


@router.post("", summary="Tải ảnh lên")
async def upload(
    file: UploadFile = FastAPIFile(...),
    _user: User = Depends(get_current_user),
) -> dict:
    if file.content_type not in _ALLOWED:
        raise AppException("Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.")
    content = await file.read()
    if len(content) > _MAX_BYTES:
        raise AppException("Ảnh vượt quá 5MB.")

    ext = _ALLOWED[file.content_type]
    filename = f"{secrets.token_hex(16)}{ext}"
    (UPLOAD_DIR / filename).write_bytes(content)

    return success({"url": f"/uploads/{filename}", "filename": filename}, "Tải ảnh thành công.")
