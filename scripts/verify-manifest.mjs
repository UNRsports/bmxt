#!/usr/bin/env node
/**
 * `manifest/bmxt-codegen.json` の `commands` が各 `cmd/{module}.rs` の `pub const CMD` と一致するか検証する。
 */

import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const manifestPath = join(root, "manifest", "bmxt-codegen.json")

function parseAliases(aliasesStr) {
  const s = aliasesStr.trim()
  if (!s) return []
  const out = []
  const re = /"([^"]*)"/g
  let m
  while ((m = re.exec(s)) !== null) {
    out.push(m[1])
  }
  return out
}

function extractCmdMeta(rs) {
  const idx = rs.indexOf("pub const CMD: Cmd")
  if (idx < 0) {
    throw new Error("pub const CMD block not found")
  }
  const slice = rs.slice(idx, idx + 800)
  const nameM = slice.match(/name:\s*"([^"]*)"/)
  const uM = slice.match(/usage_primary:\s*"([^"]*)"/)
  const aM = slice.match(/aliases:\s*&\[(.*?)\]\s*,/s)
  if (!nameM || !uM || !aM) {
    throw new Error("could not parse CMD block")
  }
  return {
    name: nameM[1],
    usagePrimary: uM[1],
    aliases: parseAliases(aM[1])
  }
}

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  const cmds = manifest.commands

  for (const c of cmds) {
    const p = join(root, "wasm", "bmxt-core", "src", "cmd", `${c.module}.rs`)
    let rs
    try {
      rs = readFileSync(p, "utf8")
    } catch {
      throw new Error(`cmd file missing for module ${c.module}: ${p}`)
    }
    const meta = extractCmdMeta(rs)
    if (meta.name !== c.canonicalName) {
      throw new Error(
        `${c.module}: CMD.name is "${meta.name}" but manifest canonicalName is "${c.canonicalName}"`
      )
    }
    const em = [...meta.aliases].sort().join("|")
    const ex = [...c.aliases].sort().join("|")
    if (em !== ex) {
      throw new Error(
        `${c.module}: aliases mismatch manifest=[${c.aliases}] rs=[${meta.aliases}]`
      )
    }
    if (meta.usagePrimary !== c.usagePrimary) {
      throw new Error(
        `${c.module}: usagePrimary manifest="${c.usagePrimary}" rs="${meta.usagePrimary}"`
      )
    }
  }

  console.log(`verify-manifest ok (${cmds.length} commands)`)
}

main()
