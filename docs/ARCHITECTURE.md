# Librarian Architecture

> "Bad programmers worry about the code. Good programmers worry about data structures and their relationships." — Linus Torvalds

## 0. Document Scope

This document describes runtime architecture and implementation boundaries.
For project motivation and design worldview, see `docs/PHILOSOPHY.md`.

## 0.1 Primary Use Case

Primary target is a **personal private cloud knowledge service**:

1. One owner curates and controls knowledge sources.
2. This repository CI prepares or refreshes markdown artifacts into `data-refined`.
3. Librarian runtime serves those artifacts to agent clients via MCP.

### 0.1.1 SSOT Target (Do Not Drift)

1. Primary deployment model is VPS-hosted MCP for one owner.
2. Agent clients should consume the remote MCP endpoint with local zero runtime dependency.
3. SKILL integration is an orchestration layer above MCP tools, not a replacement for runtime contracts.

## 0.2 Out of Scope (This Repository)

The following are intentionally outside this runtime codebase:

1. UI product surface and end-user interaction layers.
2. Vector ranking infrastructure and embedding management.
3. Multi-tenant account or ACL systems.
4. Complex cross-repo orchestration frameworks.

## 0.3 External Dependency Boundary

This repository CI is responsible for data-preparation ownership:

1. Pulling/syncing raw inputs when configured.
2. Running standardization/manifest stages when pipeline scripts are available.
3. Publishing/refreshing `data-refined` artifacts for runtime serving.

This repository is responsible for:

1. Loading local refined libraries from `LIBRARIAN_REFINED_DIR`.
2. Exposing deterministic MCP navigation tools.
3. Returning traceable retrieval coordinates (`libraryId + path + line`).

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

No data-prep command is executed inside the request path.
Runtime stays focused on deterministic serving from `data-refined`.

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
| L4 | `read-section` | Return heading-scoped section with line-range |
| L5 | `read-document` | Return full document |

Current optional controls:
1. `list-structure`: `depth`, `cursor`, `limit`
2. `grep-knowledge`: `pathPrefix`, `caseSensitive`, `cursor`, `limit`

## 3. Current Constraints

These are known runtime constraints in the present implementation:

1. File operations are synchronous (blocking per request).
2. Grep is full scan over Markdown files in target library.
3. Default calls can still be broad if callers omit pagination controls.
4. `peek-document` is fixed to first 30 lines (not section-aware), while deeper drilldown uses `read-section`.
5. Smoke uses fixture fallback when external `data-refined` is absent.

## 4. Planned Evolution (Roadmap)

The following are architectural goals, not current behavior:

1. Artifact compatibility checks for CI-produced `data-refined` snapshots.
2. Precomputed lightweight indexes (headings, metadata, file stats).
3. Cursor/pagination and depth constraints for large libraries.
4. Higher-level semantic summaries/skeletons to improve pre-read selection.
5. Optional remote transport (HTTP/SSE) with auth for cloud deployment.
6. Retrieval provenance enrichments (source URL and canonical references).

## 5. Design Principle

The stack should remain explainable:

- Prefer explicit coordinates over semantic guesses.
- Keep data format simple (Markdown first).
- Add indexes only when they reduce latency without hiding provenance.
- Preserve source traceability (`libraryId + path + line`) in outputs.
