#!/usr/bin/env node
/**
 * EN: Extension UI + SW must not use fetch() to arbitrary URLs; CSP (connect-src) is backup.
 * JA: 拡張ページ・SW から fetch で任意オリジンへ取りに行かない方針を CI で固定する。
 */
import { readdir, readFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const roots = [
  join(root, "entrypoints"),
  join(root, "lib")
]

const fetchRe = /\bfetch\s*\(/g

async function walkTsFiles(dir, out = []) {
  let st
  try {
    st = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const ent of st) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === "node_modules") {
        continue
      }
      await walkTsFiles(p, out)
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      out.push(p)
    }
  }
  return out
}

async function main() {
  const files = []
  for (const r of roots) {
    if (r.endsWith(".ts")) {
      files.push(r)
    } else {
      await walkTsFiles(r, files)
    }
  }
  const hits = []
  for (const abs of files) {
    const text = await readFile(abs, "utf8")
    fetchRe.lastIndex = 0
    if (fetchRe.test(text)) {
      hits.push(relative(root, abs))
    }
  }
  if (hits.length > 0) {
    console.error(
      "check-no-fetch: disallowed fetch() in extension sources:\n  " + hits.join("\n  ")
    )
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
