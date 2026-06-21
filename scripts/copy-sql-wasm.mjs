/** Copy sql.js WASM into extension assets (offline; no network at runtime). */
import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const destDir = join(root, "public/assets/search-cache")
const srcWasm = join(root, "node_modules/sql.js/dist/sql-wasm.wasm")
const destWasm = join(destDir, "sql-wasm.wasm")

mkdirSync(destDir, { recursive: true })
copyFileSync(srcWasm, destWasm)
