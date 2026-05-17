#!/usr/bin/env node
/**
 * 新規コマンドの骨格を追加し、manifest に登録して `npm run codegen` する。
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

  const cmdPath = join(root, "lib", "features", "bmxt-core", "cmd", `${moduleName}.ts`)
  if (existsSync(cmdPath)) {
    console.error(`file already exists: ${cmdPath}`)
    process.exit(1)
  }

  const aliasInner =
    aliases.length > 0 ? aliases.map((a) => JSON.stringify(a)).join(", ") : ""

  const body = `import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: ${JSON.stringify(canonicalName)},
  aliases: [${aliasInner}],
  usagePrimary: ${JSON.stringify(canonicalName)}
}

export function run(_args: string[]) {
  return linesDispatch(["not implemented (edit ${moduleName}.ts)"])
}
`

  writeFileSync(cmdPath, body + "\n", "utf8")

  manifest.commands.push({
    module: moduleName,
    canonicalName,
    aliases,
    usagePrimary: canonicalName,
    subcommands: []
  })

  writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  )

  execFileSync("npm", ["run", "codegen"], { cwd: root, stdio: "inherit" })
  console.log(`scaffolded ${moduleName}.ts + manifest; run codegen ok`)
}

main()
