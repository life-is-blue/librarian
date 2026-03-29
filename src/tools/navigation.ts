import { join, relative } from "path";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { normalizeRelPath, safePath } from "../core/path.js";

export interface ListStructureOptions {
  depth?: number;
  cursor?: number;
  limit?: number;
}

export interface ListStructureResponse {
  lines: string[];
  totalLines: number;
  returnedCount: number;
  cursor: number;
  limit: number;
  depth: number | null;
  hasMore: boolean;
  nextCursor: number | null;
}

export interface GrepResult {
  path: string;
  line: number;
  content: string;
}

export interface GrepOptions {
  pathPrefix?: string;
  caseSensitive?: boolean;
  cursor?: number;
  limit?: number;
}

export interface GrepResponse {
  matches: GrepResult[];
  totalFiles: number;
  totalMatches: number;
  cursor: number;
  limit: number;
  hasMore: boolean;
  nextCursor: number | null;
  truncated: boolean;
}

/**
 * L1: 目录树导航 - 让 Agent 看到知识地图
 */
export function listStructure(basePath: string, options: ListStructureOptions = {}): ListStructureResponse {
  if (!existsSync(basePath)) {
    throw new Error(
      `Library path not found: ${basePath}. Ensure the library exists under LIBRARIAN_REFINED_DIR.`
    );
  }

  const maxDepth = options.depth;
  const cursor = Math.max(options.cursor ?? 0, 0);
  const limit = Math.max(options.limit ?? 200, 1);
  const allLines: string[] = [];

  const walk = (dir: string, prefix: string, currentDepth: number) => {
    const files = readdirSync(dir).sort();

    files.forEach((file, index) => {
      const isLast = index === files.length - 1;
      const path = join(dir, file);
      const isDir = statSync(path).isDirectory();
      const line = `${prefix}${isLast ? "└── " : "├── "}${file}${isDir ? "/" : ""}`;

      allLines.push(line);

      if (isDir && (maxDepth === undefined || currentDepth < maxDepth)) {
        walk(path, prefix + (isLast ? "    " : "│   "), currentDepth + 1);
      }
    });
  };

  walk(basePath, "", 1);

  const safeCursor = Math.min(cursor, allLines.length);
  const end = Math.min(safeCursor + limit, allLines.length);
  const lines = allLines.slice(safeCursor, end);
  const hasMore = end < allLines.length;

  return {
    lines,
    totalLines: allLines.length,
    returnedCount: lines.length,
    cursor: safeCursor,
    limit,
    depth: maxDepth ?? null,
    hasMore,
    nextCursor: hasMore ? end : null,
  };
}

/**
 * L2: 精准 Grep - 搜索关键词及上下文行号
 */
export function grepKnowledge(basePath: string, query: string, options: GrepOptions = {}): GrepResponse {
  if (!existsSync(basePath)) {
    throw new Error(
      `Library path not found: ${basePath}. Ensure the library exists under LIBRARIAN_REFINED_DIR.`
    );
  }
  if (!query || query.trim().length === 0) {
    throw new Error("Query cannot be empty");
  }

  const normalizedQuery = query.trim();
  const caseSensitive = options.caseSensitive ?? false;
  const cursor = Math.max(options.cursor ?? 0, 0);
  const limit = Math.max(options.limit ?? 50, 1);
  const pathPrefix = options.pathPrefix
    ? normalizeRelPath(options.pathPrefix).replace(/^\.\//, "").replace(/\/$/, "")
    : null;

  const allMatches: GrepResult[] = [];
  let totalFiles = 0;
  const normalizedNeedle = caseSensitive ? normalizedQuery : normalizedQuery.toLowerCase();

  const searchDir = (dir: string) => {
    const files = readdirSync(dir);
    for (const file of files) {
      const path = join(dir, file);
      if (statSync(path).isDirectory()) {
        searchDir(path);
      } else if (file.endsWith(".md")) {
        const relPath = normalizeRelPath(relative(basePath, path));
        if (pathPrefix && !(relPath === pathPrefix || relPath.startsWith(`${pathPrefix}/`))) {
          continue;
        }

        totalFiles++;
        const content = readFileSync(path, "utf-8");
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          const normalizedLine = caseSensitive ? line : line.toLowerCase();
          if (normalizedLine.includes(normalizedNeedle)) {
            allMatches.push({
              path: relPath,
              line: i + 1,
              content: line.trim()
            });
          }
        });
      }
    }
  };

  searchDir(basePath);

  const safeCursor = Math.min(cursor, allMatches.length);
  const end = Math.min(safeCursor + limit, allMatches.length);
  const matches = allMatches.slice(safeCursor, end);
  const hasMore = end < allMatches.length;

  return {
    matches,
    totalFiles,
    totalMatches: allMatches.length,
    cursor: safeCursor,
    limit,
    hasMore,
    nextCursor: hasMore ? end : null,
    truncated: hasMore
  };
}

/**
 * L3: 渐进式披露 - 只给 H1/H2 和前 30 行
 */
export function peekDocument(basePath: string, userPath: string): string {
  if (!existsSync(basePath)) {
    throw new Error(
      `Library path not found: ${basePath}. Ensure the library exists under LIBRARIAN_REFINED_DIR.`
    );
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
