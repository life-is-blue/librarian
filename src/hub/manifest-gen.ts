import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const REGISTRY_PATH = process.env.LIBRARIAN_REGISTRY || join(process.cwd(), "config", "registry.json");
const DATA_DIR = process.env.LIBRARIAN_DATA_DIR || join(process.cwd(), "data-refined");

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

function scanLibraries() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
  
  for (const lib of registry.libraries) {
    const libPath = join(DATA_DIR, lib.id); 
    const files = getAllFiles(libPath).filter(f => f.endsWith(".md"));
    lib.stats = {
      file_count: files.length,
      last_updated: new Date().toISOString(),
    };
  }

  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  console.log("[Hub] Registry updated with latest refined stats.");
}

scanLibraries();
