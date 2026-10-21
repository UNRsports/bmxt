/**
 * EN: Closed inter-command vocabulary — channels commands use to talk without knowing each other.
 * JA: 閉じたコマンド間語彙 — コマンド同士が相手実装を知らずに連絡する経路。
 *
 * Host IR version: **bmxt-host/2** (generic UiAction primitives; command names are not host semantics).
 * Compatibility: WASM emits only catalog kinds from `manifest/bmxt-codegen.json` (`effects[]`, `uiActions[]`).
 * Extending a catalog requires codegen + a thin TS executor; new *commands* that reuse catalogs need Rust only.
 *
 * Layers (do not bypass with ad-hoc command-name coupling):
 * 1. DispatchBundle — Rust → host (lines | effects | ui | msgs)
 * 2. ListResult (bmxt-list/1) — plain `-list` / picker projection
 * 3. BmxtRuleStream (bmxt-rule/1) — pipe `|` stage handoff
 * 4. Compound exit status — `&&` / `||` / `;` sequencing
 *
 * Grep policy (TS host): codegen switches, i18n keys, and executor ids (`list_id` / effect `kind` /
 * overlay id) may appear. Canonical command-name semantic branches are forbidden (`pnpm run verify:host-blind`).
 */

import type { ListRecordKind } from "../list-output/types.ts"

/** EN: Host Instruction Set contract id (documentation / verify). */
export const BMXT_HOST_IR_VERSION = "bmxt-host/2" as const

/** EN: Host-visible bundle channels from WASM `run` / `classify`. */
export const DISPATCH_BUNDLE_CHANNELS = ["lines", "effects", "ui", "msgs"] as const

export type DispatchBundleChannel = (typeof DISPATCH_BUNDLE_CHANNELS)[number]

/**
 * EN: Static map from plain-list record kinds to bmxtRule kinds (pipe handoff).
 * `search.hit` is dynamic (see `bmxtRuleKindForSearchHitSource`).
 */
export const LIST_KIND_TO_BMXT_RULE_KIND = {
  "tabs.tab": "page.open",
  "tabs.window": "page.window",
  "tabs.group": "page.group",
  "dom.node": "dom.node",
  "dom.notice": "dom.notice",
  "session.row": "session.row",
  "setting.field": "setting.field",
  "search.hit": "search.hit"
} as const satisfies Record<ListRecordKind, string>

export type StaticListKind = Exclude<ListRecordKind, "search.hit">

/** EN: Resolve bmxtRule kind for a `search.hit` ListRecord `source` field. */
export function bmxtRuleKindForSearchHitSource(source: string): string {
  const normalized = source.toLowerCase()
  if (normalized.includes("bookmark")) {
    return "bookmark"
  }
  if (normalized.includes("history")) {
    return "history"
  }
  if (normalized.includes("snapshot")) {
    return "markdown.file"
  }
  if (normalized.includes("page") || normalized.includes("tab")) {
    return "page.open"
  }
  return "search.hit"
}

/**
 * EN: Prefer reusing an existing vocabulary entry when adding a command.
 * JA: 新コマンド追加時は既存語彙の再利用を優先する。
 */
export type CommandAddPath =
  | "reuse-effects"
  | "reuse-ui-action"
  | "reuse-list-kinds"
  | "extend-effect"
  | "extend-ui-action"
  | "extend-list-and-rule"
  | "extend-pipe-consumer"

/**
 * EN: Decision hints for scaffold / docs (not runtime dispatch).
 * Prefer earlier paths; only extend closed vocabularies when reuse is impossible.
 */
export function preferredCommandAddPath(options: {
  needsChromeApi: boolean
  needsUiOnly: boolean
  producesList: boolean
  consumesPipe: boolean
  existingEffectCovers: boolean
  existingUiActionCovers: boolean
  existingListKindsCover: boolean
  existingConsumerCovers: boolean
}): CommandAddPath {
  if (options.consumesPipe) {
    return options.existingConsumerCovers ? "reuse-list-kinds" : "extend-pipe-consumer"
  }
  if (options.producesList) {
    return options.existingListKindsCover ? "reuse-list-kinds" : "extend-list-and-rule"
  }
  if (options.needsUiOnly) {
    return options.existingUiActionCovers ? "reuse-ui-action" : "extend-ui-action"
  }
  if (options.needsChromeApi) {
    return options.existingEffectCovers ? "reuse-effects" : "extend-effect"
  }
  return "reuse-effects"
}
