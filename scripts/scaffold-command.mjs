#!/usr/bin/env node
/**
 * 新規コマンドの骨格を追加し、manifest に登録して `pnpm run codegen` する。
 *
 * Usage: node scripts/scaffold-command.mjs <module> <canonical_name> [aliases...]
 * Example: node scripts/scaffold-command.mjs frobnicate frobnicate a b
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const manifestPath = join(root, "manifest", "bmxt-codegen.json")

function usage() {
  console.error(
    "Usage: node scripts/scaffold-command.mjs <module> <canonical_name> [aliases...]\n" +
      "Example: node scripts/scaffold-command.mjs frobnicate frobnicate"
  )
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.length < 2) {
    usage()
    process.exit(1)
  }
  const moduleName = argv[0]
  const canonicalName = argv[1]
  const aliases = argv.slice(2)

  if (!/^[a-z][a-z0-9_]*$/.test(moduleName)) {
    console.error("module must match /^[a-z][a-z0-9_]*$/")
    process.exit(1)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  if (manifest.commands.some((c) => c.module === moduleName)) {
    console.error(`manifest already has commands[].module === "${moduleName}"`)
    process.exit(1)
  }

  const cmdPath = join(root, "crates", "bmxt-core", "src", "cmd", `${moduleName}.rs`)
  if (existsSync(cmdPath)) {
    console.error(`file already exists: ${cmdPath}`)
    process.exit(1)
  }

  const body = `//! Scaffolded by scripts/scaffold-command.mjs
//! Next: pick a path in manifest/templates/new-command.checklist.md
//! Examples: command-reuse-effects.example.rs | command-reuse-ui-action.example.rs

use crate::ir::{msgs_from_keys, DispatchBundle};

pub fn run(_args: &[String]) -> DispatchBundle {
    msgs_from_keys(&["cmd.error.unknownCommand"])
}
`

  writeFileSync(cmdPath, body + "\n", "utf8")

  const modPath = join(root, "crates", "bmxt-core", "src", "cmd", "mod.rs")
  let modRs = readFileSync(modPath, "utf8")
  if (!modRs.includes(`pub mod ${moduleName};`)) {
    modRs = modRs.replace(
      "mod helpers;",
      `pub mod ${moduleName};\n\nmod helpers;`
    )
  }
  if (!modRs.includes(`"${canonicalName}" =>`)) {
    modRs = modRs.replace(
      `_ => crate::ir::msgs(vec![crate::ir::msg_param(`,
      `"${canonicalName}" => ${moduleName}::run(args),\n        _ => crate::ir::msgs(vec![crate::ir::msg_param(`
    )
  }
  writeFileSync(modPath, modRs, "utf8")

  manifest.commands.push({
    module: moduleName,
    canonicalName,
    aliases,
    usagePrimary: canonicalName,
    subcommands: []
  })

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8")

  execFileSync("pnpm", ["run", "codegen"], { cwd: root, stdio: "inherit" })

  console.log(`scaffed crates/bmxt-core/src/cmd/${moduleName}.rs and updated manifest + codegen`)
  console.log(`Next: manifest/templates/new-command.checklist.md`)
}

main()
