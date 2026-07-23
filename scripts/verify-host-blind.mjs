#!/usr/bin/env node
/**
 * EN: Gate — TypeScript host must not branch on command canonical names for semantics.
 * Allowed: codegen switches, i18n catalogs, executor ids (list_id / effect kind / overlay id),
 * and a small allowlist of structural references.
 *
 * JA: TS ホストがコマンド canonical 名で意味分岐しないことのゲート。
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const root = join(__dirname, "..")
const featuresRoot = join(root, "lib", "features")

/** EN: Paths relative to lib/features that may mention command tokens (generated / catalogs / parsers used as data). */
const ALLOW_PATH_PREFIXES = [
  "setting/i18n/",
  "builtin-commands/",
  "bmxt-core/registry/",
  "dispatch/effect-types.ts",
  "dispatch/ui-action-types.ts",
  "dispatch/handlers/apply-dispatch.gen.ts",
  "dispatch/handlers/effects/",
  // List option parsers remain as list_id-keyed data builders (not Enter command routers).
  "tabs/tabs-list-parse.ts",
  "dom/dom-list-parse.ts",
  "dom/dom-list-picker-parse.ts",
  "dom/parse-dom-list-args.ts",
  "dom/parse-dom-setting-command.ts",
  "search/search-list-parse.ts",
  "search/search-list-picker-input.ts",
  "session/session-list-parse.ts",
  "setting/setting-list-parse.ts",
  "command-line/list-commands/",
  "command-line/ime-live-overlays.ts",
  "picker/list-producers.ts",
  "picker/match.ts",
  "picker/usage.ts",
  "picker/run-picker-command.ts"
]

/**
 * EN: Suspicious patterns: semantic if/switch on known first-command tokens.
 * JA: 第一コマンド名での意味分岐を疑うパターン。
 */
const SUSPICIOUS = [
  /\btrimmed\s*(?:===|==)\s*["'](?:help|\?|clear)["']/,
  /\btoLowerCase\(\)\s*(?:===|==)\s*["']clear["']/,
  /resolveCanonical\([^)]+\)\s*===\s*["'](?:browse|dom|search|tab|setting|session|translate)["']/,
  /tokensBefore\[0\].*===\s*["']dom["']/,
  /\/\^\\s\*\(close\|c\)\\s\*\$\/i/
]

function isAllowed(relPosix) {
  return ALLOW_PATH_PREFIXES.some(
    (p) => relPosix === p || relPosix.startsWith(p) || relPosix.endsWith(p)
  )
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.endsWith(".test.ts") || name.endsWith(".test.tsx")) {
      continue
    }
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      walk(p, out)
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      out.push(p)
    }
  }
}

const files = []
walk(featuresRoot, files)
files.push(join(root, "entrypoints", "background", "background-services.ts"))

const hits = []
for (const file of files) {
  const rel = relative(root, file).split("\\").join("/")
  const relFeatures = rel.startsWith("lib/features/")
    ? rel.slice("lib/features/".length)
    : rel
  if (rel.startsWith("lib/features/") && isAllowed(relFeatures)) {
    continue
  }
  const text = readFileSync(file, "utf8")
  for (const re of SUSPICIOUS) {
    if (re.test(text)) {
      hits.push(`${rel} matches ${re}`)
    }
  }
}

if (hits.length > 0) {
  console.error("verify-host-blind: forbidden command-name semantic branches:\n" + hits.join("\n"))
  process.exit(1)
}

console.log("verify-host-blind: ok")
