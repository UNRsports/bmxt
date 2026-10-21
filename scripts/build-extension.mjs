#!/usr/bin/env node
/**
 * EN: Build extension host(s). Runs wasm + background-services once, then WXT.
 * JA: 拡張ホストをビルドする。wasm と background-services は一度だけ実行し、続けて WXT。
 *
 * Usage:
 *   node scripts/build-extension.mjs chrome
 *   node scripts/build-extension.mjs firefox
 *   node scripts/build-extension.mjs all
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
  console.error("Usage: node scripts/build-extension.mjs <chrome|firefox|all>")
  process.exit(1)
}

runNode("scripts/build-wasm.mjs")
runNode("scripts/build-background-services.mjs")

if (target === "chrome" || target === "all") {
  run("pnpm", ["exec", "wxt", "build", "-c", "hosts/chrome/wxt.config.ts"])
}

if (target === "firefox" || target === "all") {
  run("pnpm", [
    "exec",
    "wxt",
    "build",
    "-c",
    "hosts/firefox/wxt.config.ts",
    "-b",
    "firefox",
    "--mv3"
  ])
}
