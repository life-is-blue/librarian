import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

const REGISTRY_PATH = process.env.LIBRARIAN_REGISTRY || join(process.cwd(), "config", "registry.json");
const DATA_DIR = process.env.LIBRARIAN_DATA_DIR || join(process.cwd(), "data-refined");
const SOURCE_DIR = process.env.LIBRARIAN_SOURCE_DIR || join(process.cwd(), "data");

function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      if (file.startsWith(".")) continue;
      const path = join(dir, file);
      if (statSync(path).isDirectory()) {
        results.push(...getAllFiles(path));
      } else {
        results.push(path);
      }
    }
  } catch {}
  return results;
}

function readSourceRef(libraryId: string): string | undefined {
  const refPath = join(SOURCE_DIR, libraryId, ".ref");
  if (!existsSync(refPath)) return undefined;
  const ref = readFileSync(refPath, "utf-8").trim();
  return ref || undefined;
}

function scanLibraries() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
  
  for (const lib of registry.libraries) {
    const libPath = join(DATA_DIR, lib.id); 
    const files = getAllFiles(libPath).filter(f => f.endsWith(".md"));
    const sourceRef = readSourceRef(lib.id);
    const prevStats = lib.stats || {};
    const fileCount = files.length;

    const changed =
      prevStats.file_count !== fileCount ||
      prevStats.source_ref !== sourceRef;

    // 只更新 stats 字段，保留其他字段不变
    lib.stats = {
      file_count: fileCount,
      source_ref: sourceRef,
      last_updated: changed ? new Date().toISOString() : (prevStats.last_updated || new Date().toISOString()),
    };
  }

  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  console.log("[Hub] Registry updated with latest refined stats.");
}

scanLibraries();
