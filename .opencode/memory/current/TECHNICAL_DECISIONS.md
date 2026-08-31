# Technical Decisions

Last Updated: 2026-09-01

## Decision 1: I2V Video Generation Fix

### Context
- Images were not being used for I2V video generation
- Generated videos could not be fetched after completion

### Decision
1. **Rewrite `fetchMediaAsBase64`** to use `redirect: 'manual'` instead of automatic redirect following
2. **Add `setFlowPageInject`/`clearFlowPageInject` functions** to main.js and inject into videoDeps

### Rationale
- TRPC `media.getMediaUrlRedirect` returns 302 redirect, not direct URL
- `flowPageFetch`/`sessionFetch` follow redirects automatically, losing the URL
- `setFlowPageInject` was never defined, so monkey-patch was never armed

### Outcome
- Build successful
- User confirmed both image usage and video fetch working

## Decision 2: Memory System Architecture

### Context
- Need AI agent memory across sessions
- Current project has no memory infrastructure

### Decision
- Create `.opencode/memory/` directory structure
- Use markdown files for memory storage
- Separate current session from archived memories

### Rationale
- Simple, human-readable format
- Easy to version control
- Compatible with opencode agent system

### Implementation
```
memory/
├── INDEX.md                    # Master index
├── current/                    # Active session memories
│   ├── PROJECT_CONTEXT.md      # Project architecture
│   ├── ACTIVE_TASKS.md         # Current tasks
│   ├── TECHNICAL_DECISIONS.md  # Key decisions
│   └── SESSION_LOG.md          # Session history
├── .archive/                   # Old memories
└── history/                    # Historical logs
```

## Decision 3: Storage Location

### Context
- User asked about `C:\Users\jmyoo\AppData\Local\ViraLoop Studio\media` folder

### Decision
- Keep media folder as primary storage for generated content
- Memory system is separate, for AI agent context

### Rationale
- Media folder follows OPENCODE.md convention
- Memory system is for AI agent, not file storage
- Different purposes, different locations
