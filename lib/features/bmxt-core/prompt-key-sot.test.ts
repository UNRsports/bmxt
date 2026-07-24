/**
 * EN: Grep gate — prompt-facing cmd.* key choice must go through expand-msgs (or documented hosts).
 * JA: プロンプト向け cmd.* キー選択は expand-msgs（または文書化されたホスト）経由であること。
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const root = join(import.meta.dirname, "..", "..", "..")
const featuresRoot = join(root, "lib", "features")

/** Files allowed to call tCmd for Chrome/live outcome mapping (still expand via helpers preferred). */
const ALLOWLIST_RELATIVE = new Set([
  "lib/features/bmxt-core/expand-msgs.ts",
  "lib/features/setting/i18n/ns/cmd.ts",
  "lib/features/setting/i18n/messages.ts",
  "lib/features/setting/i18n/messages.test.ts",
  // Live UI / picker state labels (host-only OK per §14.1) — not prompt grammar SoT
  "lib/features/bmxt-window/shell/apply-ui-action.ts"
])

const TCMD_CMD_RE = /tCmd\s*\(\s*["']cmd\./g

function walkTsFiles(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "wasm") {
        continue
      }
      walkTsFiles(full, out)
      continue
    }
    if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      out.push(full)
    }
  }
}

describe("prompt key SoT grep gate", () => {
  it("does not select cmd.* prompt keys via tCmd outside expand-msgs / allowlist", () => {
    const files: string[] = []
    walkTsFiles(featuresRoot, files)
    const offenders: string[] = []
    for (const file of files) {
      const rel = relative(root, file).replaceAll("\\", "/")
      if (ALLOWLIST_RELATIVE.has(rel)) {
        continue
      }
      if (rel.includes(".test.") || rel.endsWith(".gen.ts")) {
        continue
      }
      const text = readFileSync(file, "utf8")
      if (TCMD_CMD_RE.test(text)) {
        offenders.push(rel)
      }
      TCMD_CMD_RE.lastIndex = 0
    }
    assert.deepEqual(
      offenders,
      [],
      `cmd.* key choice via tCmd outside expand path:\n${offenders.join("\n")}`
    )
  })
})
