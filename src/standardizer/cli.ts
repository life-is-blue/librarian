import { join, dirname } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { Glob } from "bun";
import { generateTags } from "./llm.js";

const SOURCE_DIR = process.env.LIBRARIAN_SOURCE_DIR || join(process.cwd(), "data");
const TARGET_DIR = process.env.LIBRARIAN_TARGET_DIR || join(process.cwd(), "data-refined");

const FRONTMATTER_FIELDS = ["intent", "scope", "keywords", "summary"];

function hasCompleteFrontmatter(content: string): boolean {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return false;
  const frontmatter = match[1];
  return FRONTMATTER_FIELDS.every(field => new RegExp(`^${field}:`).test(frontmatter));
}

async function refine() {
  console.log(`[Standardizer] Refining from ${SOURCE_DIR} to ${TARGET_DIR}`);
  const glob = new Glob("**/*.md");
  
  for await (const file of glob.scan(SOURCE_DIR)) {
    const sourcePath = join(SOURCE_DIR, file);
    const targetPath = join(TARGET_DIR, file);
    
    if (file.includes(".git/")) continue;

    const content = readFileSync(sourcePath, "utf-8");
    
    if (hasCompleteFrontmatter(content)) {
      console.log(`  Skipping ${file} (Already has frontmatter)`);
      if (!existsSync(dirname(targetPath))) mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, content);
      continue;
    }

    console.log(`  Processing ${file}...`);
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
}

refine().catch(console.error);
