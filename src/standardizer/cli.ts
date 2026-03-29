import { join, relative, dirname } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { Glob } from "bun";
// 假定已有封装好的 LLM 接口
import { generateTags } from "./llm.js";

/**
 * Librarian Standardizer (The Refiner)
 */
const SOURCE_DIR = process.env.LIBRARIAN_SOURCE_DIR || join(process.cwd(), "data");
const TARGET_DIR = process.env.LIBRARIAN_TARGET_DIR || join(process.cwd(), "data-refined");

async function refine() {
  console.log(`[Standardizer] Refining from ${SOURCE_DIR} to ${TARGET_DIR}`);
  const glob = new Glob("**/*.md");
  
  for await (const file of glob.scan(SOURCE_DIR)) {
    const sourcePath = join(SOURCE_DIR, file);
    const targetPath = join(TARGET_DIR, file);
    
    // 忽略 .git 和其他干扰
    if (file.includes(".git/")) continue;

    const content = readFileSync(sourcePath, "utf-8");
    
    // 检查幂等性：目标文件是否已存在且内容未变？
    if (existsSync(targetPath)) {
      const targetContent = readFileSync(targetPath, "utf-8");
      if (targetContent.includes(content.slice(0, 100))) { // 简单校验
        console.log(`  Skipping ${file} (Already refined)`);
        continue;
      }
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
