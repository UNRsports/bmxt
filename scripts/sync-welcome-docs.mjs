/** Copy welcome-content.json from lib to docs/ for GitHub Pages. */
import { copyFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const src = join(root, "lib/features/welcome/welcome-content.json")
const dest = join(root, "docs/welcome-content.json")

copyFileSync(src, dest)
