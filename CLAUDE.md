# ViraLoop Studio (VLStudio) - Claude Code Guide

## Build & Verification Commands
- `node scripts/verify-and-build.cjs` : Full 3-tier contract check and production bundle build.
- `node scripts/contract-checker.js` : Fast static contract analysis between Renderer, Preload, and Main IPC.

## Architecture
- `apps/dashboard/src/pages/CreativeStudio.tsx` : Main creative studio workspace (scene board, timeline, script).
- `apps/dashboard/src/features/creativeStudio/components/ProjectManagerDialog.tsx` : 05_Exports project manager dialog.
- `electron/ipc/filesystem.js` : Electron native filesystem IPC, self-healing disk reconciliation, write locks.
- `electron/ipc/flow-api.js` : Google Flow AI direct & agent DOM streaming engine.
- `apps/api/app/routers/creative.py` : Backend creative endpoints.

## Rules
- Single Source of Truth for storage: `05_Exports/<ProjectName>/`.
- Never hardcode LLM models; dynamically read from DB settings.
- UI styling: Tailwind CSS, Radix UI, Lucide Icons, compact dark mode aesthetics.
