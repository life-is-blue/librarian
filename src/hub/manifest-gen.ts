import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Librarian Manifest Generator (The Cataloger)
 */
const REGISTRY_PATH = process.env.LIBRARIAN_REGISTRY || join(process.cwd(), "config", "registry.json");
const DATA_DIR = process.env.LIBRARIAN_DATA_DIR || join(process.cwd(), "data-refined");

function scanLibraries() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
  
  for (const lib of registry.libraries) {
    const libPath = join(DATA_DIR, lib.id); 
    try {
      const files = getAllFiles(libPath).filter(f => f.endsWith(".md"));
      lib.stats = {
        file_count: files.length,
        last_updated: new Date().toISOString(),
      };
    } catch (e) {
      console.warn(`[Hub] Warning: Could not scan ${lib.id} at ${libPath}`);
    }
  }

  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  console.log("[Hub] Registry updated with latest refined stats.");
}

function getAllFiles(dir: string): string[] {
  let results: string[] = [];
  if (!readdirSync(dir)) return [];
  const list = readdirSync(dir);
  for (const file of list) {
    const path = join(dir, file);
    if (statSync(path).isDirectory() && !file.startsWith(".")) {
      results = results.concat(getAllFiles(path));
    } else if (!file.startsWith(".")) {
      results.push(path);
    }
  }
  return results;
}

scanLibraries();
