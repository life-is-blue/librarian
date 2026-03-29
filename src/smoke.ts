import { readdirSync, statSync, readFileSync } from "fs";
import { join, relative } from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function findFirstMarkdownFile(rootPath: string): string | null {
  const walk = (dirPath: string): string | null => {
    const entries = readdirSync(dirPath).sort();
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

function extractText(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text || "")
    .join("\n");
}

async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const result = await client.request(
    {
      method: "tools/call",
      params: { name, arguments: args }
    },
    CallToolResultSchema
  );

  if (result.isError) {
    throw new Error(`${name} failed: ${extractText(result)}`);
  }

  return extractText(result);
}

async function main() {
  const cwd = process.cwd();
  const dataDir = process.env.LIBRARIAN_DATA_DIR || join(cwd, "data-refined");
  const registryPath = process.env.LIBRARIAN_REGISTRY || join(cwd, "config", "registry.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf-8"));

  assert(Array.isArray(registry.libraries), "registry.libraries must be an array");
  assert(registry.libraries.length > 0, "registry must contain at least one library");

  const libraryId = String(registry.libraries[0].id || "");
  assert(libraryId.length > 0, "library id cannot be empty");

  const libraryRoot = join(dataDir, libraryId);
  const sampleAbsPath = findFirstMarkdownFile(libraryRoot);
  assert(sampleAbsPath, `no markdown files found in ${libraryRoot}`);
  const samplePath = relative(libraryRoot, sampleAbsPath).split("\\").join("/");

  const transport = new StdioClientTransport({
    command: "bun",
    args: ["src/index.ts"],
    cwd,
    stderr: "pipe",
    env: {
      LIBRARIAN_DATA_DIR: dataDir,
      LIBRARIAN_REGISTRY: registryPath
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
      "read-document"
    ]) {
      assert(toolNames.has(requiredTool), `missing tool: ${requiredTool}`);
    }

    const librariesText = await callTool(client, "list-libraries", {});
    assert(librariesText.includes(libraryId), `list-libraries did not include '${libraryId}'`);

    const structureText = await callTool(client, "list-structure", { libraryId });
    assert(structureText.length > 0, "list-structure returned empty response");

    const grepText = await callTool(client, "grep-knowledge", { libraryId, query: "MCP" });
    assert(grepText.length > 0, "grep-knowledge returned empty response");

    const peekText = await callTool(client, "peek-document", { libraryId, path: samplePath });
    assert(peekText.includes("--- TOP 30 LINES ---"), "peek-document response missing preview section");

    const readText = await callTool(client, "read-document", { libraryId, path: samplePath });
    assert(readText.includes("#"), "read-document response did not include markdown body");

    console.log(`[smoke] OK: library=${libraryId}, sample=${samplePath}`);
  } finally {
    await transport.close();
  }
}

main().catch((err) => {
  console.error("[smoke] failed:", err);
  process.exit(1);
});
