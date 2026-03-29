import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { listStructure, grepKnowledge, peekDocument, readSection } from "./tools/navigation.js";
import { safePath } from "./core/path.js";
import { listLibraries, refinedLibraryPath, REFINED_DIR } from "./core/runtime.js";

const createServer = () => new Server(
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
const readSectionArgsSchema = z.object({
  libraryId: nonEmptyString,
  path: nonEmptyString,
  heading: nonEmptyString,
}).strict();

function parseArgs<T extends z.ZodTypeAny>(toolName: string, schema: T, args: unknown): z.infer<T> {
  const parsed = schema.safeParse(args ?? {});
  if (parsed.success) {
    return parsed.data;
  }
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid arguments for '${toolName}': ${details}`);
}

function ensureLibraryPath(libraryId: string): string {
  const libPath = refinedLibraryPath(libraryId);
  if (!existsSync(libPath)) {
    throw new Error(`Library '${libraryId}' not found under '${REFINED_DIR}'.`);
  }
  return libPath;
}

function formatRange(start: number, count: number): string {
  return count === 0 ? "0-0" : `${start + 1}-${start + count}`;
}

function getLibStats(libPath: string): { fileCount: number } {
  let count = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      statSync(path).isDirectory() ? walk(path) : entry.endsWith(".md") && count++;
    }
  };
  walk(libPath);
  return { fileCount: count };
}

function setupHandlers(server: Server) {
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
        name: "read-section",
        description: "L4: Read a specific section by heading and return a line-range scoped excerpt.",
        inputSchema: {
          type: "object",
          properties: {
            libraryId: { type: "string", minLength: 1 },
            path: { type: "string", minLength: 1 },
            heading: { type: "string", minLength: 1 },
          },
          required: ["libraryId", "path", "heading"],
          additionalProperties: false,
        },
      },
      {
        name: "read-document",
        description: "L5: Full drill-down. Fetch the complete content of a specific document.",
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

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case "list-libraries": {
          parseArgs("list-libraries", listLibrariesArgsSchema, args);
          const libraries = listLibraries();
          const result = libraries.map(id => ({ id, stats: existsSync(refinedLibraryPath(id)) ? getLibStats(refinedLibraryPath(id)) : null }));
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        case "list-structure": {
          const { libraryId, depth, cursor, limit } = parseArgs("list-structure", listStructureArgsSchema, args);
          const libPath = ensureLibraryPath(libraryId);
          const res = listStructure(libPath, { depth, cursor, limit });
          const header = `Tree lines ${formatRange(res.cursor, res.returnedCount)} of ${res.totalLines}. depth=${res.depth ?? "full"}, hasMore=${res.hasMore}\n\n`;
          return { content: [{ type: "text", text: header + (res.lines.length ? res.lines.join("\n") : "(empty)") }] };
        }
        case "grep-knowledge": {
          const { libraryId, query, pathPrefix, caseSensitive, cursor, limit } = parseArgs("grep-knowledge", grepKnowledgeArgsSchema, args);
          const libPath = ensureLibraryPath(libraryId);
          const res = grepKnowledge(libPath, query, { pathPrefix, caseSensitive, cursor, limit });
          const lines = res.matches.map(m => `${m.path}:${m.line}: ${m.content}`);
          const header = `Matches ${formatRange(res.cursor, res.matches.length)} of ${res.totalMatches} in ${res.totalFiles} files:\n\n`;
          return { content: [{ type: "text", text: header + (lines.length ? lines.join("\n") : "No results") }] };
        }
        case "peek-document": {
          const { libraryId, path } = parseArgs("peek-document", documentArgsSchema, args);
          return { content: [{ type: "text", text: peekDocument(ensureLibraryPath(libraryId), path) }] };
        }
        case "read-section": {
          const { libraryId, path, heading } = parseArgs("read-section", readSectionArgsSchema, args);
          const section = readSection(ensureLibraryPath(libraryId), path, heading);
          return { content: [{ type: "text", text: `--- SECTION ---\npath: ${path}\nheading: ${section.heading}\nline-range: ${section.startLine}-${section.endLine}\n\n${section.content}` }] };
        }
        case "read-document": {
          const { libraryId, path } = parseArgs("read-document", documentArgsSchema, args);
          const fullDocPath = safePath(ensureLibraryPath(libraryId), path);
          if (!existsSync(fullDocPath)) {
            throw new Error(`Document not found: ${path}. Use list-structure to see available files.`);
          }
          return { content: [{ type: "text", text: readFileSync(fullDocPath, "utf-8") }] };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  });
}

const PORT = parseInt(process.env.LIBRARIAN_PORT || "3001", 10);
const HOST = process.env.LIBRARIAN_HOST || "127.0.0.1";
const MCP_TOKEN = process.env.LIBRARIAN_MCP_TOKEN?.trim() || "";

function isAuthorized(req: Request): boolean {
  if (!MCP_TOKEN) {
    return true;
  }
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return false;
  }
  const match = authHeader.match(/^Bearer (.+)$/i);
  if (!match) {
    return false;
  }
  return match[1] === MCP_TOKEN;
}

Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return new Response("OK");
    }
    if (url.pathname !== "/mcp" && url.pathname !== "/") {
      return new Response("Not Found", { status: 404 });
    }
    if (!isAuthorized(req)) {
      return new Response("Unauthorized", { status: 401 });
    }
    try {
      // Stateless mode requires a fresh transport per request.
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      const server = createServer();
      setupHandlers(server);
      await server.connect(transport);
      return await transport.handleRequest(req);
    } catch (err) {
      console.error("POST - /mcp failed", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`Librarian MCP HTTP server: http://${HOST}:${PORT}`);
console.log(`MCP endpoint: http://${HOST}:${PORT}/mcp`);
