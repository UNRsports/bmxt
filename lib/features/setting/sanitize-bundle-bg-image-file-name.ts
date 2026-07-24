/** EN: Import-only — reject path segments in bundle image file names. */
export function sanitizeBundleBgImageFileName(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") {
    return null
  }
  const normalized = raw.replace(/\\/g, "/").trim()
  if (!normalized || normalized.includes("/") || normalized.includes("..")) {
    return null
  }
  const base = normalized.split("/").pop() ?? normalized
  if (!base || base === "." || base === ".." || !/^[A-Za-z0-9._-]+$/.test(base)) {
    return null
  }
  return base
}
