import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { RAW_DIR, loadRegistry, rawLibraryPath } from "../core/runtime.js";

function runGit(args: string[], cwd?: string): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

async function syncAll() {
  const registry = loadRegistry();
  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });

  for (const lib of registry.libraries) {
    const libPath = rawLibraryPath(lib.id);
    const refPath = `${libPath}/.ref`;
    const branch = lib.branch || "main";

    console.log(`[Sync] ${lib.id}`);

    if (existsSync(`${libPath}/.git`)) {
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
