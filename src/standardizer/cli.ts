import { join } from "node:path";
import { callLLM } from "./llm";

const DATA_DIR = "Librarian/data";

async function run() {
  const glob = new Bun.Glob("**/*.md");
  const files = Array.from(glob.scanSync({ cwd: DATA_DIR }));

  console.log(`Scanning ${files.length} files in ${DATA_DIR}...`);

  for (const relativePath of files) {
    const path = join(DATA_DIR, relativePath);
    const file = Bun.file(path);
    const text = await file.text();

    const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const frontmatter = match ? match[1] : "";
    let body = match ? match[2] : text;
    body = body.trim();

    if (frontmatter.includes("intent:") && 
        frontmatter.includes("scope:") && 
        frontmatter.includes("keywords:") && 
        frontmatter.includes("summary:")) {
      console.log(`Skipping (already tagged): ${relativePath}`);
      continue;
    }

    console.log(`Processing: ${relativePath}`);
    
    try {
      const prompt = `Analyze this markdown content and generate standard labels.
Return JSON ONLY with:
- intent: one of [setup, troubleshooting, api-ref]
- scope: one of [cli, terminal, ide-plugin]
- keywords: array of strings
- summary: string (under 100 words)

Content:
${body.slice(0, 5000)}`;

      const res = await callLLM(prompt);
      const { intent, scope, keywords, summary } = JSON.parse(res);

      const newFm = `---
intent: ${intent}
scope: ${scope}
keywords: [${keywords.join(", ")}]
summary: "${summary.replace(/"/g, '\\"')}"
---
`;

      await Bun.write(path, `${newFm}${body.startsWith('\n') ? body : '\n' + body}`);
      console.log(`Updated: ${relativePath}`);
    } catch (e) {
      console.error(`Failed to process ${relativePath}:`, e);
    }
  }
}

run();
