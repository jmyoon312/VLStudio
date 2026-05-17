FROM python:3.11-slim

# Install system dependencies for media processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install common ViraLoop dependencies
RUN pip install --no-cache-dir \
    pydantic \
    openai \
    anthropic \
    requests \
    python-dotenv \
    sqlalchemy \
    psycopg2-binary \
    pgvector \
    moviepy \
    pillow

# Start a simple listener or keep alive
CMD ["tail", "-f", "/dev/null"]
