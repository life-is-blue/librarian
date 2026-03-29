import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from "fs";
import { join } from "path";

const REGISTRY_PATH = process.env.LIBRARIAN_REGISTRY || join(process.cwd(), "config", "registry.json");
const BASE_DATA_DIR = process.env.LIBRARIAN_DATA_DIR || join(process.cwd(), "data");

function runGit(args: string[], cwd?: string): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function cleanExcept(basePath: string, keepPath: string) {
  // 删除除了 keepPath 以外的所有内容
  const entries = readdirSync(basePath);
  for (const entry of entries) {
    if (entry === ".git" || entry === ".ref") continue;
    if (entry !== keepPath) {
      rmSync(join(basePath, entry), { recursive: true, force: true });
    }
  }
  // 如果 keepPath 不是 "."，把内容移到根目录
  if (keepPath !== "." && existsSync(join(basePath, keepPath))) {
    const subDir = join(basePath, keepPath);
    const entries = readdirSync(subDir);
    for (const entry of entries) {
      // 移动到上级
    }
  }
}

async function syncAll() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
  if (!existsSync(BASE_DATA_DIR)) mkdirSync(BASE_DATA_DIR, { recursive: true });

  for (const lib of registry.libraries) {
    const libPath = join(BASE_DATA_DIR, lib.id);
    const refPath = join(libPath, ".ref");
    const branch = lib.branch || "main";

    console.log(`[Sync] ${lib.id}`);

    if (existsSync(join(libPath, ".git"))) {
      // 增量更新
      const lastRef = existsSync(refPath) ? readFileSync(refPath, "utf-8").trim() : "";
      
      runGit(["fetch", "origin", branch], libPath);
      const newRef = runGit(["rev-parse", "FETCH_HEAD"], libPath);

      if (lastRef !== newRef) {
        console.log(`  Updated: ${lastRef.slice(0, 7) || "none"} -> ${newRef.slice(0, 7)}`);
        runGit(["reset", "--hard", "FETCH_HEAD"], libPath);
        runGit(["clean", "-fd"], libPath);
        writeFileSync(refPath, newRef);
      } else {
        console.log(`  No update (at ${newRef.slice(0, 7)})`);
      }
    } else {
      // 首次克隆 - 总是全量克隆，后续由 standardizer 处理 path
      runGit(["clone", "--depth", "1", "-b", branch, lib.url, libPath]);
      
      const ref = runGit(["rev-parse", "HEAD"], libPath);
      writeFileSync(refPath, ref);
      console.log(`  Cloned: ${ref.slice(0, 7)}`);
    }
  }

  console.log("[Sync] Done");
}

syncAll().catch(e => { console.error(e); process.exit(1); });
