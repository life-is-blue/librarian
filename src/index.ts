import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { listStructure, grepKnowledge, peekDocument } from "./tools/navigation.js";
import { safePath } from "./core/path.js";
import { listLibraries, refinedLibraryPath, REFINED_DIR } from "./core/runtime.js";

/**
 * Librarian MCP Hub Server
 */
const server = new Server(
  { name: "librarian", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const nonEmptyString = z.string().trim().min(1, "must be a non-empty string");
const positiveInt = z.number().int().min(1, "must be a positive integer");
const nonNegativeInt = z.number().int().min(0, "must be a non-negative integer");
const listLibrariesArgsSchema = z.object({}).strict();
const listStructureArgsSchema = z.object({
  libraryId: nonEmptyString,
  depth: positiveInt.max(64).optional(),
  cursor: nonNegativeInt.optional(),
  limit: positiveInt.max(2000).optional(),
}).strict();
const grepKnowledgeArgsSchema = z.object({
  libraryId: nonEmptyString,
  query: nonEmptyString,
  pathPrefix: nonEmptyString.optional(),
  caseSensitive: z.boolean().optional(),
  cursor: nonNegativeInt.optional(),
  limit: positiveInt.max(500).optional(),
}).strict();
const documentArgsSchema = z.object({
  libraryId: nonEmptyString,
  path: nonEmptyString,
}).strict();

function parseArgs<T extends z.ZodTypeAny>(
  toolName: string,
  schema: T,
  args: unknown
): z.infer<T> {
  const parsed = schema.safeParse(args ?? {});
  if (parsed.success) {
    return parsed.data;
  }

  const details = parsed.error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  throw new Error(`Invalid arguments for '${toolName}': ${details}`);
}

function ensureLibraryPath(libraryId: string): string {
  const libPath = refinedLibraryPath(libraryId);
  if (!existsSync(libPath)) {
    throw new Error(
      `Library '${libraryId}' not found under '${REFINED_DIR}'. Ensure data is synced to data-refined/<library-id> or set LIBRARIAN_REFINED_DIR.`
    );
  }
  return libPath;
}

function formatRange(start: number, count: number): string {
  if (count === 0) {
    return "0-0";
  }
  return `${start + 1}-${start + count}`;
}

/**
 * 1. 声明工具列表
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list-libraries",
      description: "List all available knowledge libraries. Returns directory names from data-refined/.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "list-structure",
      description: "L1: View the file tree structure of a specific library.",
      inputSchema: {
        type: "object",
        properties: {
          libraryId: { type: "string", minLength: 1 },
          depth: { type: "integer", minimum: 1, maximum: 64 },
          cursor: { type: "integer", minimum: 0 },
          limit: { type: "integer", minimum: 1, maximum: 2000 },
        },
        required: ["libraryId"],
        additionalProperties: false,
      },
    },
    {
      name: "grep-knowledge",
      description: "L2: Search for high-precision keywords and line numbers across files.",
      inputSchema: {
        type: "object",
        properties: {
          libraryId: { type: "string", minLength: 1 },
          query: { type: "string", minLength: 1 },
          pathPrefix: { type: "string", minLength: 1 },
          caseSensitive: { type: "boolean" },
          cursor: { type: "integer", minimum: 0 },
          limit: { type: "integer", minimum: 1, maximum: 500 },
        },
        required: ["libraryId", "query"],
        additionalProperties: false,
      },
    },
    {
      name: "peek-document",
      description: "L3: Get H1/H2 anchors and first 30 lines for a quick glance.",
      inputSchema: {
        type: "object",
        properties: {
          libraryId: { type: "string", minLength: 1 },
          path: { type: "string", minLength: 1 },
        },
        required: ["libraryId", "path"],
        additionalProperties: false,
      },
    },
    {
      name: "read-document",
      description: "L4: Full drill-down. Fetch the complete content of a specific document.",
      inputSchema: {
        type: "object",
        properties: {
          libraryId: { type: "string", minLength: 1 },
          path: { type: "string", minLength: 1 },
        },
        required: ["libraryId", "path"],
        additionalProperties: false,
      },
    },
  ],
}));

/**
 * 2. 处理工具调用逻辑
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list-libraries": {
        parseArgs("list-libraries", listLibrariesArgsSchema, args);
        const libraries = listLibraries();
        const result = libraries.map(id => {
          const libPath = refinedLibraryPath(id);
          const stats = existsSync(libPath) ? getLibStats(libPath) : null;
          return { id, stats };
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }

      case "list-structure": {
        const { libraryId, depth, cursor, limit } = parseArgs("list-structure", listStructureArgsSchema, args);
        const libPath = ensureLibraryPath(libraryId);
        const response = listStructure(libPath, { depth, cursor, limit });
        const header = [
          `Tree lines ${formatRange(response.cursor, response.returnedCount)} of ${response.totalLines}.`,
          `depth=${response.depth ?? "full"}, limit=${response.limit}, hasMore=${response.hasMore}${response.nextCursor !== null ? `, nextCursor=${response.nextCursor}` : ""}`,
          ""
        ].join("\n");
        const body = response.lines.length > 0 ? response.lines.join("\n") : "(no entries)";
        return { content: [{ type: "text", text: header + body }] };
      }

      case "grep-knowledge": {
        const { libraryId, query, pathPrefix, caseSensitive, cursor, limit } = parseArgs("grep-knowledge", grepKnowledgeArgsSchema, args);
        const libPath = ensureLibraryPath(libraryId);
        const response = grepKnowledge(libPath, query, { pathPrefix, caseSensitive, cursor, limit });
        const lines = response.matches.map(m => `${m.path}:${m.line}: ${m.content}`);
        const filterParts: string[] = [];
        if (pathPrefix) filterParts.push(`pathPrefix='${pathPrefix}'`);
        if (caseSensitive !== undefined) filterParts.push(`caseSensitive=${caseSensitive}`);
        const filterSummary = filterParts.length > 0 ? `, filters: ${filterParts.join(", ")}` : "";
        const header = `Matches ${formatRange(response.cursor, response.matches.length)} of ${response.totalMatches} in ${response.totalFiles} files${response.truncated ? ", hasMore=true" : ", hasMore=false"}${response.nextCursor !== null ? `, nextCursor=${response.nextCursor}` : ""}${filterSummary}:\n\n`;
        return { content: [{ type: "text", text: header + (lines.length > 0 ? lines.join("\n") : "No results found.") }] };
      }

      case "peek-document": {
        const { libraryId, path } = parseArgs("peek-document", documentArgsSchema, args);
        const libPath = ensureLibraryPath(libraryId);
        return { content: [{ type: "text", text: peekDocument(libPath, path) }] };
      }

      case "read-document": {
        const { libraryId, path } = parseArgs("read-document", documentArgsSchema, args);
        const libPath = ensureLibraryPath(libraryId);
        const fullDocPath = safePath(libPath, path);
        if (!existsSync(fullDocPath)) {
          throw new Error(`Document not found: ${path}. Use list-structure to see available files.`);
        }
        return { content: [{ type: "text", text: readFileSync(fullDocPath, "utf-8") }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

function getLibStats(libPath: string): { fileCount: number } {
  let count = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (entry.endsWith(".md")) {
        count++;
      }
    }
  };
  walk(libPath);
  return { fileCount: count };
}

/**
 * 3. 启动 Server
 */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Librarian MCP Hub is active on stdio.");
