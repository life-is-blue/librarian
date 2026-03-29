# librarian: The Librarian for Agents

Agentic Search logic: **navigating, not chunk recalling**.
Give AI a map and deterministic tools, not opaque vector hits.

## Background

Most AI knowledge stacks optimize for probabilistic recall (embedding + vector DB).
This project is built for a different failure mode: when exact paths, versions, flags,
and headings matter more than semantic proximity.

Librarian treats navigation as a first-class retrieval strategy:

- Start with structure
- Narrow by explicit coordinates
- Read only what is needed
- Preserve source traceability

For the full rationale and design philosophy, see `docs/PHILOSOPHY.md`.

## Primary Use Case

Personal private knowledge service for one owner:

- Raw content can come from external sources (for example `git-library`)
- Standardization/artifact refresh is owned by this repository's CI workflow (upstream is not complete yet)
- This repository serves refined markdown to agents through MCP tools
- Deployment target is a personal VPS/domain where multiple agent clients can connect

## SSOT North Star

To prevent scope drift, this repository keeps one explicit target:

1. Run Librarian as a VPS-hosted MCP service so agent clients can use it with local zero runtime dependency (configuration only).
2. Keep retrieval deterministic and traceable (`libraryId + path + line`), not vector-first.
3. Add SKILL-level orchestration later to improve multi-step tool usage efficiency, without changing runtime truth boundaries.

## Philosophy

1. **Navigate-First**: Filenames, headings, and line numbers are facts.
2. **Progressive Disclosure**: Discover -> locate -> preview -> drill down.
3. **Headless MCP Service**: No UI requirement; tools are the interface.
4. **Deterministic Retrieval**: Filesystem + keyword matching over Markdown.

## Current Scope (Implemented)

This repository currently ships the MCP runtime layer:

- MCP server over stdio (`bun start`)
- Tool set:
  - `list-libraries`
  - `list-structure`
  - `grep-knowledge`
  - `peek-document`
  - `read-section`
  - `read-document`
- Serving root: `data-refined/<libraryId>`

Data-preparation ownership is in this repository CI (`.github/workflows/librarian.yml`).
Local runtime scripts are intentionally minimal right now (`start`, `dev`, `smoke`).

## Quick Start

```bash
bun install

# Optional: custom data root (default: ./data-refined)
export LIBRARIAN_REFINED_DIR=./data-refined

# Launch MCP server (stdio transport)
bun start

# Smoke test (uses tests/fixtures/data-refined fallback if external data is absent)
bun run smoke
```

## Data Contract

Expected filesystem layout:

```text
data-refined/
  <library-id>/
    ...markdown files...
```

If a library or document does not exist, tools return actionable error messages.

## Tool Parameters (Current)

- `list-structure`
  - Required: `libraryId`
  - Optional: `depth`, `cursor`, `limit`
  - Behavior: paged tree response with `hasMore/nextCursor` metadata
- `grep-knowledge`
  - Required: `libraryId`, `query`
  - Optional: `pathPrefix`, `caseSensitive`, `cursor`, `limit`
  - Behavior: paged match response with total counts and optional filters
- `read-section`
  - Required: `libraryId`, `path`, `heading`
  - Behavior: returns section-scoped excerpt and line-range metadata

## References

- Runtime entry: `src/index.ts`
- Navigation tools: `src/tools/navigation.ts`
- Architecture notes: `docs/ARCHITECTURE.md`
- Philosophy and design rationale: `docs/PHILOSOPHY.md`
