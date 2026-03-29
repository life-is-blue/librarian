import { existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

export const REFINED_DIR = resolve(process.env.LIBRARIAN_REFINED_DIR || "data-refined");
export const STATS_PATH = resolve(process.env.LIBRARIAN_STATS_PATH || "state/libraries.stats.json");

export function listLibraries(): string[] {
  if (!existsSync(REFINED_DIR)) {
    return [];
  }
  return readdirSync(REFINED_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
    .map(entry => entry.name);
}

export function refinedLibraryPath(libraryId: string): string {
  return join(REFINED_DIR, libraryId);
}
