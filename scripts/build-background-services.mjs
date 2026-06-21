#!/usr/bin/env node
/**
 * EN: Build background-services.js as a separate ESM bundle (not inlined into background.js).
 * JA: background-services.js を別 ESM バンドルとして出力（background.js に含めない）。
 */

import esbuild from "esbuild"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const nodeEmptyShim = join(root, "lib/shims/node-empty.ts")
const entry = join(root, "entrypoints/background/background-services.ts")
const outfile = join(root, "public/background-services.js")

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: "iife",
  globalName: "BmxtBackgroundServices",
  platform: "browser",
  target: "es2022",
  outfile,
  sourcemap: false,
  alias: {
    fs: nodeEmptyShim,
    path: nodeEmptyShim,
    crypto: nodeEmptyShim
  },
  logLevel: "info"
})

console.log("built", outfile)
