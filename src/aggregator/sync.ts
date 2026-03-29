import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Librarian Aggregator (Linus Edition)
 * Pure, Stateless, Environment-Aware
 */
const REGISTRY_PATH = process.env.LIBRARIAN_REGISTRY || join(process.cwd(), "config", "registry.json");
const BASE_DATA_DIR = process.env.LIBRARIAN_DATA_DIR || join(process.cwd(), "data");

function runGit(args: string[], cwd?: string) {
  return spawnSync("git", args, { cwd, encoding: "utf-8" });
}

async function syncAll() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
  if (!existsSync(BASE_DATA_DIR)) mkdirSync(BASE_DATA_DIR, { recursive: true });

  for (const lib of registry.libraries) {
    // 允许通过环境变量动态映射库的物理路径
    const libPath = join(BASE_DATA_DIR, lib.id); 
    console.log(`[Aggregator] Syncing ${lib.id} -> ${libPath}`);

    if (existsSync(join(libPath, ".git"))) {
      runGit(["fetch", "origin"], libPath);
      runGit(["reset", "--hard", `origin/${lib.branch || "main"}`], libPath);
    } else {
      runGit(["clone", "--depth", "1", "-b", lib.branch || "main", lib.url, libPath]);
    }
  }
}

syncAll().catch(e => { console.error(e); process.exit(1); });
