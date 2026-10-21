#!/usr/bin/env node
/**
 * EN: Build background-services as IIFE (Chrome SW `importScripts`) and ESM (Firefox).
 * JA: background-services を IIFE（Chrome SW の importScripts）と ESM（Firefox）の両方で出力。
 */

import esbuild from "esbuild"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const nodeEmptyShim = join(root, "shared/lib/shims/node-empty.ts")
const entryIife = join(root, "shared/entrypoints/background/background-services.ts")
const entryEsm = join(
  root,
  "shared/entrypoints/background/background-services-esm-entry.ts"
)
const outfileIife = join(root, "shared/public/background-services.js")
const outfileEsm = join(root, "shared/public/background-services.mjs")
const wasmPublic = join(root, "shared/public/bmxt_core_bg.wasm")

if (!existsSync(wasmPublic)) {
  console.warn("warning: public/bmxt_core_bg.wasm missing — run pnpm run build:wasm")
}

const shared = {
  bundle: true,
  platform: "browser",
  target: "es2022",
  sourcemap: false,
  alias: {
    fs: nodeEmptyShim,
    path: nodeEmptyShim,
    crypto: nodeEmptyShim
  },
  logLevel: "info"
}

await esbuild.build({
  ...shared,
  entryPoints: [entryIife],
  format: "iife",
  globalName: "BmxtBackgroundServices",
  outfile: outfileIife
})

await esbuild.build({
  ...shared,
  entryPoints: [entryEsm],
  format: "esm",
  outfile: outfileEsm
})

console.log("built", outfileIife)
console.log("built", outfileEsm)
