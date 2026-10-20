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

runPnpm(["verify:manifest"])
runPnpm(["check:no-fetch"])
runPnpm(["check:generated"])
run("cargo", ["test", "-p", "bmxt-core"])
runPnpm(["build:wasm"])
run("pnpm", ["exec", "tsc", "--noEmit"])
runPnpm(["test"])
runPnpm(["build:chrome"])
runPnpm(["test:e2e:chrome"])
runPnpm(["build:firefox"])
runPnpm(["test:e2e:firefox"])

console.log("\nverify: ok")
