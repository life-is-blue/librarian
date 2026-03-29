import { dirname, join } from "path";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { generateTags } from "./llm.js";
import { REFINED_DIR, loadRegistry, refinedLibraryPath, resolveLibrarySourceRoot } from "../core/runtime.js";
import { normalizeRelPath } from "../core/path.js";

const FRONTMATTER_FIELDS = ["intent", "scope", "keywords", "summary"];

function hasCompleteFrontmatter(content: string): boolean {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return false;
  const frontmatter = match[1];
  return FRONTMATTER_FIELDS.every((field) => new RegExp(`^\\s*${field}:`, "m").test(frontmatter));
}

function getHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function getFrontmatterField(content: string, fieldName: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const frontmatter = match[1];
  const fieldMatch = frontmatter.match(new RegExp(`^\\s*${fieldName}:\\s*(.+)$`, "m"));
  if (!fieldMatch) return null;

  const raw = fieldMatch[1].trim();
  if (raw.startsWith("\"") && raw.endsWith("\"")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }
  return raw;
}

function collectMarkdownFiles(rootDir: string, subDir = ""): string[] {
  const currentDir = subDir ? join(rootDir, subDir) : rootDir;
  if (!existsSync(currentDir)) return [];

  const results: string[] = [];
  for (const entry of readdirSync(currentDir)) {
    const relPath = subDir ? join(subDir, entry) : entry;
    const absPath = join(rootDir, relPath);
    if (statSync(absPath).isDirectory()) {
      results.push(...collectMarkdownFiles(rootDir, relPath));
      continue;
    }
    if (relPath.endsWith(".md")) {
      results.push(normalizeRelPath(relPath));
    }
  }
  return results;
}

function removeStaleRefinedFiles(targetRoot: string, processedFiles: Set<string>) {
  for (const relPath of collectMarkdownFiles(targetRoot)) {
    if (processedFiles.has(relPath)) continue;
    const stalePath = join(targetRoot, relPath);
    rmSync(stalePath, { force: true });
    console.log(`  Removing stale file ${relPath}`);
  }
}

function removeOrphanLibraries(currentLibraryIds: Set<string>) {
  if (!existsSync(REFINED_DIR)) return;
  for (const entry of readdirSync(REFINED_DIR)) {
    const absPath = join(REFINED_DIR, entry);
    if (!statSync(absPath).isDirectory()) continue;
    if (entry.startsWith(".")) continue;
    if (currentLibraryIds.has(entry)) continue;
    rmSync(absPath, { recursive: true, force: true });
    console.log(`[Standardizer] Removing orphan refined library ${entry}`);
  }
}

async function refineLibrary(library: ReturnType<typeof loadRegistry>["libraries"][number]) {
  const sourceRoot = resolveLibrarySourceRoot(library);
  const targetRoot = refinedLibraryPath(library.id);

  if (!existsSync(sourceRoot)) {
    throw new Error(`[${library.id}] source_subpath not found: ${sourceRoot}`);
  }
  if (!existsSync(targetRoot)) mkdirSync(targetRoot, { recursive: true });

  console.log(`[Standardizer] [${library.id}] source=${sourceRoot} target=${targetRoot}`);

  const processedFiles = new Set<string>();
  for (const relPath of collectMarkdownFiles(sourceRoot)) {
    processedFiles.add(relPath);

    const sourcePath = join(sourceRoot, relPath);
    const targetPath = join(targetRoot, relPath);
    const content = readFileSync(sourcePath, "utf-8");
    const sourceHash = getHash(content);

    if (hasCompleteFrontmatter(content)) {
      console.log(`  Skipping ${library.id}/${relPath} (Already has frontmatter)`);
      if (!existsSync(dirname(targetPath))) mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, content);
      continue;
    }

    if (existsSync(targetPath)) {
      const currentRefined = readFileSync(targetPath, "utf-8");
      const currentSourceHash = getFrontmatterField(currentRefined, "source_hash");
      if (hasCompleteFrontmatter(currentRefined) && currentSourceHash === sourceHash) {
        console.log(`  Skipping ${library.id}/${relPath} (Unchanged source)`);
        continue;
      }
    }

    console.log(`  Processing ${library.id}/${relPath}...`);
    const { frontmatter, summary } = await generateTags(content);
    const refinedContent = `---
intent: ${JSON.stringify(frontmatter.intent)}
scope: ${JSON.stringify(frontmatter.scope)}
keywords: ${JSON.stringify(frontmatter.keywords)}
summary: ${JSON.stringify(summary)}
source_hash: ${JSON.stringify(sourceHash)}
---

${content}`;

    if (!existsSync(dirname(targetPath))) mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, refinedContent);
  }

  removeStaleRefinedFiles(targetRoot, processedFiles);
}

async function refine() {
  const registry = loadRegistry();
  const libraryIds = new Set(registry.libraries.map((library) => library.id));

  if (!existsSync(REFINED_DIR)) mkdirSync(REFINED_DIR, { recursive: true });
  removeOrphanLibraries(libraryIds);

  for (const library of registry.libraries) {
    await refineLibrary(library);
  }
}

refine().catch((error) => {
  console.error(error);
  process.exit(1);
});
