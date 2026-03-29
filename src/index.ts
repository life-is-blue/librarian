import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { join, resolve } from "path";
import { readFileSync, existsSync } from "fs";
import { listStructure, grepKnowledge, peekDocument } from "./tools/navigation.js";

function safePath(basePath: string, userPath: string): string {
  const resolved = resolve(basePath, userPath);
  if (!resolved.startsWith(basePath)) {
    throw new Error(`Path traversal detected: ${userPath}`);
  }
  return resolved;
}

/**
 * Librarian MCP Hub Server
 */
const DATA_DIR = process.env.LIBRARIAN_DATA_DIR || join(process.cwd(), "data-refined");
const REGISTRY_PATH = process.env.LIBRARIAN_REGISTRY || join(process.cwd(), "config", "registry.json");

const server = new Server(
  { name: "librarian", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

/**
 * 1. 声明工具列表 (L0 Catalog 已经由 Standardizer 打好基础)
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list-libraries",
      description: "List all connected knowledge repositories (LIBRARIES).",
    },
    {
      name: "list-structure",
      description: "L1: View the file tree structure of a specific library.",
      inputSchema: {
        type: "object",
        properties: { libraryId: { type: "string" } },
        required: ["libraryId"],
      },
    },
    {
      name: "grep-knowledge",
      description: "L2: Search for high-precision keywords and line numbers across files.",
      inputSchema: {
        type: "object",
        properties: {
          libraryId: { type: "string" },
          query: { type: "string" },
        },
        required: ["libraryId", "query"],
      },
    },
    {
      name: "peek-document",
      description: "L3: Get H1/H2 anchors and first 30 lines for a quick glance.",
      inputSchema: {
        type: "object",
        properties: {
          libraryId: { type: "string" },
          path: { type: "string" },
        },
        required: ["libraryId", "path"],
      },
    },
    {
      name: "read-document",
      description: "L4: Full drill-down. Fetch the complete content of a specific document.",
      inputSchema: {
        type: "object",
        properties: {
          libraryId: { type: "string" },
          path: { type: "string" },
        },
        required: ["libraryId", "path"],
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
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
    const libraryId = args?.libraryId as string | undefined;
    const library = libraryId ? registry.libraries.find((l: any) => l.id === libraryId) : null;
    
    if (libraryId && !library) {
      throw new Error(`Library not found: ${libraryId}`);
    }
    
    const libPath = library ? join(process.cwd(), library.path) : DATA_DIR;

    switch (name) {
      case "list-libraries":
        return { content: [{ type: "text", text: JSON.stringify(registry.libraries, null, 2) }] };

      case "list-structure":
        return { content: [{ type: "text", text: listStructure(libPath) }] };

      case "grep-knowledge":
        const matches = grepKnowledge(libPath, String(args?.query));
        return { content: [{ type: "text", text: matches.length > 0 ? matches.join("\n") : "No results found." }] };

      case "peek-document":
        return { content: [{ type: "text", text: peekDocument(libPath, String(args?.path)) }] };

      case "read-document":
        const fullDocPath = safePath(libPath, String(args?.path));
        return { content: [{ type: "text", text: readFileSync(fullDocPath, "utf-8") }] };

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

/**
 * 3. 启动 Server
 */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Librarian MCP Hub is active on stdio.");
