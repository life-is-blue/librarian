# Librarian Philosophy

## 1. Why This Project Exists

Most RAG systems optimize for fuzzy semantic recall. That works for broad Q&A but
often fails in engineering-heavy workflows where precision matters:

- exact command names
- specific version constraints
- file and heading provenance
- deterministic reproducibility of answers

Librarian is built around a different assumption:

> Agents are capable reasoners.  
> The system should provide clear navigation tools, not opaque guesswork.

## 2. Core Position

### 2.1 Navigation Before Retrieval

Search is not the first move. The first move is orientation.
An agent should be able to:

1. discover available libraries
2. inspect structure
3. locate keyword coordinates
4. preview before full read

This reduces blind context stuffing and improves answer traceability.

### 2.2 Determinism Over Probability

Vectors are approximations. Paths and headings are facts.

Librarian prefers evidence that can be pointed to directly as:

`libraryId + file path + line number`

### 2.3 Dumb Data, Smart Tools

Knowledge stays in Markdown. Intelligence lives in tooling behavior.
This keeps data portable, auditable, and easy to version.

### 2.4 Progressive Disclosure

The tool chain intentionally mirrors expert investigation:

- map first (`list-structure`)
- pinpoint (`grep-knowledge`)
- inspect (`peek-document`)
- drill down (`read-document`)

Each step controls token cost and prevents premature overloading of context.

## 3. System Values

1. Explainability: every answer should map back to explicit source coordinates.
2. Low operational burden: filesystem-first baseline, minimal mandatory infra.
3. Interoperability: MCP-native, usable by different agents and clients.
4. Evolvability: indexes can be added, but not at the expense of provenance.

## 4. What Librarian Is Not

1. Not a vector-first semantic platform.
2. Not a UI product by default.
3. Not a hidden ranking engine with uninspectable scoring logic.

## 5. Long-Term Direction

The long-term architecture may include richer CI data-prep stages
(sync/standardize/manifest hardening) and lightweight indexes, but the contract remains the same:

- preserve deterministic navigation
- preserve source traceability
- keep agent decision points explicit
