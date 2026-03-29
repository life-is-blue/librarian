import { resolve, sep } from "path";

export function safePath(basePath: string, userPath: string): string {
  const resolvedBase = resolve(basePath);
  const resolved = resolve(resolvedBase, userPath);
  if (resolved !== resolvedBase && !resolved.startsWith(`${resolvedBase}${sep}`)) {
    throw new Error(`Path traversal detected: ${userPath}`);
  }
  return resolved;
}

export function normalizeRelPath(path: string): string {
  return path.split("\\").join("/");
}
