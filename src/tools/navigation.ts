import { join, relative } from "path";
import { readdirSync, readFileSync, statSync } from "fs";
import { safePath } from "../core/path.js";

/**
 * L1: 目录树导航 - 让 Agent 看到知识地图
 */
export function listStructure(basePath: string): string {
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
export function grepKnowledge(basePath: string, query: string): string[] {
  const results: string[] = [];
  const searchDir = (dir: string) => {
    const files = readdirSync(dir);
    for (const file of files) {
      const path = join(dir, file);
      if (statSync(path).isDirectory()) {
        searchDir(path);
      } else if (file.endsWith(".md")) {
        const content = readFileSync(path, "utf-8");
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            results.push(`${relative(basePath, path)}:${i + 1}: ${line.trim()}`);
          }
        });
      }
    }
  };
  
  searchDir(basePath);
  return results.slice(0, 50); // 限制返回数量，防止 Token 爆炸
}

/**
 * L3: 渐进式披露 - 只给 H1/H2 和前 30 行
 */
export function peekDocument(basePath: string, userPath: string): string {
  const filePath = safePath(basePath, userPath);
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  
  const headers = lines
    .filter(line => line.startsWith("# ") || line.startsWith("## "))
    .map(line => `[Anchor] ${line.trim()}`);
    
  const preview = lines.slice(0, 30).join("\n");
  
  return `--- STRUCTURE ---\n${headers.join("\n")}\n\n--- TOP 30 LINES ---\n${preview}\n\n[System Note: Use read-document to fetch full content if needed.]`;
}
