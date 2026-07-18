#!/usr/bin/env node
/**
 * `manifest/bmxt-codegen.json` の `commands` が Rust `cmd/{module}.rs` および
 * `registry_table.rs` と一致するか検証する。
 */

import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const manifestPath = join(root, "manifest", "bmxt-codegen.json")
const registryPath = join(root, "crates", "bmxt-core", "src", "generated", "registry_table.rs")

function verifySubcommandHeadsInSource(c, rs, helpCmdSource) {
  if (!Array.isArray(c.subcommands)) {
    throw new Error(`${c.module}: missing or invalid subcommands[]`)
  }
  if (c.subcommands.length === 0) {
    return
  }
  for (const br of c.subcommands) {
    if (!br || typeof br.head !== "string") {
      throw new Error(`${c.module}: invalid subcommand entry`)
    }
    const literal = JSON.stringify(br.head)
    // EN: `help` second token is handled centrally in help_cmd.rs (try_section_help).
    if (br.head === "help") {
      if (!helpCmdSource.includes(literal)) {
        throw new Error(
          `${c.module}: subcommand head "help" must appear as literal ${literal} in crates/bmxt-core/src/cmd/help_cmd.rs`
        )
      }
      continue
    }
    if (!rs.includes(literal)) {
      throw new Error(
        `${c.module}: subcommand head ${JSON.stringify(br.head)} must appear as literal ${literal} in crates/bmxt-core/src/cmd/${c.module}.rs`
      )
    }
  }
}

function verifyCanonicalInRegistry(c, registry) {
  const nameLit = JSON.stringify(c.canonicalName)
  if (!registry.includes(`name: ${nameLit},`)) {
    throw new Error(
      `${c.module}: canonicalName ${nameLit} not found in crates/bmxt-core/src/generated/registry_table.rs`
    )
  }
}

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  const registry = readFileSync(registryPath, "utf8")
  const helpCmdPath = join(root, "crates", "bmxt-core", "src", "cmd", "help_cmd.rs")
  const helpCmdSource = readFileSync(helpCmdPath, "utf8")
  const cmds = manifest.commands

  for (const c of cmds) {
    const p = join(root, "crates", "bmxt-core", "src", "cmd", `${c.module}.rs`)
    let rs
    try {
      rs = readFileSync(p, "utf8")
    } catch {
      throw new Error(`Rust cmd file missing for module ${c.module}: ${p}`)
    }
    verifyCanonicalInRegistry(c, registry)
    verifySubcommandHeadsInSource(c, rs, helpCmdSource)
  }

  console.log(`verify-manifest ok (${cmds.length} commands, Rust cmd + registry_table.rs)`)
}

main()
