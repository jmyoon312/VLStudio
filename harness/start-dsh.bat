@echo off
title DeepSeek Harness Web Server - ViraLoop Studio
echo [ViraLoop Studio] Launching DeepSeek Harness Web Cockpit on http://127.0.0.1:3080 ...
npx @deepseek-ai/dsh web --port 3080 --patch ./harness/viraloop-tools.yml --no-open
pause
