# Librarian Architecture

> "Bad programmers worry about the code. Good programmers worry about data structures and their relationships." — Linus Torvalds

## 1. Core Philosophy

### The Problem with Traditional RAG
Vector similarity search is a black-box approximation. It works for fuzzy matching but fails for **precise reasoning** where exact keywords, version numbers, and file paths matter.

### Our Thesis
AI Agents are smart enough to navigate. Give them:
- A **map** (`list-structure`)
- A **flashlight** (`grep-knowledge`)
- Progressive disclosure tools (`peek-document`, `read-document`)

They will find answers more accurately than any vector database.

### The Pillars

1. **Search is Failure**: Navigation succeeds before search is needed.
2. **Context Density**: Skeletons (headings + summaries) over chunks.
3. **Determinism over Probability**: Keywords, file paths, and headings are facts.
4. **GitOps as Librarian**: CI pipeline standardizes and serves knowledge.

## 2. Data Lifecycle

Librarian treats data as a first-class citizen with provenance tracking.

### Directory Structure (not branches)

```
project-root/
├── data/                 # Raw upstream sources (immutable evidence)
├── data-refined/         # Standardized output (MCP server reads from here)
├── src/                  # Mechanism (code only)
└── state/                # Generated index files
```

**Key Rules**:
- `data/`: Never manually edit. Raw evidence for audit.
- `data-refined/`: Only automated scripts write here.
- `src/`: Code only, keeping repo lightweight.

### Transformation Pipeline

1. **Sync** (`bun run sync`): Pull raw content from Git repos.
2. **Standardize** (`bun run standardize`): LLM adds frontmatter (intent, scope, keywords, summary).
3. **Manifest** (`bun run manifest`): Generate `state/libraries.stats.json`.

## 3. Agent-Oriented Tagging

Documents in `data-refined/` follow a standardized frontmatter schema:

```yaml
---
intent: [setup, troubleshooting, api-ref, guide, reference]
scope: [cli, terminal, ide-plugin, web, core]
keywords: ["oauth-flow", "token-refresh", "silent-install"]
summary: "One sentence under 100 words"
source_hash: "sha256-of-original"
---
```

### Requirements
- Headings must be descriptive: `## How to configure custom commands` > `## Configuration`
- Each document must have complete frontmatter (enforced by standardizer)

## 4. MCP Tool Architecture

The Hub exposes 4 levels of progressive disclosure:

| Level | Tool | Purpose |
|-------|------|---------|
| L1 | `list-libraries` | Discover available repositories |
| L2 | `list-structure` | View file tree of a library |
| L3 | `grep-knowledge` | Search keywords with line numbers |
| L4 | `peek-document` | Get headings + first 30 lines |
| L5 | `read-document` | Full content retrieval |

**Design Principle**: Force the Agent to make deliberate choices at each step, minimizing token waste from irrelevant content.

## 5. Registry System

Federated library configuration in `config/registry.json`:

```json
{
  "libraries": [
    {
      "id": "gemini-cli",
      "name": "Gemini CLI Official Docs",
      "url": "https://github.com/google-gemini/gemini-cli.git",
      "branch": "main",
      "source_subpath": "docs"
    }
  ]
}
```

Each library is independently synced and standardized.

## 6. Environment Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `LIBRARIAN_RAW_DIR` | `./data` | Raw content directory |
| `LIBRARIAN_REFINED_DIR` | `./data-refined` | Standardized output |
| `LIBRARIAN_REGISTRY` | `./config/registry.json` | Library registry path |
| `LLM_API_KEY` | - | For standardizer LLM calls |
| `LIBRARIAN_ALLOW_MOCK_LLM` | - | Fallback mock tags (local dev) |

---

*Goal: 100% Deterministic Navigation for AI Agents.*
