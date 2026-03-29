# Librarian Backlog

Last updated: 2026-03-29

## Context

Current repository scope is a runtime MCP server for deterministic markdown navigation.
Core philosophy remains unchanged: navigation-first, progressive disclosure, traceable retrieval.

## Progress Snapshot

Implemented on `main`:

1. B0-1 strict tool argument validation (Zod + strict schemas).
2. B0-2 smoke test fixture fallback (`tests/fixtures/data-refined`).
3. B0-3 error contract cleanup in runtime and smoke checks.
4. B1-1 list-structure pagination controls (`depth`, `cursor`, `limit`).
5. B1-2 grep filters/pagination (`pathPrefix`, `caseSensitive`, `cursor`, `limit`).
6. B1-3 heading-scoped drilldown via `read-section`.
7. B0-4 CI pipeline hardening for runtime-first execution and optional data-prep stages.

## Delivery Rules

1. Keep behavior deterministic and source-traceable.
2. Prefer simple file-based contracts over opaque abstractions.
3. Every feature must include tests and docs updates in the same PR.

## Priority Backlog

| ID | Priority | Status | Task | Why | Acceptance Criteria |
|---|---|---|---|---|---|
| B0-1 | P0 | done | Add strict input validation (Zod) for all tools | Avoid malformed params and unstable tool behavior | Invalid args return clear errors; valid args unchanged; smoke test covers validation failures |
| B0-2 | P0 | done | Introduce deterministic fixture dataset under `tests/fixtures/data-refined` | Current smoke test may skip and miss regressions | CI runs smoke without external data; all 6 tools are asserted on fixture |
| B0-3 | P0 | done | Normalize error contract and remove stale guidance | Current messages still reference non-existent build pipeline in places | All user-facing errors reference real actions only; docs and tests updated |
| B0-4 | P0 | done | Harden repository CI so runtime checks are always runnable | Existing CI path can fail on missing secrets/scripts before reaching smoke | CI runs `bun run smoke` reliably; external sync/data-prep stages are optional and non-blocking when unavailable |
| B1-1 | P1 | done | Add `list-structure` controls (`depth`, `cursor`, `limit`) | Unbounded tree output does not scale | Large tree can be paged; response includes `hasMore` and next cursor |
| B1-2 | P1 | done | Add `grep-knowledge` filters (`pathPrefix`, `caseSensitive`, `limit`, `cursor`) | Full scan output is too broad for large libraries | Filtered and paged grep works; backward compatible defaults preserved |
| B1-3 | P1 | done | Add `read-section` tool (heading-based drilldown) | `peek + read full` wastes tokens for long docs | Can read by heading anchor; line range returned for provenance |
| B1-4 | P1 | todo | Precompute lightweight metadata index (`state/libraries.stats.json`) and use cache | Runtime currently rescans file trees repeatedly | `list-libraries` and stats avoid full rescans on every call; cache invalidation documented |
| B1-5 | P1 | todo | Add optional semantic skeleton extraction contract (`skeleton` sidecar or frontmatter field) | Agents should preview structure before full reads on long docs | `peek-document` can return skeleton summary when available without full content load |
| B1-6 | P1 | todo | Add exclusion rules (`.agentignore` / path denylist) for list+grep | Reduce retrieval noise and token waste from irrelevant files | Ignored paths are excluded consistently from `list-structure` and `grep-knowledge` |
| B1-7 | P1 | todo | Add source provenance URL in retrieval outputs | Strengthen citation honesty and operator trust | `grep`/`read` responses include canonical source reference when configured |
| B2-1 | P1 | todo | Ship remote MCP transport (HTTP/SSE) with token auth for VPS deployment | Target is local zero-dependency usage across agent clients | Agents connect via domain+token without local Bun runtime; stdio mode remains for local dev |
| B2-2 | P2 | todo | Add structured observability (request id, latency, tool outcome) | Needed for operability and tuning | Logs include tool name, duration, status; can trace slow calls |
| B2-3 | P2 | todo | Performance hardening: async IO and optional `rg` backend for grep | Full synchronous scans will degrade at scale | Benchmark script added; grep latency reduced on large fixture corpus |
| B2-4 | P2 | todo | Publish SKILL integration playbooks for high-efficiency tool orchestration | Team plans to layer SKILL workflows on top of MCP runtime | Documented SKILL templates map use-cases to tool-call sequences; examples validated against smoke fixture |

## Suggested Execution Order

1. B1-4 -> B1-5 -> B1-6 -> B1-7
2. B2-1 -> B2-2 -> B2-3 -> B2-4

## Scale Gates (Linus Guardrail)

Do not start P2 tasks unless one or more conditions are met:

1. `data-refined` total markdown files > 10,000.
2. Grep/list p95 latency > 300ms in production-like runs.
3. Runtime logs show recurring timeout or overload symptoms.

## Definition of Done (Global)

1. `bun run smoke` passes in CI without external dataset.
2. README and `docs/ARCHITECTURE.md` reflect shipped behavior.
3. New tool params are documented and covered by tests.
4. No breaking change without explicit version note.
