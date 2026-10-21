#!/usr/bin/env node
/**
 * EN: Pack a source archive for AMO reviewers (reproducible Firefox build inputs).
 *     Invoked from `pnpm run package:firefox` / `package` (not a separate npm script).
 * JA: AMO レビュア向けソースアーカイブ。`package:firefox` から呼ばれる（独立スクリプト廃止）。
 *
 * Artifact: `.output/bmxt-<version>-firefox-sources.tar.gz`
 */

import { spawnSync } from "node:child_process"
import { mkdirSync, existsSync, unlinkSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { readFileSync } from "node:fs"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(scriptDir, "../../..")
const outDir = join(repoRoot, ".output")

/**
 * @returns {string} Absolute path of the created archive
 */
export function packageFirefoxAmoSources() {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"))
  const version = typeof pkg.version === "string" ? pkg.version : "0.0.0"
  const archiveName = `bmxt-${version}-firefox-sources.tar.gz`
  const archivePath = join(outDir, archiveName)

  mkdirSync(outDir, { recursive: true })

  // EN: Remove WXT's incomplete default sources zip if a prior build left one behind.
  // JA: 以前の WXT 不完全 sources.zip が残っていれば削除する。
  const legacyWxtSourcesZip = join(outDir, `bmxt-${version}-sources.zip`)
  if (existsSync(legacyWxtSourcesZip)) {
    unlinkSync(legacyWxtSourcesZip)
  }

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
    throw new Error("package-amo-source: tar failed")
  }

  if (!existsSync(archivePath)) {
    throw new Error(`package-amo-source: archive missing ${archivePath}`)
  }

  return archivePath
}

const isDirectRun =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1]

if (isDirectRun) {
  try {
    const archivePath = packageFirefoxAmoSources()
    console.log("AMO source archive:", archivePath)
    console.log("Point reviewers at hosts/firefox/AMO_SOURCE.md inside the archive.")
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}
