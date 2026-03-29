# The Knowledge Supply Chain: A Linus-Style Data Lifecycle

Librarian does NOT treat data as a side effect. Data is a first-class citizen with its own provenance.

## 1. Branch: `data-raw` (The Evidence)
This branch acts as an **immutable, deterministic dump** of upstream sources.
- **Rule**: No human or LLM ever edits this.
- **Why**: If we suspect a bug in our AI's summary, we must be able to compare it against the "Raw Evidence."

## 2. Branch: `data-refined` (The Product)
This branch is the **Standardized Output**. It is the only branch the MCP Server reads.
- **Rule**: Only automated scripts (`standardizer`) write here.
- **Why**: This minimizes the "context tax" for AI Agents by providing pre-processed, high-density Markdown.

## 3. Branch: `main` (The Logic)
This branch contains the **Mechanism**.
- **Rule**: Code only. No data.
- **Why**: Keeps the repository lightweight. You can clone the engine without downloading 1GB of knowledge docs.

## 4. The Transformation (Deterministic Pipeline)
1. `raw` is pulled from external Git repos.
2. `standardizer` applies the `AGENT_TAGGING` spec.
3. `refined` is pushed as a new commit, tagged with the `raw` commit hash for auditability.

---
*Auditability is not a feature; it is a requirement.*
