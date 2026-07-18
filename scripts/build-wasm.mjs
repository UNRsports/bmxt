#!/usr/bin/env node
/**
 * EN: Build bmxt-core WASM via wasm-pack; copy binary to public/ for extension packaging.
 * JA: wasm-pack で bmxt-core をビルドし、拡張梱包用に public/ へ .wasm をコピーする。
 */

import { execFileSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const crateDir = join(root, "crates", "bmxt-core")
const outDir = join(root, "lib", "wasm", "bmxt-core")
const wasmSrc = join(outDir, "bmxt_core_bg.wasm")
const wasmDest = join(root, "public", "bmxt_core_bg.wasm")
const maxKiB = 400

execFileSync(
  "wasm-pack",
  ["build", crateDir, "--target", "web", "--out-dir", outDir, "--release"],
  { cwd: root, stdio: "inherit" }
)

const gitignorePath = join(outDir, ".gitignore")
if (existsSync(gitignorePath)) {
  unlinkSync(gitignorePath)
}

if (!existsSync(wasmSrc)) {
  console.error("wasm-pack did not produce", wasmSrc)
  process.exit(1)
}

copyFileSync(wasmSrc, wasmDest)

// Extension SW bundles as IIFE: strip glue fallback that references import.meta.url.
const glueJs = join(outDir, "bmxt_core.js")
if (existsSync(glueJs)) {
  const src = readFileSync(glueJs, "utf8")
  const patched = src.replace(
    /if \(module_or_path === undefined\) \{\s*module_or_path = new URL\('bmxt_core_bg\.wasm', import\.meta\.url\);\s*\}/,
    "if (module_or_path === undefined) { throw new Error('bmxt-core: module_or_path is required'); }"
  )
  if (patched !== src) {
    writeFileSync(glueJs, patched, "utf8")
  }
}

const bytes = statSync(wasmDest).size
const kib = bytes / 1024
console.log(`bmxt_core_bg.wasm: ${kib.toFixed(1)} KiB (${bytes} bytes)`)
if (kib > maxKiB) {
  console.error(`WASM size ${kib.toFixed(1)} KiB exceeds ${maxKiB} KiB budget`)
  process.exit(1)
}
