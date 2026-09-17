#!/usr/bin/env node
/**
 * EN: Post-`build:wasm` gate — TS↔Rust boundary goldens must pass before packaging.
 * JA: `build:wasm` 直後のゲート — 梱包前に TS↔Rust 境界ゴールデンが通ること。
 */

import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const testFile = join(root, "lib/features/bmxt-core/wasm-boundary.test.ts")

const result = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--test", testFile],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env
  }
)

if (result.status !== 0) {
  console.error("verify-wasm-boundary: failed")
  process.exit(result.status ?? 1)
}

console.log("verify-wasm-boundary: ok")
