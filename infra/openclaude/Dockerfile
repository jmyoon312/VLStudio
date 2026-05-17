FROM node:22-slim AS build

# ripgrep을 미리 설치 (GitHub 다운로드 우회)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ripgrep ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ripgrep 바이너리 위치를 환경변수로 지정 (vscode/ripgrep 다운로드 우회)
ENV RIPGREP_PATH=/usr/bin/rg

WORKDIR /app

# 소스 클론
RUN git clone --depth=1 https://github.com/Gitlawb/openclaude.git .

# Bun 설치 및 빌드
RUN npm install -g bun@1.3.11
RUN bun install --frozen-lockfile || bun install

# [FIX] 빌드 실패 시 중단하도록 설정 (|| true 제거)
RUN bun run build

# 프로덕션 의존성만 설치
RUN rm -rf node_modules && (bun install --production || npm install --production)

# ---- runtime ----
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

ENV RIPGREP_PATH=/usr/bin/rg

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/bin ./bin
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# [NEW] 초기 설정 생성을 위한 헬퍼 스크립트
COPY <<'EOF' /app/entrypoint.sh
#!/bin/sh
# 설정 디렉토리 보장
# 설정 파일이 없으면 기본값으로 생성 (서버 기동을 위해)
if [ ! -f /home/node/.claude/.openclaude.json ] && [ ! -f /home/node/.claude/settings.json ]; then
    CONF_DATA="{\"apiKey\": \"${ANTHROPIC_API_KEY:-empty_key}\", \"provider\": \"anthropic\"}"
    echo "$CONF_DATA" > /home/node/.claude/.openclaude.json
fi

# 프로세스 실행
export HOST=0.0.0.0
export PORT=28789
echo "🚀 Starting OpenClaude on 0.0.0.0:28789..."

# 서버 실행 시도, 실패 시 컨테이너 유지 (수동 로그인 대기용)
node /app/dist/cli.mjs serve || {
    echo "⚠️ OpenClaude failed to start. Keeping container alive for manual login..."
    tail -f /dev/null
}
EOF

RUN chmod +x /app/entrypoint.sh

USER node

EXPOSE 28789

ENTRYPOINT ["/app/entrypoint.sh"]
