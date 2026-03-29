# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

**Librarian** is a lightweight MCP server that provides Agentic Search for AI knowledge hubs. It serves markdown documents through MCP tools with progressive disclosure.

Core philosophy: AI agents navigate, not search. Give them a map, they find facts.

## Quick Start

```bash
bun install
bun start          # Start MCP server (stdio transport)
bun run start:http # Start MCP server (HTTP transport, endpoint /mcp)
bun run smoke      # Run smoke tests (auto-falls back to tests/fixtures/data-refined)
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `LIBRARIAN_REFINED_DIR` | `./data-refined` | Knowledge base root directory |
| `LIBRARIAN_PORT` | `3001` | HTTP server port for `start:http` |
| `LIBRARIAN_HOST` | `127.0.0.1` | HTTP bind host for `start:http` |
| `LIBRARIAN_MCP_TOKEN` | _empty_ | Optional Bearer token for HTTP MCP endpoint |

## Architecture

### MCP Tools (Progressive Disclosure)

| Level | Tool | Purpose |
|-------|------|---------|
| L0 | `list-libraries` | Discover available knowledge bases |
| L1 | `list-structure` | View file tree (The Map) |
| L2 | `grep-knowledge` | Keyword search with line numbers |
| L3 | `peek-document` | H1/H2 anchors + first 30 lines |
| L4 | `read-section` | Read a heading-scoped section with line-range |
| L5 | `read-document` | Full content retrieval |

Current optional params:
- `list-structure`: `depth`, `cursor`, `limit`
- `grep-knowledge`: `pathPrefix`, `caseSensitive`, `cursor`, `limit`

### Key Files

- `src/index.ts` - MCP server entry point
- `src/tools/navigation.ts` - Navigation tools implementation
- `src/core/runtime.ts` - Runtime utilities

## Data Flow

```
data-refined/      ← Produced/refreshed by this repo CI (or mounted locally)
    └── [library]/
         └── *.md   ← Markdown files with frontmatter
    ↓ bun start
MCP Hub (stdio) → AI Agent tools
```

## Deployment

Librarian is designed as a headless MCP server. Runtime reads local `data-refined/`.
This repository CI owns data-preparation orchestration while upstream is incomplete.

```bash
# Option A: use CI-produced artifacts
# Option B: mount or sync an existing data-refined snapshot locally

# Start server
bun start
```

## Error Messages

When tools fail, they provide actionable guidance:

- `Library 'xxx' not found` → Ensure `data-refined/<library-id>` exists and is mounted
- `Document not found` → Use list-structure to see available files

## Scope Note

Current local CLI scope is runtime-first (`start`, `start:http`, `dev`, `dev:http`, `smoke`).
Data-prep ownership is this repository CI, not upstream.
