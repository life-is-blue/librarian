# Agent-Oriented Labeling Specification (v1.0)

This is NOT for humans. This is for the `kilog/standardizer` logic to normalize Markdown for AI consumption.

## 1. Intent-Driven Routing (Routing Card)
The library's description must be **exclusive**.
- **Bad**: "Claude Code docs."
- **Good**: "Handling installation, auth errors, custom hooks, and MCP integration for Claude Code. If you are configuring .clauderc, enter here."

## 2. Semantic Anchors (Frontmatter)
Each document must contain an AI-readable header:
```markdown
---
intent: [setup, troubleshooting, api-ref]
scope: [cli, terminal, ide-plugin]
keywords: [oauth-flow, token-refresh, silent-install]
---
```

## 3. Heading-Only Cataloging
The `kilog` catalog prefers **headings** over **full content** for Level 0 and Level 1 disclosure.
- Headings must be descriptive: `## How to configure custom commands` > `## Configuration`.

## 4. Federated Labels (Vocabulary)
The registry uses a **Controlled Vocabulary** to bridge the gap between user intent and document titles:
- `Vocabulary Facet`: `{"action": ["configure", "setup", "integrate"], "platform": ["nodejs", "python"]}`.

---
*Goal: 100% Deterministic Navigation for AI Agents.*
