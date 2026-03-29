# Librarian Architecture

> "Bad programmers worry about the code. Good programmers worry about data structures and their relationships." — Linus Torvalds

## 0. Document Scope

This document describes runtime architecture and implementation boundaries.
For project motivation and design worldview, see `docs/PHILOSOPHY.md`.

## 1. Core Thesis

Traditional vector RAG is probabilistic. This project is intentionally deterministic:

- Structure is truth (`list-structure`)
- Keywords are coordinates (`grep-knowledge`)
- Preview is a checkpoint (`peek-document`)
- Full read is explicit (`read-document`)

The design target is agentic navigation, not one-shot semantic retrieval.

## 2. Current Runtime (Implemented)

### 2.1 System Boundary

This repository currently ships a **headless MCP server** over stdio.
It reads Markdown directly from a local serving root:

```text
data-refined/<library-id>/**
```

No sync pipeline, standardizer pipeline, or manifest generator is currently implemented here.

### 2.2 Components

- `src/index.ts`
  - MCP server bootstrap
  - Tool schema declaration
  - Tool routing and error mapping
- `src/tools/navigation.ts`
  - Tree listing
  - Keyword scan with line numbers
  - Preview extraction
- `src/core/runtime.ts`
  - Serving root resolution (`LIBRARIAN_REFINED_DIR`)
  - Library discovery
- `src/core/path.ts`
  - Path traversal guard

### 2.3 Tool Contract (Progressive Disclosure)

| Level | Tool | Purpose |
|-------|------|---------|
| L0 | `list-libraries` | Discover available libraries |
| L1 | `list-structure` | Render directory map |
| L2 | `grep-knowledge` | Locate keywords with `file:line` |
| L3 | `peek-document` | Return H1/H2 anchors + first 30 lines |
| L4 | `read-document` | Return full document |

## 3. Current Constraints

These are known runtime constraints in the present implementation:

1. File operations are synchronous (blocking per request).
2. Grep is full scan over Markdown files in target library.
3. `list-structure` is unbounded (no depth/pagination).
4. `peek-document` is fixed to first 30 lines (not section-aware).
5. Smoke tests skip when `data-refined` is absent.

## 4. Planned Evolution (Roadmap)

The following are architectural goals, not current behavior:

1. Data pipeline (`sync`, `standardize`, `manifest`).
2. Precomputed lightweight indexes (headings, metadata, file stats).
3. Cursor/pagination and depth constraints for large libraries.
4. Section-aware read APIs (`read-section` / heading-based drilldown).
5. Optional remote transport (HTTP/SSE) with auth for cloud deployment.

## 5. Design Principle

The stack should remain explainable:

- Prefer explicit coordinates over semantic guesses.
- Keep data format simple (Markdown first).
- Add indexes only when they reduce latency without hiding provenance.
- Preserve source traceability (`libraryId + path + line`) in outputs.
