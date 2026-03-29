# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

**Librarian** is a lightweight MCP server that provides Agentic Search for AI knowledge hubs. It serves markdown documents through MCP tools with progressive disclosure.

Core philosophy: AI agents navigate, not search. Give them a map, they find facts.

## Quick Start

```bash
bun install
bun start          # Start MCP server (stdio transport)
bun run smoke      # Run smoke tests (auto-falls back to tests/fixtures/data-refined)
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `LIBRARIAN_REFINED_DIR` | `./data-refined` | Knowledge base root directory |

## Architecture

### MCP Tools (Progressive Disclosure)

| Level | Tool | Purpose |
|-------|------|---------|
| L0 | `list-libraries` | Discover available knowledge bases |
| L1 | `list-structure` | View file tree (The Map) |
| L2 | `grep-knowledge` | Keyword search with line numbers |
| L3 | `peek-document` | H1/H2 anchors + first 30 lines |
| L4 | `read-document` | Full content retrieval |

### Key Files

- `src/index.ts` - MCP server entry point
- `src/tools/navigation.ts` - Navigation tools implementation
- `src/core/runtime.ts` - Runtime utilities

## Data Flow

```
data-refined/      ← Downloaded from CI artifacts or git clone --branch data-refined
    └── [library]/
         └── *.md   ← Markdown files with frontmatter
    ↓ bun start
MCP Hub (stdio) → AI Agent tools
```

## Deployment

Librarian is designed as a headless MCP server. Data is prepared by CI and downloaded separately.

```bash
# Download data from artifacts or clone
git clone --branch data-refined https://git.cnb.cool/.../git-library.git data-refined

# Start server
bun start
```

## Error Messages

When tools fail, they provide actionable guidance:

- `Library 'xxx' not found` → Ensure `data-refined/<library-id>` exists and is mounted
- `Document not found` → Use list-structure to see available files

## Scope Note

Current repository scope is runtime-only MCP serving. Pipeline commands such as
`sync`, `standardize`, `manifest`, and `build` are roadmap items and are not implemented here yet.
These are expected to be handled by upstream data pipeline projects (for example `git-library`).
