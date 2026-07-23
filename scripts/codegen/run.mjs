/**
 * 中立マニフェスト `manifest/bmxt-codegen.json` から TypeScript を生成する。
 * 単一出力: `pnpm run codegen`
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..", "..")
const manifestPath = join(root, "manifest", "bmxt-codegen.json")

function loadManifest() {
  const raw = readFileSync(manifestPath, "utf8")
  const m = JSON.parse(raw)
  if (m.schemaVersion !== 1) {
    throw new Error(`unsupported schemaVersion: ${m.schemaVersion}`)
  }
  if (!Array.isArray(m.commands) || !Array.isArray(m.effects)) {
    throw new Error("manifest must have commands[] and effects[]")
  }
  validateCommandsSubcommands(m.commands)
  return m
}

const TAIL_KINDS = new Set(["none", "rest_http_url", "rest"])

/** `commands[].subcommands` — second token heads, optional third fixed tokens, optional tail kind. */
function validateCommandsSubcommands(commands) {
  for (const c of commands) {
    if (c.subcommands === undefined) {
      throw new Error(
        `commands[].module=${c.module}: missing "subcommands" (use [] if no second-token family)`
      )
    }
    if (!Array.isArray(c.subcommands)) {
      throw new Error(`commands[].module=${c.module}: "subcommands" must be an array`)
    }
    const seen = new Set()
    for (const br of c.subcommands) {
      if (!br || typeof br !== "object") {
        throw new Error(`commands[].module=${c.module}: invalid subcommand branch`)
      }
      if (typeof br.head !== "string" || !(br.head.startsWith("-") || br.head === "help")) {
        throw new Error(
          `commands[].module=${c.module}: each subcommand needs string "head" starting with "-" or literal "help" (got ${JSON.stringify(br?.head)})`
        )
      }
      const hl = br.head.toLowerCase()
      if (seen.has(hl)) {
        throw new Error(`commands[].module=${c.module}: duplicate subcommand head ${br.head}`)
      }
      seen.add(hl)
      if (br.trailingTokens !== undefined) {
        if (!Array.isArray(br.trailingTokens)) {
          throw new Error(`commands[].module=${c.module}: trailingTokens must be an array`)
        }
        for (const t of br.trailingTokens) {
          if (typeof t !== "string" || !t.startsWith("-")) {
            throw new Error(
              `commands[].module=${c.module}: trailingTokens entries must be strings starting with "-" (got ${JSON.stringify(t)})`
            )
          }
        }
      }
      const tail = br.tail ?? "none"
      if (!TAIL_KINDS.has(tail)) {
        throw new Error(
          `commands[].module=${c.module}: invalid tail ${JSON.stringify(tail)} (expected one of: none, rest_http_url, rest)`
        )
      }
    }
  }
}

function jsonValueToTsScalar(v) {
  if (v === null) return "null"
  if (typeof v === "boolean") return "boolean"
  if (typeof v === "number") return "number"
  if (typeof v === "string") return "string"
  if (Array.isArray(v)) {
    if (v.length === 0) return "number[]"
    return `${jsonValueToTsScalar(v[0])}[]`
  }
  if (typeof v === "object") return "Record<string, unknown>"
  return "unknown"
}

function buildEffectSampleObject(ef) {
  if (ef.shape === "unit") {
    return { kind: ef.kind }
  }
  const o = { kind: ef.kind }
  for (const [k, t] of Object.entries(ef.fields)) {
    if (t === "i32") o[k] = 0
    else if (t === "string") o[k] = ""
    else if (t === "vec_i32") o[k] = [0]
    else throw new Error(t)
  }
  return o
}

/** UiAction kinds — keep in sync with crates/bmxt-core/src/ir.rs `UiAction`. */
const UI_ACTIONS = [
  { kind: "show_help" },
  { kind: "nav_arm" },
  { kind: "nav_disarm" },
  { kind: "nav_confirm_close", fields: { target: "string" } },
  { kind: "open_plain_list", fields: { list_id: "string", line: "string" } },
  { kind: "close_picker", fields: { slot: "string" } },
  { kind: "continuation_prompt", fields: { prefix: "string" } },
  { kind: "session_list" },
  { kind: "session_switch", fields: { name: "string" } },
  { kind: "session_setting_name", fields: { name: "string" } },
  { kind: "group_new_from_selection" },
  { kind: "translate_on" },
  { kind: "translate_off" },
  { kind: "translate_setting", fields: { pair: "string" } },
  { kind: "snapshot_save", fields: { line: "string" } },
  { kind: "setting_list" },
  { kind: "setting_exit_list" },
  { kind: "tabs_exit_list" },
  { kind: "tabs_setting", fields: { mode: "string" } },
  { kind: "search_exit_list" },
  { kind: "dom_exit_list" },
  { kind: "dom_setting", fields: { mode: "string" } },
  { kind: "browse", fields: { line: "string" } },
  { kind: "picker_pass" }
]

function emitTsEffectTypes(effects) {
  const members = []
  for (const ef of effects) {
    const sample = buildEffectSampleObject(ef)
    const sortedKeys = Object.keys(sample).sort()
    const parts = sortedKeys.map((k) => {
      const v = sample[k]
      if (k === "kind") {
        return `kind: ${JSON.stringify(v)}`
      }
      return `${k}: ${jsonValueToTsScalar(v)}`
    })
    members.push(`  | { ${parts.join("; ")} }`)
  }
  members.sort()

  const uiMembers = UI_ACTIONS.map((ua) => {
    const parts = [`kind: ${JSON.stringify(ua.kind)}`]
    if (ua.fields) {
      for (const [k, t] of Object.entries(ua.fields).sort()) {
        parts.push(`${k}: ${t}`)
      }
    }
    return `  | { ${parts.join("; ")} }`
  })

  const header = `/**
 * @generated by scripts/codegen/run.mjs from manifest/bmxt-codegen.json
 * Do not edit by hand; run \`pnpm run codegen\`.
 */

export type ChromeEffect =
${members.join("\n")}

export type DispatchMsg = { key: string; params?: Record<string, string> }

export type UiActionIR =
${uiMembers.join("\n")}

export type DispatchBundle = {
  ty: "lines" | "effects" | "ui" | "msgs"
  lines?: string[]
  effects?: ChromeEffect[]
  action?: UiActionIR
  msgs?: DispatchMsg[]
  /** EN: Optional prompt restore after msgs (Rust prompt semantic SoT). */
  promptPrefix?: string
}
`
  return header.endsWith("\n") ? header : header + "\n"
}

function emitTsUiActionTypes() {
  const uiMembers = UI_ACTIONS.map((ua) => {
    const parts = [`kind: ${JSON.stringify(ua.kind)}`]
    if (ua.fields) {
      for (const [k, t] of Object.entries(ua.fields).sort()) {
        parts.push(`${k}: ${t}`)
      }
    }
    return `  | { ${parts.join("; ")} }`
  })
  return `/**
 * @generated by scripts/codegen/run.mjs — UiAction IR kinds (Rust bmxt-core/src/ir.rs).
 * Do not edit by hand; run \`pnpm run codegen\`.
 */

export type UiActionIR =
${uiMembers.join("\n")}
`
}

function emitTsApplyDispatch(effects) {
  const lines = [
    "/**",
    " * @generated by scripts/codegen/run.mjs from manifest/bmxt-codegen.json",
    " * Do not edit by hand.",
    " */",
    "",
    'import type { ChromeEffect } from "../effect-types"',
    'import type { DispatchChromeContext } from "../dispatch-context"'
  ]
  const sorted = [...effects].sort((a, b) => a.tsHandlerFile.localeCompare(b.tsHandlerFile))
  for (const ef of sorted) {
    const modPath = `./effects/${ef.tsHandlerFile}`
    lines.push(`import { ${ef.tsHandlerExport} } from "${modPath}"`)
  }
  lines.push("")
  lines.push(
    "export async function applyOne(",
    "  ctx: DispatchChromeContext,",
    "  e: ChromeEffect",
    "): Promise<string[]> {"
  )
  lines.push("  switch (e.kind) {")
  for (const ef of [...effects].sort((a, b) => a.kind.localeCompare(b.kind))) {
    lines.push(`    case ${JSON.stringify(ef.kind)}:`)
    lines.push(`      return ${ef.tsHandlerExport}(ctx, e)`)
  }
  lines.push("    default: {")
  lines.push("      const _x: never = e")
  lines.push('      return [`internal: unknown effect ${JSON.stringify(_x)}`]')
  lines.push("    }")
  lines.push("  }")
  lines.push("}")
  lines.push("")
  return lines.join("\n")
}

function emitCompletionFallback(commands) {
  const set = new Set()
  for (const c of commands) {
    set.add(c.canonicalName)
  }
  const tokens = [...set].sort()
  const arr = tokens.map((t) => `  ${JSON.stringify(t)}`).join(",\n")
  return `/**
 * @generated by scripts/codegen/run.mjs from manifest/bmxt-codegen.json
 * Do not edit by hand; run \`pnpm run codegen\`.
 */
export const FALLBACK_COMPLETION_CANDIDATES: string[] = [
${arr}
]
`
}

function normalizeBranch(br) {
  return {
    head: br.head,
    trailingTokens: Array.isArray(br.trailingTokens) ? br.trailingTokens : [],
    tail: br.tail ?? "none"
  }
}

function emitTsIsSecondToken(commands) {
  const arms = []
  for (const c of commands) {
    const heads = c.subcommands.map((b) => normalizeBranch(b).head.toLowerCase())
    if (heads.length === 0) {
      arms.push(`    case ${JSON.stringify(c.canonicalName)}:\n      return false`)
      continue
    }
    arms.push(
      `    case ${JSON.stringify(c.canonicalName)}: {\n      const lower = token.toLowerCase()\n      return ${heads.map((h) => `lower === ${JSON.stringify(h)}`).join(" || ")}\n    }`
    )
  }
  return `/** True when \`token\` is a manifest-declared second token (ASCII case-folding on \`token\`). */
export function isSecondToken(canonicalCmd: string, token: string): boolean {
  switch (canonicalCmd) {
${arms.join("\n")}
    default:
      return false
  }
}
`
}

function emitTsCommandSubcommands(commands) {
  const lines = []
  lines.push("/**")
  lines.push(" * @generated by scripts/codegen/run.mjs from manifest/bmxt-codegen.json")
  lines.push(" * Do not edit by hand; run `pnpm run codegen`.")
  lines.push(" */")
  lines.push("")
  lines.push('export type SubcommandTailKind = "none" | "rest_http_url" | "rest"')
  lines.push("")
  lines.push("export type CommandSubcommandBranch = {")
  lines.push("  readonly head: string")
  lines.push("  readonly trailingTokens: readonly string[]")
  lines.push("  readonly tail: SubcommandTailKind")
  lines.push("}")
  lines.push("")
  lines.push("const EMPTY_BRANCHES: readonly CommandSubcommandBranch[] = []")
  lines.push("")
  const recordParts = []
  for (const c of commands) {
    const branches = c.subcommands.map(normalizeBranch)
    const objLit = branches
      .map((b) => {
        const tt = JSON.stringify(b.trailingTokens)
        return `    { head: ${JSON.stringify(b.head)}, trailingTokens: ${tt} as const, tail: ${JSON.stringify(b.tail)} }`
      })
      .join(",\n")
    const value =
      branches.length === 0 ? "[] as const" : `[\n${objLit}\n  ] as const`
    recordParts.push(`  ${JSON.stringify(c.canonicalName)}: ${value}`)
  }
  lines.push("/** canonicalName → declared second-token branches (from manifest `subcommands`). */")
  lines.push("export const COMMAND_SUBCOMMAND_BRANCHES: Record<string, readonly CommandSubcommandBranch[]> = {")
  lines.push(recordParts.join(",\n"))
  lines.push("}")
  lines.push("")
  lines.push("export function getSubcommandBranches(canonicalName: string): readonly CommandSubcommandBranch[] {")
  lines.push("  return COMMAND_SUBCOMMAND_BRANCHES[canonicalName] ?? EMPTY_BRANCHES")
  lines.push("}")
  lines.push("")
  lines.push("/** Tab completion: second token after `canonicalName ` (prefix filter, canonical spelling). */")
  lines.push("export function listSecondTokenCandidatesByCommand(")
  lines.push("  canonicalName: string,")
  lines.push("  prefix: string")
  lines.push("): string[] {")
  lines.push("  const branches = getSubcommandBranches(canonicalName)")
  lines.push("  if (branches.length === 0) return []")
  lines.push("  const p = prefix.toLowerCase()")
  lines.push("  return branches.map((b) => b.head).filter((h) => h.toLowerCase().startsWith(p))")
  lines.push("}")
  lines.push("")
  lines.push("/** Optional third fixed tokens after `secondTokenLower` (e.g. `-u` after `tab -list`). */")
  lines.push("export function listThirdTokenCandidates(")
  lines.push("  canonicalName: string,")
  lines.push("  secondTokenLower: string,")
  lines.push("  prefix: string")
  lines.push("): string[] {")
  lines.push("  const branches = getSubcommandBranches(canonicalName)")
  lines.push("  const br = branches.find((b) => b.head.toLowerCase() === secondTokenLower)")
  lines.push("  if (!br?.trailingTokens?.length) return []")
  lines.push("  const p = prefix.toLowerCase()")
  lines.push("  return [...br.trailingTokens].filter((t) => t.toLowerCase().startsWith(p))")
  lines.push("}")
  lines.push("")
  lines.push("/** Enter with a single first token: restore `name ` when manifest declares subcommands. */")
  lines.push("export function continuationPromptAfterLoneFirstToken(trimmedSingleToken: string): string | null {")
  lines.push("  if (trimmedSingleToken.includes(\" \")) return null")
  lines.push("  const key = trimmedSingleToken.toLowerCase()")
  lines.push("  const branches = getSubcommandBranches(key)")
  lines.push("  if (!branches.length) return null")
  lines.push("  return `${key} `")
  lines.push("}")
  lines.push("")
  lines.push("export function secondTokenCandidatesAfterLoneFirstToken(trimmedSingleToken: string): string[] {")
  lines.push("  if (trimmedSingleToken.includes(\" \")) return []")
  lines.push("  const key = trimmedSingleToken.toLowerCase()")
  lines.push("  return listSecondTokenCandidatesByCommand(key, \"\")")
  lines.push("}")
  lines.push("")
  lines.push(emitTsIsSecondToken(commands))
  return lines.join("\n") + "\n"
}

function emitTsRegistryTable(commands) {
  const cmdEntries = commands
    .map(
      (c) => `  {
    name: ${JSON.stringify(c.canonicalName)},
    aliases: ${JSON.stringify(c.aliases)} as const,
    usagePrimary: ${JSON.stringify(c.usagePrimary)}
  }`
    )
    .join(",\n")
  return `/**
 * @generated by scripts/codegen/run.mjs from manifest/bmxt-codegen.json
 * Do not edit by hand; run \`pnpm run codegen\`.
 */

import type { CmdMeta } from "../types"

export const COMMANDS: readonly CmdMeta[] = [
${cmdEntries}
]

export function cmdByName(name: string): CmdMeta | undefined {
  return COMMANDS.find((c) => c.name === name)
}
`
}

function rustFieldType(manifestType) {
  if (manifestType === "i32") return "i64"
  if (manifestType === "string") return "String"
  if (manifestType === "vec_i32") return "Vec<i64>"
  throw new Error(`unknown rust field type: ${manifestType}`)
}

function rustFieldIdent(key) {
  if (key === "pickerMode") return "picker_mode"
  if (key === "showTag") return "show_tag"
  return key
}

function rustSerdeRename(key) {
  if (key === "pickerMode") return '\n    #[serde(rename = "pickerMode")]\n'
  if (key === "showTag") return '\n    #[serde(rename = "showTag")]\n'
  return ""
}

function emitRustChromeEffect(effects) {
  const variants = []
  for (const ef of [...effects].sort((a, b) => a.kind.localeCompare(b.kind))) {
    if (ef.shape === "unit") {
      variants.push(`    #[serde(rename = ${JSON.stringify(ef.kind)})]\n    ${ef.rustVariant},`)
      continue
    }
    const fieldLines = []
    for (const [key, t] of Object.entries(ef.fields).sort()) {
      const ident = rustFieldIdent(key)
      fieldLines.push(`${rustSerdeRename(key)}    ${ident}: ${rustFieldType(t)},`)
    }
    variants.push(
      `    #[serde(rename = ${JSON.stringify(ef.kind)})]\n    ${ef.rustVariant} {\n${fieldLines.join("\n")}\n    },`
    )
  }
  return `//! @generated by scripts/codegen/run.mjs from manifest/bmxt-codegen.json
//! Do not edit by hand; run \`pnpm run codegen\`.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum ChromeEffect {
${variants.join("\n")}
}
`
}

function emitRustIsSecondTokenArm(c) {
  if (!c.subcommands?.length) {
    return `        ${JSON.stringify(c.canonicalName)} => false,`
  }
  const heads = c.subcommands.map((b) => b.head.toLowerCase())
  const matchArms = heads.map((h) => JSON.stringify(h)).join(" | ")
  return `        ${JSON.stringify(c.canonicalName)} => matches!(lower.as_str(), ${matchArms}),`
}

function emitRustSubcommandBranchesArm(c) {
  const branches = (c.subcommands ?? []).map(normalizeBranch)
  if (branches.length === 0) {
    return `        ${JSON.stringify(c.canonicalName)} => &[],`
  }
  const staticName = `BRANCHES_${c.canonicalName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`
  return `        ${JSON.stringify(c.canonicalName)} => ${staticName},`
}

function emitRustSubcommandBranchConsts(commands) {
  const blocks = []
  for (const c of commands) {
    const branches = (c.subcommands ?? []).map(normalizeBranch)
    if (branches.length === 0) {
      continue
    }
    const staticName = `BRANCHES_${c.canonicalName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`
    const entries = branches
      .map((b) => {
        const tokens = b.trailingTokens.map((t) => JSON.stringify(t)).join(", ")
        return `    SubcommandBranch {\n        head: ${JSON.stringify(b.head)},\n        trailing_tokens: &[${tokens}],\n    },`
      })
      .join("\n")
    blocks.push(`static ${staticName}: &[SubcommandBranch] = &[\n${entries}\n];`)
  }
  return blocks.join("\n\n")
}

function emitRustRegistryTable(commands) {
  const cmdEntries = commands
    .map(
      (c) => `    CmdMeta {
        name: ${JSON.stringify(c.canonicalName)},
        aliases: &${JSON.stringify(c.aliases)},
        usage_primary: ${JSON.stringify(c.usagePrimary)},
    },`
    )
    .join("\n")
  const secondTokenArms = commands.map(emitRustIsSecondTokenArm).join("\n")
  const branchConsts = emitRustSubcommandBranchConsts(commands)
  const branchArms = commands.map(emitRustSubcommandBranchesArm).join("\n")
  return `//! @generated by scripts/codegen/run.mjs from manifest/bmxt-codegen.json
//! Do not edit by hand; run \`pnpm run codegen\`.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CmdMeta {
    pub name: &'static str,
    pub aliases: &'static [&'static str],
    pub usage_primary: &'static str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SubcommandBranch {
    pub head: &'static str,
    pub trailing_tokens: &'static [&'static str],
}

pub const COMMANDS: &[CmdMeta] = &[
${cmdEntries}
];

${branchConsts}

pub fn all_command_metas() -> &'static [CmdMeta] {
    COMMANDS
}

pub fn resolve_canonical(cmd: &str) -> Option<&'static str> {
    let k = cmd.to_ascii_lowercase();
    for c in COMMANDS {
        if c.name == k {
            return Some(c.name);
        }
        for alias in c.aliases {
            if alias.to_ascii_lowercase() == k {
                return Some(c.name);
            }
        }
    }
    None
}

pub fn is_second_token(canonical: &str, token: &str) -> bool {
    let lower = token.to_ascii_lowercase();
    match canonical {
${secondTokenArms}
        _ => false,
    }
}

/** EN: Manifest \`subcommands\` branches for fixed-token completion (tiers 2–3). */
pub fn subcommand_branches(canonical: &str) -> &'static [SubcommandBranch] {
    match canonical {
${branchArms}
        _ => &[],
    }
}
`
}

function ensureDir(p) {
  if (!existsSync(p)) {
    mkdirSync(p, { recursive: true })
  }
}

function main() {
  const m = loadManifest()

  const registryDir = join(root, "lib", "features", "bmxt-core", "registry")
  ensureDir(registryDir)

  writeFileSync(
    join(registryDir, "table.gen.ts"),
    emitTsRegistryTable(m.commands),
    "utf8"
  )

  const dispatchPath = join(
    root,
    "lib",
    "features",
    "dispatch",
    "handlers",
    "apply-dispatch.gen.ts"
  )
  writeFileSync(dispatchPath, emitTsApplyDispatch(m.effects), "utf8")

  writeFileSync(
    join(root, "lib", "features", "dispatch", "effect-types.ts"),
    emitTsEffectTypes(m.effects),
    "utf8"
  )

  writeFileSync(
    join(root, "lib", "features", "builtin-commands", "completion-fallback.ts"),
    emitCompletionFallback(m.commands),
    "utf8"
  )

  writeFileSync(
    join(root, "lib", "features", "builtin-commands", "command-subcommands.gen.ts"),
    emitTsCommandSubcommands(m.commands),
    "utf8"
  )

  const rustGeneratedDir = join(root, "crates", "bmxt-core", "src", "generated")
  ensureDir(rustGeneratedDir)
  writeFileSync(
    join(rustGeneratedDir, "chrome_effect.rs"),
    emitRustChromeEffect(m.effects),
    "utf8"
  )
  writeFileSync(
    join(rustGeneratedDir, "registry_table.rs"),
    emitRustRegistryTable(m.commands),
    "utf8"
  )

  writeFileSync(
    join(root, "lib", "features", "dispatch", "ui-action-types.ts"),
    emitTsUiActionTypes(),
    "utf8"
  )

  console.log(
    "codegen ok: registry/table.gen.ts, effect-types, ui-action-types, apply-dispatch.gen, completion-fallback, command-subcommands.gen.ts, crates/bmxt-core/src/generated/{chrome_effect,registry_table}.rs"
  )
}

main()
