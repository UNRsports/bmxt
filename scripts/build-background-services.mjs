#!/usr/bin/env node
/**
 * EN: Build background-services as IIFE (Chrome SW `importScripts`) and ESM (Firefox).
 * JA: background-services を IIFE（Chrome SW の importScripts）と ESM（Firefox）の両方で出力。
 */

import esbuild from "esbuild"
import { existsSync, statSync } from "node:fs"
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

/** EN: Soft esbuild warning threshold; keep the SW helper under this when possible. */
const SIZE_WARN_BYTES = 1024 * 1024

if (!existsSync(wasmPublic)) {
  console.warn("warning: public/bmxt_core_bg.wasm missing — run pnpm run build:wasm")
}

const shared = {
  bundle: true,
  platform: "browser",
  target: "es2022",
  sourcemap: false,
  minify: true,
  // EN: Prefer production React (and similar) if a UI package is ever pulled in by mistake.
  // JA: 万一 UI パッケージが混入しても production 側を選ぶ。
  define: {
    "process.env.NODE_ENV": '"production"'
  },
  alias: {
    fs: nodeEmptyShim,
    path: nodeEmptyShim,
    crypto: nodeEmptyShim
  },
  logLevel: "info",
  metafile: true
}

/**
 * EN: Fail if React / the session JobRunner hook lands in the SW bundle.
 * JA: React / session JobRunner hook が SW バンドルに入ったら失敗させる。
 */
function assertNoReactInMetafile(metafile, label) {
  const hits = Object.keys(metafile.inputs).filter((path) => {
    const normalized = path.replaceAll("\\", "/")
    if (normalized.includes("/features/job/use-session-job-runner")) {
      return true
    }
    if (normalized.includes("/node_modules/") && /\/react\//.test(normalized)) {
      return true
    }
    return false
  })
  if (hits.length > 0) {
    console.error(`${label}: React must not ship in background-services`)
    for (const hit of hits.slice(0, 20)) {
      console.error(`  ${hit}`)
    }
    process.exit(1)
  }
}

function logOutfileSize(path) {
  const bytes = statSync(path).size
  const kib = (bytes / 1024).toFixed(1)
  const note = bytes >= SIZE_WARN_BYTES ? " (still >= 1 MiB)" : ""
  console.log(`${path}: ${kib} KiB${note}`)
}

const iifeResult = await esbuild.build({
  ...shared,
  entryPoints: [entryIife],
  format: "iife",
  globalName: "BmxtBackgroundServices",
  outfile: outfileIife
})

assertNoReactInMetafile(iifeResult.metafile, "background-services.js")

const esmResult = await esbuild.build({
  ...shared,
  entryPoints: [entryEsm],
  format: "esm",
  outfile: outfileEsm
})

assertNoReactInMetafile(esmResult.metafile, "background-services.mjs")

console.log("built", outfileIife)
console.log("built", outfileEsm)
logOutfileSize(outfileIife)
logOutfileSize(outfileEsm)
