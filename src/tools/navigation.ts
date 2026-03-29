import { join, relative } from "path";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { safePath } from "../core/path.js";

export interface GrepResult {
  path: string;
  line: number;
  content: string;
}

export interface GrepResponse {
  matches: GrepResult[];
  totalFiles: number;
  truncated: boolean;
}

/**
 * L1: 目录树导航 - 让 Agent 看到知识地图
 */
export function listStructure(basePath: string): string {
  if (!existsSync(basePath)) {
    throw new Error(`Library path not found: ${basePath}. Run 'bun run sync' first.`);
  }

  const getTree = (dir: string, prefix = ""): string => {
    let result = "";
    const files = readdirSync(dir).sort();

    files.forEach((file, index) => {
      const isLast = index === files.length - 1;
      const path = join(dir, file);
      const isDir = statSync(path).isDirectory();

      result += `${prefix}${isLast ? "└── " : "├── "}${file}${isDir ? "/" : ""}\n`;
      if (isDir) {
        result += getTree(path, prefix + (isLast ? "    " : "│   "));
      }
    });
    return result;
  };

  return getTree(basePath);
}

/**
 * L2: 精准 Grep - 搜索关键词及上下文行号
 */
export function grepKnowledge(basePath: string, query: string): GrepResponse {
  if (!existsSync(basePath)) {
    throw new Error(`Library path not found: ${basePath}. Run 'bun run sync' first.`);
  }
  if (!query || query.trim().length === 0) {
    throw new Error("Query cannot be empty");
  }

  const matches: GrepResult[] = [];
  let totalFiles = 0;
  const MAX_RESULTS = 50;

  const searchDir = (dir: string) => {
    const files = readdirSync(dir);
    for (const file of files) {
      const path = join(dir, file);
      if (statSync(path).isDirectory()) {
        searchDir(path);
      } else if (file.endsWith(".md")) {
        totalFiles++;
        if (matches.length >= MAX_RESULTS) continue;

        const content = readFileSync(path, "utf-8");
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (matches.length >= MAX_RESULTS) return;
          if (line.toLowerCase().includes(query.toLowerCase())) {
            matches.push({
              path: relative(basePath, path),
              line: i + 1,
              content: line.trim()
            });
          }
        });
      }
    }
  };

  searchDir(basePath);

  return {
    matches,
    totalFiles,
    truncated: matches.length >= MAX_RESULTS
  };
}

/**
 * L3: 渐进式披露 - 只给 H1/H2 和前 30 行
 */
export function peekDocument(basePath: string, userPath: string): string {
  if (!existsSync(basePath)) {
    throw new Error(`Library path not found: ${basePath}. Run 'bun run sync' first.`);
  }

  const filePath = safePath(basePath, userPath);
  if (!existsSync(filePath)) {
    throw new Error(`Document not found: ${userPath}. Use list-structure to see available files.`);
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const headers = lines
    .filter(line => line.startsWith("# ") || line.startsWith("## "))
    .map(line => `[Anchor] ${line.trim()}`);

  const preview = lines.slice(0, 30).join("\n");
  const totalLines = lines.length;

  return `--- STRUCTURE ---\n${headers.join("\n")}\n\n--- TOP 30 LINES (${totalLines} total) ---\n${preview}\n\n[System Note: Use read-document to fetch full content if needed.]`;
}
