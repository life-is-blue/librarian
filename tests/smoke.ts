import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative, resolve } from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { REFINED_DIR } from "../src/core/runtime.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function findFirstMarkdownFile(rootPath: string): string | null {
  const walk = (dirPath: string): string | null => {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const absPath = join(dirPath, entry);
      if (statSync(absPath).isDirectory()) {
        const nested = walk(absPath);
        if (nested) return nested;
        continue;
      }
      if (entry.endsWith(".md")) return absPath;
    }
    return null;
  };
  return walk(rootPath);
}

function findFirstHeading(filePath: string): string | null {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) {
      return trimmed.replace(/^#{1,6}\s+/, "").trim();
    }
  }
  return null;
}

function extractText(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text || "")
    .join("\n");
}

type ToolResult = {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
};

async function callToolRaw(client: Client, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  return client.request(
    {
      method: "tools/call",
      params: { name, arguments: args }
    },
    CallToolResultSchema
  );
}

async function callTool(client: Client, name: string, args: Record<string, unknown>): Promise<string> {
  const result = await callToolRaw(client, name, args);

  if (result.isError) {
    throw new Error(`${name} failed: ${extractText(result)}`);
  }

  return extractText(result);
}

function assertToolError(result: ToolResult, expectedSubstring: string, label: string) {
  assert(result.isError === true, `${label}: expected error result`);
  const text = extractText(result);
  assert(text.includes(expectedSubstring), `${label}: unexpected error text: ${text}`);
}

async function main() {
  const cwd = process.cwd();
  const fixtureRefinedDir = resolve(cwd, "tests/fixtures/data-refined");

  let dataRoot: string | null = null;
  let dataSource: "external" | "fixture" | null = null;
  let libraryId: string | null = null;
  let samplePath: string | null = null;
  let sampleHeading: string | null = null;

  const candidates = [
    { dir: REFINED_DIR, source: "external" as const },
    { dir: fixtureRefinedDir, source: "fixture" as const }
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate.dir)) {
      continue;
    }

    const libraries = readdirSync(candidate.dir).filter(e => !e.startsWith("."));
    if (libraries.length === 0) {
      continue;
    }

    const candidateLibraryId = libraries[0];
    const libraryRoot = join(candidate.dir, candidateLibraryId);
    const sampleAbsPath = findFirstMarkdownFile(libraryRoot);
    assert(sampleAbsPath, `no markdown files found in ${libraryRoot}`);
    const heading = findFirstHeading(sampleAbsPath);
    assert(heading, `no headings found in ${sampleAbsPath}`);

    dataRoot = candidate.dir;
    dataSource = candidate.source;
    libraryId = candidateLibraryId;
    samplePath = relative(libraryRoot, sampleAbsPath).split("\\").join("/");
    sampleHeading = heading;
    break;
  }

  const transport = new StdioClientTransport({
    command: "bun",
    args: ["src/index.ts"],
    cwd,
    stderr: "pipe",
    env: {
      LIBRARIAN_REFINED_DIR: dataRoot || REFINED_DIR
    }
  });

  const client = new Client({ name: "librarian-smoke", version: "1.0.0" });
  client.onerror = (error) => {
    console.error("[smoke] client error:", error);
  };

  if (transport.stderr) {
    transport.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
  }

  try {
    await client.connect(transport);

    const toolsResult = await client.request({ method: "tools/list", params: {} }, ListToolsResultSchema);
    const toolNames = new Set(toolsResult.tools.map((tool) => tool.name));
    for (const requiredTool of [
      "list-libraries",
      "list-structure",
      "grep-knowledge",
      "peek-document",
      "read-section",
      "read-document"
    ]) {
      assert(toolNames.has(requiredTool), `missing tool: ${requiredTool}`);
    }

    const invalidMissingRequired = await callToolRaw(client, "list-structure", {});
    assertToolError(
      invalidMissingRequired,
      "Invalid arguments for 'list-structure'",
      "missing required arg"
    );

    const invalidUnexpectedField = await callToolRaw(client, "list-libraries", { unexpected: true });
    assertToolError(
      invalidUnexpectedField,
      "Invalid arguments for 'list-libraries'",
      "unexpected arg"
    );

    if (!dataRoot || !libraryId || !samplePath || !sampleHeading) {
      console.log(
        `[smoke] SKIP: No libraries available under either '${REFINED_DIR}' or fixture path '${fixtureRefinedDir}'.`
      );
      return;
    }

    const missingLibrary = await callToolRaw(client, "list-structure", { libraryId: "__missing_lib__" });
    assertToolError(
      missingLibrary,
      "not found under",
      "missing library"
    );

    const librariesText = await callTool(client, "list-libraries", {});
    assert(librariesText.includes(libraryId), `list-libraries did not include '${libraryId}'`);

    const structureText = await callTool(client, "list-structure", { libraryId });
    assert(structureText.length > 0, "list-structure returned empty response");
    assert(structureText.includes("Tree lines "), "list-structure response missing pagination metadata");

    const structurePagedText = await callTool(client, "list-structure", { libraryId, limit: 1, cursor: 0 });
    assert(structurePagedText.includes("limit=1"), "list-structure limit option not reflected");
    assert(structurePagedText.includes("hasMore="), "list-structure missing hasMore metadata");

    const grepText = await callTool(client, "grep-knowledge", { libraryId, query: "MCP" });
    assert(grepText.length > 0, "grep-knowledge returned empty response");
    assert(grepText.includes("Matches "), "grep-knowledge response missing pagination metadata");

    const grepPagedText = await callTool(client, "grep-knowledge", { libraryId, query: "MCP", limit: 1, cursor: 0 });
    assert(grepPagedText.includes("of"), "grep-knowledge paged response missing total count");

    if (dataSource === "fixture") {
      const grepFilteredText = await callTool(client, "grep-knowledge", {
        libraryId,
        query: "MCP",
        pathPrefix: "guides",
        caseSensitive: true,
      });
      assert(grepFilteredText.includes("guides/"), "grep pathPrefix filter did not constrain result path");

      const grepCaseSensitiveMiss = await callTool(client, "grep-knowledge", {
        libraryId,
        query: "mcp",
        caseSensitive: true,
      });
      assert(grepCaseSensitiveMiss.includes("No results found."), "grep caseSensitive behavior mismatch");
    }

    const peekText = await callTool(client, "peek-document", { libraryId, path: samplePath });
    assert(peekText.includes("TOP 30 LINES"), "peek-document response missing preview section");

    const sectionText = await callTool(client, "read-section", {
      libraryId,
      path: samplePath,
      heading: sampleHeading,
    });
    assert(sectionText.includes("--- SECTION ---"), "read-section response missing section header");
    assert(sectionText.includes("line-range:"), "read-section response missing line range");

    const missingHeading = await callToolRaw(client, "read-section", {
      libraryId,
      path: samplePath,
      heading: "__missing_heading__",
    });
    assertToolError(
      missingHeading,
      "Heading not found",
      "missing heading"
    );

    const missingDoc = await callToolRaw(client, "read-document", { libraryId, path: "__missing__.md" });
    assertToolError(
      missingDoc,
      "Document not found",
      "missing document"
    );

    const readText = await callTool(client, "read-document", { libraryId, path: samplePath });
    assert(readText.includes("#"), "read-document response did not include markdown body");

    console.log(`[smoke] OK: source=${dataSource}, library=${libraryId}, sample=${samplePath}`);
  } finally {
    await transport.close();
  }
}

main().catch((err) => {
  console.error("[smoke] failed:", err);
  process.exit(1);
});
