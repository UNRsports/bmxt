#!/usr/bin/env node
/**
 * EN: Zip extension host(s) for store submission. Runs wasm + background-services once, then WXT zip.
 *     Firefox also packs a full AMO review source tarball (not WXT's incomplete sources.zip).
 * JA: ストア提出用 zip。Firefox では配布用 zip に加え AMO 審査用ソース tarball も出力する。
 *
 * Usage:
 *   node scripts/package-extension.mjs chrome
 *   node scripts/package-extension.mjs firefox
 *   node scripts/package-extension.mjs all
 *
 * Artifacts (under `.output/`, via WXT `zip.name` = `bmxt`):
 *   bmxt-<version>-chrome.zip
 *   bmxt-<version>-firefox.zip
 *   bmxt-<version>-firefox-sources.tar.gz   (Firefox only — AMO source submission)
 */

import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { packageFirefoxAmoSources } from "../hosts/firefox/scripts/package-amo-source.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const target = process.argv[2]

function run(command, args) {
  console.log(`\n==> ${[command, ...args].join(" ")}`)
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function runNode(scriptRelPath) {
  run(process.execPath, [join(root, scriptRelPath)])
}

if (target !== "chrome" && target !== "firefox" && target !== "all") {
  console.error("Usage: node scripts/package-extension.mjs <chrome|firefox|all>")
  process.exit(1)
}

runNode("scripts/build-wasm.mjs")
runNode("scripts/build-background-services.mjs")

if (target === "chrome" || target === "all") {
  run("pnpm", ["exec", "wxt", "zip", "-c", "hosts/chrome/wxt.config.ts"])
}

if (target === "firefox" || target === "all") {
  run("pnpm", [
    "exec",
    "wxt",
    "zip",
    "-c",
    "hosts/firefox/wxt.config.ts",
    "-b",
    "firefox",
    "--mv3"
  ])
  console.log("\n==> package Firefox AMO sources")
  try {
    const archivePath = packageFirefoxAmoSources()
    console.log("AMO source archive:", archivePath)
    console.log("Point reviewers at hosts/firefox/AMO_SOURCE.md inside the archive.")
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}
