#!/usr/bin/env node
/**
 * EN: Regenerate lib/features/setting/i18n/namespaces/*.json from a single messages export.
 * JA: 単一 messages エクスポートから namespace JSON を再生成する。
 *
 * Usage: node scripts/split-i18n-namespaces.mjs [path/to/messages.json]
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const srcPath = process.argv[2] ?? join(root, "lib/features/setting/i18n/messages.monolithic.json")
const outDir = join(root, "lib/features/setting/i18n/namespaces")

const src = JSON.parse(readFileSync(srcPath, "utf8"))
mkdirSync(outDir, { recursive: true })

const buckets = {}
for (const [key, value] of Object.entries(src)) {
  const ns = key.includes(".") ? key.split(".")[0] : "common"
  if (!buckets[ns]) {
    buckets[ns] = {}
  }
  buckets[ns][key] = value
}

const names = Object.keys(buckets).sort()
for (const ns of names) {
  const sorted = Object.fromEntries(
    Object.keys(buckets[ns])
      .sort()
      .map((k) => [k, buckets[ns][k]])
  )
  writeFileSync(join(outDir, `${ns}.json`), `${JSON.stringify(sorted, null, 2)}\n`)
}
writeFileSync(join(outDir, "_manifest.json"), `${JSON.stringify(names, null, 2)}\n`)
console.log(`Wrote ${names.length} namespace files (${Object.keys(src).length} keys) to ${outDir}`)
