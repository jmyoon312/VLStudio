@echo off
title DeepSeek Harness Web Server - ViraLoop Studio
set YOUTUBE2_API_KEY=sk-95b157f52819c50b-62f661-a5667588
set DEEPSEEK_API_KEY=sk-95b157f52819c50b-62f661-a5667588
npx @deepseek-ai/dsh --profile web --patch ./harness/viraloop-tools.yml
pause
