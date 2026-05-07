#!/usr/bin/env node
/**
 * 新規コマンドの骨格を追加し、manifest に登録して `npm run codegen` する。
 *
 * Usage: node scripts/scaffold-command.mjs <rust_module> <canonical_name> [aliases...]
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
    "Usage: node scripts/scaffold-command.mjs <rust_module> <canonical_name> [aliases...]\n" +
      "Example: node scripts/scaffold-command.mjs frobnicate frobnicate"
  )
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.length < 2) {
    usage()
    process.exit(1)
  }
  const rustModule = argv[0]
  const canonicalName = argv[1]
  const aliases = argv.slice(2)

  if (!/^[a-z][a-z0-9_]*$/.test(rustModule)) {
    console.error("rust_module must match /^[a-z][a-z0-9_]*$/")
    process.exit(1)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  if (manifest.commands.some((c) => c.module === rustModule)) {
    console.error(`manifest already has commands[].module === "${rustModule}"`)
    process.exit(1)
  }

  const cmdPath = join(root, "wasm", "bmxt-core", "src", "cmd", `${rustModule}.rs`)
  if (existsSync(cmdPath)) {
    console.error(`file already exists: ${cmdPath}`)
    process.exit(1)
  }

  const aliasInner =
    aliases.length > 0 ? aliases.map((a) => JSON.stringify(a)).join(", ") : ""

  const body = `use crate::meta::Cmd;
use crate::model::DispatchJson;

pub const CMD: Cmd = Cmd {
    name: ${JSON.stringify(canonicalName)},
    aliases: &[${aliasInner}],
    usage_primary: ${JSON.stringify(canonicalName)},
};

pub fn run(_args: &[String]) -> DispatchJson {
    DispatchJson::lines(vec!["not implemented (edit ${rustModule}.rs)".to_string()])
}
`

  writeFileSync(cmdPath, body + "\n", "utf8")

  manifest.commands.push({
    module: rustModule,
    canonicalName,
    aliases,
    usagePrimary: canonicalName
  })

  writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  )

  const modPath = join(root, "wasm", "bmxt-core", "src", "cmd", "mod.rs")
  const modLine = `pub mod ${rustModule};`
  let modSrc = readFileSync(modPath, "utf8")
  if (!modSrc.includes(modLine)) {
    writeFileSync(modPath, modSrc.trimEnd() + `\n${modLine}\n`, "utf8")
  }

  execFileSync("npm", ["run", "codegen"], { cwd: root, stdio: "inherit" })
  console.log(`scaffolded ${rustModule}.rs + manifest; run codegen ok`)
}

main()
