#!/usr/bin/env node
/**
 * EN: Zip extension host(s) for store submission. Runs wasm + background-services once, then WXT zip.
 * JA: ストア提出用にホストを zip する。wasm と background-services は一度だけ実行し、続けて WXT zip。
 *
 * Usage:
 *   node scripts/package-extension.mjs chrome
 *   node scripts/package-extension.mjs firefox
 *   node scripts/package-extension.mjs all
 *
 * Artifacts (under `.output/`, via WXT `zip.name` = `bmxt`):
 *   bmxt-<version>-chrome.zip
 *   bmxt-<version>-firefox.zip
 *   (Firefox also emits bmxt-<version>-sources.zip — WXT default; AMO reviewers use package:amo-source)
 */

import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

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
}
