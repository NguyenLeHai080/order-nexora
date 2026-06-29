# Backend Dockerfile — FastAPI (Python 3.12)
FROM python:3.12-slim

# Không ghi .pyc, log không buffer (tiện xem log container)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Cài deps trước để tận dụng layer cache
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy mã nguồn
COPY . .

EXPOSE 8000

# Chạy production server. Đổi DATABASE_URL/JWT_SECRET qua biến môi trường.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
