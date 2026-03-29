# kilog: The Librarian for Agents

Agentic Search logic: **Navigating, not searching.**
Stop hallucinating with vectors. Give your AI a map and a flashlight.

## The Philosophy

1. **Navigate-First**: Vectors are fuzzy. Filenames and headings are facts.
2. **Headless**: No UI. The index is the product.
3. **Dumb Data, Smart Tools**: The knowledge is Markdown. The intelligence is in the MCP tools.
4. **GitOps**: Your CI is your librarian. Commit -> Standardize -> Map -> Serve.

## Architecture

- **Registry**: Federated library list in `config/registry.json`.
- **Standardizer**: LLM-powered Markdown cleaner. Normalizes raw Git/RSS content.
- **MCP Hub**: Serve knowledge through Tool Context.
  - `list_structure`: Map the terrain.
  - `grep_knowledge`: High-precision keyword location.
  - `peek_document`: Progressive disclosure of headings and summaries.
  - `read_content`: The final drill-down.

## Quick Start

```bash
# Clone your knowledge repos to ./data
# Run the standardizer
bun standardize

# Launch the MCP server
bun start
```

## Why?

Because AI is smarter than a cosine similarity score. Give it the tools to find facts, and it will stop lying to you.
