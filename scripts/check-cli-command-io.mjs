#!/usr/bin/env node
/**
 * EN: Gate todo §15.4 — CLI command-result path must not use raw println!/eprintln!.
 * Allowlist: emit_command_output_to_os (Interactive flush) and #[cfg(test)] modules.
 * JA: todo §15.4。コマンド結果経路の直 println!/eprintln! を禁止。
 */
import { readFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

/** EN: Files on the command-result path that must not print except allowlisted regions. */
const STRICT_FILES = [
  "hosts/cli/src/adapter.rs",
  "hosts/cli/src/command_io.rs",
  "hosts/cli/src/ui_settings_host.rs"
]

const PRINT_RE = /\b(println|eprintln)!\s*\(/g

/**
 * EN: Strip `fn emit_command_output_to_os` body and `#[cfg(test)] mod …` blocks.
 * JA: 許可領域を除去してからマクロを探す。
 */
function stripAllowlisted(source) {
  let text = source
  text = text.replace(
    /fn\s+emit_command_output_to_os\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g,
    "fn emit_command_output_to_os() { /* allowlisted */ }"
  )
  text = text.replace(
    /#\[cfg\(test\)\]\s*mod\s+\w+\s*\{[\s\S]*?\n\}/g,
    "/* test module stripped */"
  )
  return text
}

function findHits(rel, source) {
  const text = stripAllowlisted(source)
  const hits = []
  PRINT_RE.lastIndex = 0
  let m
  while ((m = PRINT_RE.exec(text)) !== null) {
    const before = text.slice(0, m.index)
    const line = before.split("\n").length
    hits.push({ rel, line, macro: m[1] })
  }
  return hits
}

async function main() {
  const allHits = []
  for (const rel of STRICT_FILES) {
    const abs = join(root, rel)
    let raw
    try {
      raw = await readFile(abs, "utf8")
    } catch {
      console.error(`check:cli-command-io: missing ${rel}`)
      process.exit(1)
    }
    allHits.push(...findHits(rel, raw))
  }

  if (allHits.length > 0) {
    console.error(
      "check:cli-command-io: command-result path must use CommandIo (todo §15.4)."
    )
    console.error(
      "Allowed: emit_command_output_to_os flush; infra logs outside STRICT_FILES."
    )
    for (const h of allHits) {
      console.error(`  ${h.rel}:${h.line}: ${h.macro}!`)
    }
    process.exit(1)
  }

  console.log("check:cli-command-io: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
