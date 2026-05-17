# --- Multi-stage Build for Hermes Agent (Python + Built Frontend) ---

# [Stage 1] Build the React Frontend
FROM node:20-slim AS build-web
WORKDIR /app
RUN apt-get update && apt-get install -y git
RUN git clone --depth=1 https://github.com/NousResearch/hermes-agent.git .
WORKDIR /app/web
RUN npm install
RUN npm run build

# [Stage 2] Python Runtime
FROM python:3.12-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install hermes-agent from GitHub
RUN pip install --no-cache-dir git+https://github.com/NousResearch/hermes-agent.git fastapi uvicorn

# [IMPORTANT] Create and set the Web Dist directory
ENV HERMES_WEB_DIST=/opt/hermes/web_dist
RUN mkdir -p /opt/hermes/web_dist

# Stage 1 build output is in ../hermes_cli/web_dist relative to /app/web -> /app/hermes_cli/web_dist
COPY --from=build-web /app/hermes_cli/web_dist /opt/hermes/web_dist

# Create hermes data directory
RUN mkdir -p /root/.hermes

EXPOSE 9119

# --insecure: allows binding to 0.0.0.0
# --no-open: don't try to open a browser
CMD ["hermes", "dashboard", "--host", "0.0.0.0", "--port", "9119", "--no-open", "--insecure"]
