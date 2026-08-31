# Memory Index

Last Updated: 2026-09-01

## Directory Structure

```
memory/
├── INDEX.md                    # This file - master index
├── current/                    # Active session memories
│   ├── PROJECT_CONTEXT.md      # Project architecture & rules
│   ├── ACTIVE_TASKS.md         # Current tasks & progress
│   ├── TECHNICAL_DECISIONS.md  # Key technical decisions
│   └── SESSION_LOG.md          # Session history
├── .archive/                   # Old/archived memories
└── history/                    # Historical session logs
```

## Quick Reference

- **Project**: ViraLoop Studio (VLStudio Desktop)
- **Stack**: Electron + React + FastAPI + Google Flow AI
- **Storage**: `C:\Users\jmyoo\AppData\Local\ViraLoop Studio\media\`
- **Build**: `node scripts/verify-and-build.cjs`

## Memory Categories

1. **Project Context** - Architecture, rules, conventions
2. **Technical Decisions** - Why certain approaches were chosen
3. **Active Tasks** - What's currently being worked on
4. **Session History** - What happened in each session
5. **Lessons Learned** - What worked/didn't work

## Recent Updates

- 2026-09-01: Memory system initialized
- 2026-09-01: I2V video generation bug fixed
