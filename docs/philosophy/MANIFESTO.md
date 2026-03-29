# kilog Manifesto: The Agentic Knowledge Hub

> "Bad programmers worry about the code. Good programmers worry about data structures and their relationships." —— Linus Torvalds

## The Core Problem
Traditional RAG (Retrieval-Augmented Generation) is based on a lie: that vector similarity equals semantic understanding. In reality, vectors are fuzzy, noisy, and black-box. They work for searching, but they fail for **reasoning**.

## Our Thesis
AI Agents (like Claude or Gemini) are smart enough to navigate. If we give them a map and a set of precise tools, they will find the truth faster and more accurately than any vector database.

## The Pillars

1. **Search is Failure**: We only search when navigation fails. If your Catalog is good, the Agent should know where the answer is before calling a tool.
2. **Context Density**: We don't want "chunks." We want "Skeletons" (Headings + Summaries) that allow the Agent to drill down progressively.
3. **Determinism over Probability**: Keywords, file paths, and heading titles are deterministic. They are the bedrock of reliable AI systems.
4. **GitOps as the Librarian**: Your CI pipeline is your librarian. It is responsible for standardizing messy Git/RSS data into high-signal Agentic Markdown.

## Philosophy for Maintainers
- **Keep it Simple**: If a folder structure can solve it, don't build a database.
- **Tools over UI**: We don't need a Chat UI. We need high-performance MCP tools (`grep`, `ls`, `peek`).
- **Distributed by Default**: No central silo. Federated registries allow any Git repo to become a "Library" in the Hub.

---

*This manifesto is a synthesis of the 2026-03 discussion on Agentic Search vs. Vector RAG.*
