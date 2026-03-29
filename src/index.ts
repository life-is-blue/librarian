import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { listStructure, grepKnowledge, peekDocument } from "./tools/navigation.js";

/**
 * Librarian MCP Hub Server
 */
const DATA_DIR = join(process.cwd(), "data");
const REGISTRY_PATH = join(process.cwd(), "config", "registry.json");

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
      name: "list_libraries",
      description: "List all connected knowledge repositories (LIBRARIES).",
    },
    {
      name: "list_structure",
      description: "L1: View the file tree structure of a specific library.",
      inputSchema: {
        type: "object",
        properties: { library_id: { type: "string" } },
        required: ["library_id"],
      },
    },
    {
      name: "grep_knowledge",
      description: "L2: Search for high-precision keywords and line numbers across files.",
      inputSchema: {
        type: "object",
        properties: {
          library_id: { type: "string" },
          query: { type: "string" },
        },
        required: ["library_id", "query"],
      },
    },
    {
      name: "peek_document",
      description: "L3: Get H1/H2 anchors and first 30 lines for a quick glance.",
      inputSchema: {
        type: "object",
        properties: {
          library_id: { type: "string" },
          path: { type: "string" },
        },
        required: ["library_id", "path"],
      },
    },
    {
      name: "read_document",
      description: "L4: Full drill-down. Fetch the complete content of a specific document.",
      inputSchema: {
        type: "object",
        properties: {
          library_id: { type: "string" },
          path: { type: "string" },
        },
        required: ["library_id", "path"],
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
    const library = registry.libraries.find((l: any) => l.id === args?.library_id);
    const libPath = library ? join(process.cwd(), library.path) : DATA_DIR;

    switch (name) {
      case "list_libraries":
        return { content: [{ type: "text", text: JSON.stringify(registry.libraries, null, 2) }] };

      case "list_structure":
        return { content: [{ type: "text", text: listStructure(libPath) }] };

      case "grep_knowledge":
        const matches = grepKnowledge(libPath, String(args?.query));
        return { content: [{ type: "text", text: matches.length > 0 ? matches.join("\n") : "No results found." }] };

      case "peek_document":
        const docPath = join(libPath, String(args?.path));
        return { content: [{ type: "text", text: peekDocument(docPath) }] };

      case "read_document":
        const fullDocPath = join(libPath, String(args?.path));
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
