import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { z } from "zod";
import { safePath } from "./path.js";

const RAW_DIR_ENV = process.env.LIBRARIAN_RAW_DIR || process.env.LIBRARIAN_SOURCE_DIR;
const REFINED_DIR_ENV =
  process.env.LIBRARIAN_REFINED_DIR || process.env.LIBRARIAN_TARGET_DIR || process.env.LIBRARIAN_DATA_DIR;

export const RAW_DIR = resolve(RAW_DIR_ENV || join(process.cwd(), "data"));
export const REFINED_DIR = resolve(REFINED_DIR_ENV || join(process.cwd(), "data-refined"));
export const REGISTRY_PATH = resolve(process.env.LIBRARIAN_REGISTRY || join(process.cwd(), "config", "registry.json"));
export const STATS_PATH = resolve(process.env.LIBRARIAN_STATS_PATH || join(process.cwd(), "state", "libraries.stats.json"));

const LibrarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1),
  branch: z.string().optional().default("main"),
  source_subpath: z.string().optional(),
  // Legacy compatibility: older configs used "path".
  path: z.string().optional()
});

const RegistrySchema = z.object({
  libraries: z.array(LibrarySchema).min(1)
});

const LibraryStatsSchema = z.object({
  id: z.string().min(1),
  file_count: z.number().int().nonnegative(),
  source_ref: z.string().optional(),
  last_updated: z.string().min(1)
});

const StatsFileSchema = z.object({
  generated_at: z.string().min(1),
  libraries: z.array(LibraryStatsSchema)
});

export type LibraryConfig = z.infer<typeof LibrarySchema>;
export type RegistryConfig = z.infer<typeof RegistrySchema>;
export type LibraryStats = z.infer<typeof LibraryStatsSchema>;

function normalizeSourceSubpath(raw: string, libraryId: string): string {
  const normalized = raw.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (normalized.length === 0 || normalized === ".") return ".";
  const legacyPrefix = `data/${libraryId}/`;
  if (normalized.startsWith(legacyPrefix)) {
    const trimmed = normalized.slice(legacyPrefix.length);
    return trimmed.length === 0 ? "." : trimmed;
  }
  return normalized;
}

export function refinedLibraryPath(libraryId: string): string {
  return join(REFINED_DIR, libraryId);
}

export function rawLibraryPath(libraryId: string): string {
  return join(RAW_DIR, libraryId);
}

export function resolveLibrarySourceRoot(library: LibraryConfig): string {
  return safePath(rawLibraryPath(library.id), normalizeSourceSubpath(library.source_subpath || ".", library.id));
}

export function loadRegistry(): RegistryConfig {
  if (!existsSync(REGISTRY_PATH)) {
    throw new Error(`Registry file not found: ${REGISTRY_PATH}`);
  }
  const parsed = RegistrySchema.parse(JSON.parse(readFileSync(REGISTRY_PATH, "utf-8")));
  return {
    libraries: parsed.libraries.map((library) => ({
      ...library,
      source_subpath: normalizeSourceSubpath(library.source_subpath || library.path || ".", library.id)
    }))
  };
}

export function loadStatsIndex(): Map<string, LibraryStats> {
  if (!existsSync(STATS_PATH)) return new Map();
  try {
    const parsed = StatsFileSchema.parse(JSON.parse(readFileSync(STATS_PATH, "utf-8")));
    return new Map(parsed.libraries.map((stats) => [stats.id, stats]));
  } catch (error) {
    console.warn(`[runtime] Invalid stats file ${STATS_PATH}: ${error}`);
    return new Map();
  }
}

export function writeStats(libraries: LibraryStats[]): void {
  const payload = {
    generated_at: new Date().toISOString(),
    libraries
  };
  mkdirSync(dirname(STATS_PATH), { recursive: true });
  writeFileSync(STATS_PATH, JSON.stringify(payload, null, 2));
}
