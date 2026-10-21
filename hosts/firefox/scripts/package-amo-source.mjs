#!/usr/bin/env node
/**
 * EN: Pack a source archive for AMO reviewers (reproducible Firefox build inputs).
 * JA: AMO レビュア向けソースアーカイブを作成する（Firefox 再現ビルド入力）。
 *
 * Usage (repo root): pnpm run package:amo-source
 */

import { spawnSync } from "node:child_process"
import { mkdirSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { readFileSync } from "node:fs"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(scriptDir, "../../..")
const outDir = join(repoRoot, ".output")
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"))
const version = typeof pkg.version === "string" ? pkg.version : "0.0.0"
const stamp = new Date().toISOString().slice(0, 10)
const archiveName = `bmxt-${version}-firefox-amo-source-${stamp}.tar.gz`
const archivePath = join(outDir, archiveName)

mkdirSync(outDir, { recursive: true })

const excludes = [
  "--exclude=.git",
  "--exclude=node_modules",
  "--exclude=.output",
  "--exclude=.wxt",
  "--exclude=hosts/chrome/.wxt",
  "--exclude=hosts/firefox/.wxt",
  "--exclude=target",
  "--exclude=.pnpm-store",
  "--exclude=tests/test-results",
  "--exclude=playwright-report",
  "--exclude=*.lcov",
  "--exclude=.cursor",
  "--exclude=shared/public/background-services.js",
  "--exclude=shared/public/background-services.mjs",
  "--exclude=shared/public/bmxt_core_bg.wasm"
]

const result = spawnSync(
  "tar",
  ["-czf", archivePath, "-C", repoRoot, ...excludes, "."],
  { cwd: repoRoot, stdio: "inherit" }
)

if (result.status !== 0) {
  console.error("package-amo-source: tar failed")
  process.exit(result.status ?? 1)
}

if (!existsSync(archivePath)) {
  console.error("package-amo-source: archive missing", archivePath)
  process.exit(1)
}

console.log("AMO source archive:", archivePath)
console.log("Point reviewers at hosts/firefox/AMO_SOURCE.md inside the archive.")
