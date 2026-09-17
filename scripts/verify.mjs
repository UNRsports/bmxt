#!/usr/bin/env node
/**
 * EN: Full verification gate — same checks as GitHub CI after setup/audit.
 * JA: 全体検証ゲート — GitHub CI のセットアップ／audit 以降と同じ検査。
 *
 * Usage: pnpm run verify
 */

import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

function run(command, args, opts = {}) {
  console.log(`\n==> ${[command, ...args].join(" ")}`)
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
    ...opts
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function runPnpm(scriptArgs) {
  run("pnpm", ["run", ...scriptArgs])
}

function hasXvfbRun() {
  const result = spawnSync("xvfb-run", ["--help"], {
    cwd: root,
    stdio: "ignore",
    env: process.env
  })
  return result.status === 0
}

function runE2e() {
  const onLinux = process.platform === "linux"
  const noDisplay = !process.env.DISPLAY || process.env.DISPLAY.length === 0
  const useXvfb = onLinux && (process.env.CI === "true" || noDisplay) && hasXvfbRun()
  if (useXvfb) {
    run("xvfb-run", ["-a", "pnpm", "run", "test:e2e"])
    return
  }
  runPnpm(["test:e2e"])
}

runPnpm(["verify:manifest"])
runPnpm(["check:no-fetch"])
runPnpm(["check:generated"])
run("cargo", ["test", "-p", "bmxt-core"])
runPnpm(["build:wasm"])
run("pnpm", ["exec", "tsc", "--noEmit"])
runPnpm(["test"])
runPnpm(["build"])
runPnpm(["test:e2e:install"])
runE2e()

console.log("\nverify: ok")
