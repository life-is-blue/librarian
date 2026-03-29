import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { LibraryStats, loadRegistry, loadStatsIndex, rawLibraryPath, refinedLibraryPath, writeStats } from "../core/runtime.js";

function getAllFiles(dir: string): string[] {
  const results: string[] = [];
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
  return results;
}

function readSourceRef(libraryId: string): string | undefined {
  const refPath = join(rawLibraryPath(libraryId), ".ref");
  if (!existsSync(refPath)) return undefined;
  const ref = readFileSync(refPath, "utf-8").trim();
  return ref || undefined;
}

function scanLibraries() {
  const registry = loadRegistry();
  const previousStats = loadStatsIndex();
  const stats: LibraryStats[] = [];

  for (const lib of registry.libraries) {
    const libPath = refinedLibraryPath(lib.id);
    if (!existsSync(libPath)) {
      throw new Error(`Refined library path not found: ${libPath}`);
    }

    const files = getAllFiles(libPath).filter((filePath) => filePath.endsWith(".md"));
    const sourceRef = readSourceRef(lib.id);
    const prevStats = previousStats.get(lib.id);
    const fileCount = files.length;

    const changed = prevStats?.file_count !== fileCount || prevStats?.source_ref !== sourceRef;

    stats.push({
      id: lib.id,
      file_count: fileCount,
      source_ref: sourceRef,
      last_updated: changed ? new Date().toISOString() : (prevStats?.last_updated || new Date().toISOString())
    });
  }

  writeStats(stats);
  console.log("[Hub] Library stats updated.");
}

scanLibraries();
