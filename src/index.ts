import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync } from "fs";
import { listStructure, grepKnowledge, peekDocument } from "./tools/navigation.js";
import { safePath } from "./core/path.js";
import { loadRegistry, loadStatsIndex, refinedLibraryPath } from "./core/runtime.js";

/**
 * Librarian MCP Hub Server
 */
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
      inputSchema: {
        type: "object",
        properties: {},
      },
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
    const registry = loadRegistry();
    const statsByLibrary = loadStatsIndex();
    const libraryId = args?.libraryId as string | undefined;
    const library = libraryId ? registry.libraries.find((item) => item.id === libraryId) : null;

    switch (name) {
      case "list-libraries":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                registry.libraries.map((item) => ({
                  id: item.id,
                  name: item.name,
                  branch: item.branch,
                  source_subpath: item.source_subpath,
                  stats: statsByLibrary.get(item.id) || null
                })),
                null,
                2
              )
            }
          ]
        };

      case "list-structure": {
        if (!libraryId) throw new Error("libraryId is required");
        if (!library) throw new Error(`Library not found: ${libraryId}`);
        const libPath = refinedLibraryPath(library.id);
        if (!existsSync(libPath)) throw new Error(`Library path not found: ${libPath}`);
        return { content: [{ type: "text", text: listStructure(libPath) }] };
      }

      case "grep-knowledge": {
        if (!libraryId) throw new Error("libraryId is required");
        if (!library) throw new Error(`Library not found: ${libraryId}`);
        const libPath = refinedLibraryPath(library.id);
        if (!existsSync(libPath)) throw new Error(`Library path not found: ${libPath}`);
        const matches = grepKnowledge(libPath, String(args?.query));
        return { content: [{ type: "text", text: matches.length > 0 ? matches.join("\n") : "No results found." }] };
      }

      case "peek-document": {
        if (!libraryId) throw new Error("libraryId is required");
        if (!library) throw new Error(`Library not found: ${libraryId}`);
        const libPath = refinedLibraryPath(library.id);
        if (!existsSync(libPath)) throw new Error(`Library path not found: ${libPath}`);
        return { content: [{ type: "text", text: peekDocument(libPath, String(args?.path)) }] };
      }

      case "read-document": {
        if (!libraryId) throw new Error("libraryId is required");
        if (!library) throw new Error(`Library not found: ${libraryId}`);
        const libPath = refinedLibraryPath(library.id);
        if (!existsSync(libPath)) throw new Error(`Library path not found: ${libPath}`);
        const fullDocPath = safePath(libPath, String(args?.path));
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

/**
 * 3. 启动 Server
 */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Librarian MCP Hub is active on stdio.");
