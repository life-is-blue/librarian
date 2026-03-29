# Librarian Backlog

Last updated: 2026-03-29

## Context

Current repository scope is a runtime MCP server for deterministic markdown navigation.
Core philosophy remains unchanged: navigation-first, progressive disclosure, traceable retrieval.

## Delivery Rules

1. Keep behavior deterministic and source-traceable.
2. Prefer simple file-based contracts over opaque abstractions.
3. Every feature must include tests and docs updates in the same PR.

## Priority Backlog

| ID | Priority | Task | Why | Acceptance Criteria |
|---|---|---|---|---|
| B0-1 | P0 | Add strict input validation (Zod) for all tools | Avoid malformed params and unstable tool behavior | Invalid args return clear errors; valid args unchanged; smoke test covers validation failures |
| B0-2 | P0 | Introduce deterministic fixture dataset under `tests/fixtures/data-refined` | Current smoke test may skip and miss regressions | CI runs smoke without external data; all 5 tools are asserted on fixture |
| B0-3 | P0 | Normalize error contract and remove stale guidance | Current messages still reference non-existent build pipeline in places | All user-facing errors reference real actions only; docs and tests updated |
| B1-1 | P1 | Add `list-structure` controls (`depth`, `cursor`, `limit`) | Unbounded tree output does not scale | Large tree can be paged; response includes `hasMore` and next cursor |
| B1-2 | P1 | Add `grep-knowledge` filters (`pathPrefix`, `caseSensitive`, `limit`, `cursor`) | Full scan output is too broad for large libraries | Filtered and paged grep works; backward compatible defaults preserved |
| B1-3 | P1 | Add `read-section` tool (heading-based drilldown) | `peek + read full` wastes tokens for long docs | Can read by heading anchor; line range returned for provenance |
| B1-4 | P1 | Precompute lightweight metadata index (`state/libraries.stats.json`) and use cache | Runtime currently rescans file trees repeatedly | `list-libraries` and stats avoid full rescans on every call; cache invalidation documented |
| B2-1 | P2 | Add optional non-stdio transport (HTTP/SSE) with token auth | Needed for personal cloud deployment and remote agents | Remote transport works with auth token; stdio mode remains default |
| B2-2 | P2 | Add structured observability (request id, latency, tool outcome) | Needed for operability and tuning | Logs include tool name, duration, status; can trace slow calls |
| B2-3 | P2 | Performance hardening: async IO and optional `rg` backend for grep | Full synchronous scans will degrade at scale | Benchmark script added; grep latency reduced on large fixture corpus |

## Suggested Execution Order

1. B0-1 -> B0-2 -> B0-3
2. B1-1 -> B1-2 -> B1-3 -> B1-4
3. B2-1 -> B2-2 -> B2-3

## Definition of Done (Global)

1. `bun run smoke` passes in CI without external dataset.
2. README and `docs/ARCHITECTURE.md` reflect shipped behavior.
3. New tool params are documented and covered by tests.
4. No breaking change without explicit version note.
