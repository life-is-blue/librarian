import { join, dirname } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, statSync } from "fs";
import { Glob } from "bun";
import { generateTags } from "./llm.js";

const SOURCE_DIR = process.env.LIBRARIAN_SOURCE_DIR || join(process.cwd(), "data");
const TARGET_DIR = process.env.LIBRARIAN_TARGET_DIR || join(process.cwd(), "data-refined");

const FRONTMATTER_FIELDS = ["intent", "scope", "keywords", "summary"];

function hasCompleteFrontmatter(content: string): boolean {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return false;
  const frontmatter = match[1];
  return FRONTMATTER_FIELDS.every(field => new RegExp(`^\\s*${field}:`, "m").test(frontmatter));
}

function normalizeRelPath(path: string): string {
  return path.split("\\").join("/");
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

function removeStaleRefinedFiles(processedFiles: Set<string>) {
  for (const relPath of collectMarkdownFiles(TARGET_DIR)) {
    if (processedFiles.has(relPath)) continue;
    const stalePath = join(TARGET_DIR, relPath);
    rmSync(stalePath, { force: true });
    console.log(`  Removing stale file ${relPath}`);
  }
}

async function refine() {
  console.log(`[Standardizer] Refining from ${SOURCE_DIR} to ${TARGET_DIR}`);
  if (!existsSync(TARGET_DIR)) mkdirSync(TARGET_DIR, { recursive: true });

  const glob = new Glob("**/*.md");
  const processedFiles = new Set<string>();
  
  for await (const file of glob.scan(SOURCE_DIR)) {
    const relPath = normalizeRelPath(file);
    if (relPath.startsWith(".git/") || relPath.includes("/.git/")) continue;
    processedFiles.add(relPath);

    const sourcePath = join(SOURCE_DIR, relPath);
    const targetPath = join(TARGET_DIR, relPath);
    
    const content = readFileSync(sourcePath, "utf-8");
    
    if (hasCompleteFrontmatter(content)) {
      console.log(`  Skipping ${relPath} (Already has frontmatter)`);
      if (!existsSync(dirname(targetPath))) mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, content);
      continue;
    }

    console.log(`  Processing ${relPath}...`);
    const { frontmatter, summary } = await generateTags(content);
    const refinedContent = `---
intent: ${JSON.stringify(frontmatter.intent)}
scope: ${JSON.stringify(frontmatter.scope)}
keywords: ${JSON.stringify(frontmatter.keywords)}
summary: ${JSON.stringify(summary)}
---

${content}`;

    if (!existsSync(dirname(targetPath))) mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, refinedContent);
  }

  removeStaleRefinedFiles(processedFiles);
}

refine().catch((error) => {
  console.error(error);
  process.exit(1);
});
