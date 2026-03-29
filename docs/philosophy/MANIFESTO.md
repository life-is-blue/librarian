# librarian Manifesto: The Agentic Knowledge Hub

> "Bad programmers worry about the code. Good programmers worry about data structures and their relationships." —— Linus Torvalds

## The Core Problem
Traditional RAG is based on a lie: that vector similarity equals semantic understanding. Vectors are noisy black-boxes. They fail for **reasoning**.

## Our Thesis
AI Agents are smart enough to navigate. If we give them a map (`list-structure`) and a flashlight (`grep-knowledge`), they will find the truth faster and more accurately than any vector database.

## The Pillars

1. **Search is Failure**: We only search when navigation fails.
2. **Context Density**: We don't want "chunks." We want "Skeletons" (Headings + Summaries) for progressive disclosure.
3. **Determinism over Probability**: Keywords, file paths, and headings are deterministic.
4. **GitOps as the Librarian**: Your CI pipeline is your librarian.

## Philosophy for Maintainers
- **Keep it Simple**: If a folder structure can solve it, don't build a database.
- **Tools over UI**: We need high-performance MCP tools (`list-structure`, `peek-document`).
- **Distributed by Default**: No central silo. Use federated registries for distributed knowledge.

---
*Goal: 100% Deterministic Navigation for AI Agents.*
