#!/usr/bin/env node
/**
 * EN: Ensure working-tree codegen outputs match `manifest/bmxt-codegen.json`.
 *     Does not use git — safe before `git add` / commit.
 * JA: 作業ツリー上の生成物がマニフェストと一致するか確認する。
 *     git 非依存のため `git add` / commit 前でも検証できる。
 *
 * Usage: pnpm run check:generated
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  collectGeneratedOutputs,
  loadManifest,
  repoRoot
} from "./codegen/run.mjs"

function main() {
  const m = loadManifest()
  const outputs = collectGeneratedOutputs(m)
  const stale = []

  for (const { relPath, content } of outputs) {
    const abs = join(repoRoot, relPath)
    if (!existsSync(abs)) {
      stale.push(`${relPath} (missing)`)
      continue
    }
    const onDisk = readFileSync(abs, "utf8")
    if (onDisk !== content) {
      stale.push(relPath)
    }
  }

  if (stale.length > 0) {
    console.error(
      "check:generated: working tree is out of date with manifest/bmxt-codegen.json:\n  " +
        stale.join("\n  ") +
        "\nRun `pnpm run codegen` and re-check (git add is not required)."
    )
    process.exit(1)
  }

  console.log(`check:generated ok (${outputs.length} files match codegen)`)
}

main()
