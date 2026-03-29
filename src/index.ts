import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
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
    const libraryId = args?.libraryId as string | undefined;

    switch (name) {
      case "list-libraries": {
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
        if (!libraryId) throw new Error("libraryId is required");
        const libPath = refinedLibraryPath(libraryId);
        if (!existsSync(libPath)) {
          throw new Error(`Library '${libraryId}' not found. Run 'bun run build' to download data.`);
        }
        return { content: [{ type: "text", text: listStructure(libPath) }] };
      }

      case "grep-knowledge": {
        if (!libraryId) throw new Error("libraryId is required");
        const libPath = refinedLibraryPath(libraryId);
        if (!existsSync(libPath)) {
          throw new Error(`Library '${libraryId}' not found. Run 'bun run build' to download data.`);
        }
        const response = grepKnowledge(libPath, String(args?.query));
        const lines = response.matches.map(m => `${m.path}:${m.line}: ${m.content}`);
        const header = `Found ${response.matches.length} matches in ${response.totalFiles} files${response.truncated ? " (truncated to 50)" : ""}:\n\n`;
        return { content: [{ type: "text", text: header + (lines.length > 0 ? lines.join("\n") : "No results found.") }] };
      }

      case "peek-document": {
        if (!libraryId) throw new Error("libraryId is required");
        const libPath = refinedLibraryPath(libraryId);
        if (!existsSync(libPath)) {
          throw new Error(`Library '${libraryId}' not found. Run 'bun run build' to download data.`);
        }
        return { content: [{ type: "text", text: peekDocument(libPath, String(args?.path)) }] };
      }

      case "read-document": {
        if (!libraryId) throw new Error("libraryId is required");
        const libPath = refinedLibraryPath(libraryId);
        if (!existsSync(libPath)) {
          throw new Error(`Library '${libraryId}' not found. Run 'bun run build' to download data.`);
        }
        const fullDocPath = safePath(libPath, String(args?.path));
        if (!existsSync(fullDocPath)) {
          throw new Error(`Document not found: ${args?.path}. Use list-structure to see available files.`);
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
