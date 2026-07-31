# Accident-detection service (FastAPI + YOLO).
# Build context is the backend/ directory.
FROM python:3.12-slim

# OpenCV/ffmpeg system libs (needed even for the headless build to decode video)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-only torch FIRST so ultralytics doesn't pull the multi-GB CUDA
# build (cloud instances have no GPU anyway). Keeps the image ~1.5GB not ~6GB.
RUN pip install --no-cache-dir \
        torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Hosts (Render/Railway/Fly) inject PORT; default to 8000 locally.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
