import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { BmxtCandidateCatalog } from "./types.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultCatalogPath = join(__dirname, "..", "..", "..", "manifest", "bmxt-candidate.json")

let cachedCatalog: BmxtCandidateCatalog | null = null

/** EN: Load manifest/bmxt-candidate.json (cached). */
export function loadBmxtCandidateCatalog(catalogPath = defaultCatalogPath): BmxtCandidateCatalog {
  if (cachedCatalog !== null && catalogPath === defaultCatalogPath) {
    return cachedCatalog
  }
  const raw = readFileSync(catalogPath, "utf8")
  const parsed: unknown = JSON.parse(raw)
  if (catalogPath === defaultCatalogPath) {
    cachedCatalog = parsed as BmxtCandidateCatalog
    return cachedCatalog
  }
  return parsed as BmxtCandidateCatalog
}

/** EN: Reset catalog cache (tests). */
export function resetBmxtCandidateCatalogCache(): void {
  cachedCatalog = null
}
