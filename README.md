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

## Philosophy

1. **Navigate-First**: Filenames, headings, and line numbers are facts.
2. **Progressive Disclosure**: Discover -> locate -> preview -> drill down.
3. **Headless MCP Service**: No UI requirement; tools are the interface.
4. **Deterministic Retrieval**: Filesystem + keyword matching over Markdown.

## Current Scope (Implemented)

This repository currently implements the MCP runtime layer only:

- MCP server over stdio (`bun start`)
- Tool set:
  - `list-libraries`
  - `list-structure`
  - `grep-knowledge`
  - `peek-document`
  - `read-document`
- Serving root: `data-refined/<libraryId>`

Planned pipeline pieces like `sync / standardize / manifest` are not implemented in this repository yet.

## Quick Start

```bash
bun install

# Optional: custom data root (default: ./data-refined)
export LIBRARIAN_REFINED_DIR=./data-refined

# Launch MCP server (stdio transport)
bun start

# Smoke test (requires data-refined to exist)
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

## References

- Runtime entry: `src/index.ts`
- Navigation tools: `src/tools/navigation.ts`
- Architecture notes: `docs/ARCHITECTURE.md`
- Philosophy and design rationale: `docs/PHILOSOPHY.md`
