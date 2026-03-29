# AGENTS.md

This file provides guidance to AI coding agents (Claude, Gemini, Codex, CodeBuddy, etc.) when working with code in this repository.

## Project Overview

**Librarian** (aka kilog) is an Agentic Knowledge Hub implementing "Navigate-First" search philosophy. It provides MCP tools for AI agents to navigate markdown knowledge bases without relying on vector databases.

Core thesis: AI agents are smart enough to navigate with proper tools. Filenames and headings are deterministic facts; vectors are fuzzy approximations.

## Development Commands

```bash
# Launch MCP server (stdio transport)
bun start

# Run LLM-powered standardizer on markdown files in data/
bun standardize

# Development mode with hot reload
bun dev
```

### Environment Variables

- `LLM_API_KEY` - Required for standardizer (OpenAI-compatible API)
- `LLM_BASE_URL` - Optional, defaults to `https://api.openai.com/v1`

## Architecture

### 4-Level Progressive Disclosure

The MCP Hub exposes 5 tools across 4 levels:

| Level | Tool | Purpose |
|-------|------|---------|
| L0 | `list_libraries` | List registered repositories from registry.json |
| L1 | `list_structure` | ASCII tree visualization (The Map) |
| L2 | `grep_knowledge` | Case-insensitive keyword search with `file:line:content` format (max 50 results) |
| L3 | `peek_document` | H1/H2 anchors + first 30 lines preview |
| L4 | `read_document` | Full content drill-down |

### Key Files

- `src/index.ts` - MCP server entry point, tool definitions and routing
- `src/tools/navigation.ts` - Core navigation functions (`listStructure`, `grepKnowledge`, `peekDocument`)
- `src/standardizer/cli.ts` - Markdown processor with idempotency check
- `src/standardizer/llm.ts` - OpenAI-compatible LLM integration
- `config/registry.json` - Federated library registry

### Registry Structure

```json
{
  "libraries": [
    {
      "id": "core-docs",
      "name": "System Core Documents",
      "path": "./data/core-docs",
      "topics": ["architecture", "api", "security"]
    }
  ]
}
```

### Standardizer Frontmatter Schema

Generated frontmatter for each markdown file:

```yaml
---
intent: [setup | troubleshooting | api-ref]
scope: [cli | terminal | ide-plugin]
keywords: [term1, term2, term3]
summary: "Document summary under 100 words"
---
```

The standardizer is idempotent - skips files already containing all four frontmatter fields.

## Data Flow

```
data/ (raw markdown)
    ↓ bun standardize
data/ (standardized markdown with frontmatter)
    ↓ bun start
MCP Hub (stdio) → AI Agent tools
```

## Key Design Principles

1. **No Vector Database** - Uses native filesystem operations only
2. **MCP-Native** - Designed for AI agents via Model Context Protocol
3. **Token Efficiency** - Progressive disclosure prevents context explosion
4. **GitOps** - GitHub Actions automates standardization on push/schedule

## Notes

- `data/` is gitignored except `.gitkeep` - knowledge content is not versioned
- `src/hub/` directory exists but is empty - manifest generation script referenced in CI is not implemented
- SQLite dependency is declared but not actively used in current implementation
- No test suite configured
