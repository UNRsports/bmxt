/**
 * EN: IME-style token picker — fixed tokens from WASM `complete`; host overlays for live UI.
 */

import { isBmxtCoreReady, wasmComplete } from "../bmxt-core/wasm-host.ts"
import {
  getSubcommandBranches,
  listSecondTokenCandidatesByCommand,
  listThirdTokenCandidates
} from "../builtin-commands/command-subcommands.gen.ts"
import { COMMANDS } from "../bmxt-core/registry/table.gen.ts"
import { resolveCanonical } from "../bmxt-core/registry/index.ts"
import { tHelp, type HelpMessageKey } from "../setting/i18n/ns/help"
import { tImeToken } from "../setting/i18n/ns/ime-token"
import type { UiLocale } from "../setting/locale"
import {
  matchCandidates,
  pickThirdTokenCandidates,
  resolveOptionTokenFilterModes,
  type CandidateMatchMode
} from "./ime-token-match"
import { resolveActiveCommandSegment } from "./compound/active-segment.ts"
import { resolveActivePipeStage } from "./compound/pipe-stage-spans.ts"
import { listPipeConsumerCompletionTokens } from "./pipe/consumers/completion-tokens.ts"
import {
  applyPipeContinuationCandidates,
  isPipeContinuationCandidate
} from "./pipe/pipe-continuation-candidates.ts"
import { suppressExactCompletePipeConsumerFirstPicker } from "./pipe/pipe-consumer-first-picker.ts"
import { stageLineHasPipeProducerFirstCommand } from "./pipe/pipe-producer-first.ts"
import { shouldInsertTokenPickAtCursor } from "./first-token-insert.ts"
import { wordBounds } from "../format/word-bounds.ts"
import { rankTokenCandidates } from "./token-candidate-mru.ts"
import type {
  ImeTokenPickerModel,
  ImeTokenTier,
  ResolveImeTokenPickerOptions
} from "./ime-token-picker-model.ts"
import { resolveSecondTokenPickerHit } from "./second-token-picker.ts"
import {
  resolveImeLiveOverlayResult,
  runWithImeLiveOverlayContext
} from "./ime-live-overlays.ts"

export type { CandidateMatchMode } from "./ime-token-match"
export type {
  ImeTokenPickerModel,
  ImeTokenTier,
  ResolveImeTokenPickerOptions
} from "./ime-token-picker-model.ts"

type WasmCompleteHit = {
  tokenStart: number
  tokenEnd: number
  prefix: string
  candidates: string[]
  tier: string
}

function parseWasmCompleteHit(raw: string): WasmCompleteHit | null {
  if (raw === "null" || raw.length === 0) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object") {
      return null
    }
    const o = parsed as Record<string, unknown>
    if (
      typeof o.tokenStart !== "number" ||
      typeof o.tokenEnd !== "number" ||
      typeof o.prefix !== "string" ||
      !Array.isArray(o.candidates) ||
      typeof o.tier !== "string"
    ) {
      return null
    }
    const candidates = o.candidates.filter((c): c is string => typeof c === "string")
    if (candidates.length === 0) {
      return null
    }
    return {
      tokenStart: o.tokenStart,
      tokenEnd: o.tokenEnd,
      prefix: o.prefix,
      candidates,
      tier: o.tier
    }
  } catch {
    return null
  }
}

function tierFromWasm(tier: string): ImeTokenTier | null {
  if (tier === "first" || tier === "second" || tier === "third") {
    return tier
  }
  return null
}

function applyHostFilter(
  hit: ImeTokenPickerModel,
  matchMode: CandidateMatchMode
): ImeTokenPickerModel | null {
  const filtered = matchCandidates(hit.candidates, hit.prefix, matchMode)
  if (filtered.length === 0) {
    return null
  }
  return { ...hit, candidates: filtered }
}

/** EN: All tiers — MRU (newest first), then unused A–Z. */
function finalizeCandidateOrder(hit: ImeTokenPickerModel): ImeTokenPickerModel {
  return { ...hit, candidates: rankTokenCandidates(hit.candidates) }
}

/** EN: Prefer WASM fixed-token complete; fall back to generated tables when WASM is cold. */
function resolveFixedTokenPicker(
  line: string,
  cursor: number,
  firstCommandTokens: readonly string[],
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"
  if (isBmxtCoreReady()) {
    const hit = parseWasmCompleteHit(wasmComplete(line, cursor))
    if (hit !== null) {
      const tier = tierFromWasm(hit.tier)
      if (tier !== null) {
        let model: ImeTokenPickerModel = {
          tokenStart: hit.tokenStart,
          tokenEnd: hit.tokenEnd,
          prefix: hit.prefix,
          candidates: hit.candidates,
          tier
        }
        if (tier === "first") {
          const allowEmptyFirstAll = opts?.emptyFirstPrefixShowsAll === true
          if (hit.prefix.length === 0 && !allowEmptyFirstAll) {
            return null
          }
          if (allowEmptyFirstAll && hit.prefix.length === 0) {
            const cands = matchCandidates(firstCommandTokens, "", matchMode)
            if (cands.length === 0) {
              return null
            }
            const [l, r] = wordBounds(line, cursor)
            const insertAtCursor = shouldInsertTokenPickAtCursor(line, cursor, l, r, "first")
            return {
              tokenStart: insertAtCursor ? cursor : l,
              tokenEnd: insertAtCursor ? cursor : r,
              prefix: "",
              candidates: cands,
              tier: "first"
            }
          }
          const [l, r] = wordBounds(line, cursor)
          const insertAtCursor = shouldInsertTokenPickAtCursor(line, cursor, l, r, "first")
          if (insertAtCursor) {
            model = { ...model, tokenStart: cursor, tokenEnd: cursor }
          }
        }
        if (tier === "second") {
          const secondHit = resolveSecondTokenPickerHit(line, cursor, matchMode)
          if (secondHit !== null) {
            return secondHit
          }
          // EN: Complete second with no third tokens → close menu (resolved null).
          return null
        }
        if (tier === "third" && matchMode === "contains") {
          const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
            model.candidates,
            model.prefix,
            matchMode
          )
          const cands = pickThirdTokenCandidates(
            model.candidates,
            model.prefix,
            matchMode,
            useFullCandidateList,
            filterMode
          )
          if (cands.length === 0) {
            return null
          }
          return { ...model, candidates: cands }
        }
        return applyHostFilter(model, matchMode)
      }
    }
    if (opts?.emptyFirstPrefixShowsAll === true) {
      const [l, r] = wordBounds(line, cursor)
      const tokensBefore = line.slice(0, l).trim() ? line.slice(0, l).trim().split(/\s+/) : []
      if (tokensBefore.length === 0) {
        const cands = matchCandidates(firstCommandTokens, line.slice(l, cursor), matchMode)
        if (cands.length > 0) {
          const insertAtCursor = shouldInsertTokenPickAtCursor(line, cursor, l, r, "first")
          return {
            tokenStart: insertAtCursor ? cursor : l,
            tokenEnd: insertAtCursor ? cursor : r,
            prefix: line.slice(l, cursor),
            candidates: cands,
            tier: "first"
          }
        }
      }
    }
    // EN: WASM prefix-empty None — still resolve second-token incremental filter from tables.
    const secondHit = resolveSecondTokenPickerHit(line, cursor, matchMode)
    if (secondHit !== null) {
      return secondHit
    }
    if (matchMode === "contains") {
      return resolveFixedTokenPickerFallback(line, cursor, firstCommandTokens, opts)
    }
    return null
  }
  return resolveFixedTokenPickerFallback(line, cursor, firstCommandTokens, opts)
}

function resolveFixedTokenPickerFallback(
  line: string,
  cursor: number,
  firstCommandTokens: readonly string[],
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const [l, r] = wordBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim() ? left.trim().split(/\s+/) : []
  const tokenIndex = tokensBefore.length
  const prefix = line.slice(l, cursor)
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"

  if (tokenIndex === 0) {
    const cmdWord = line.slice(l, r)
    const canonical0 = resolveCanonical(cmdWord)
    if (
      canonical0 &&
      cursor >= line.length &&
      getSubcommandBranches(canonical0).length > 0
    ) {
      const next = listSecondTokenCandidatesByCommand(canonical0, "")
      if (next.length > 0) {
        return {
          tokenStart: line.length,
          tokenEnd: line.length,
          prefix: "",
          candidates: next,
          tier: "second"
        }
      }
    }
    const allowEmptyFirstAll = opts?.emptyFirstPrefixShowsAll === true
    if (prefix.length > 0 || allowEmptyFirstAll) {
      const cands = matchCandidates(firstCommandTokens, prefix, matchMode)
      if (cands.length > 0) {
        const insertAtCursor = shouldInsertTokenPickAtCursor(line, cursor, l, r, "first")
        return {
          tokenStart: insertAtCursor ? cursor : l,
          tokenEnd: insertAtCursor ? cursor : r,
          prefix,
          candidates: cands,
          tier: "first"
        }
      }
    }
    return null
  }

  const canonical = resolveCanonical(tokensBefore[0]!)
  if (!canonical || getSubcommandBranches(canonical).length === 0) {
    return null
  }

  if (tokenIndex === 1) {
    return resolveSecondTokenPickerHit(line, cursor, matchMode)
  }

  if (tokenIndex === 2) {
    const second = tokensBefore[1]!.toLowerCase()
    const allThird = listThirdTokenCandidates(canonical, second, "")
    if (allThird.length === 0) {
      return null
    }
    const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
      allThird,
      prefix,
      matchMode
    )
    const cands = pickThirdTokenCandidates(
      allThird,
      prefix,
      matchMode,
      useFullCandidateList,
      filterMode
    )
    if (cands.length === 0) {
      return null
    }
    return { tokenStart: l, tokenEnd: r, prefix, candidates: cands, tier: "third" }
  }

  return null
}

export function imeTokenPickerHint(tier: ImeTokenTier, locale: UiLocale): string {
  switch (tier) {
    case "first":
      return tImeToken("imeToken.hint.first", locale)
    case "second":
      return tImeToken("imeToken.hint.second", locale)
    case "third":
      return tImeToken("imeToken.hint.third", locale)
  }
}

/**
 * EN: Same map as Rust `section_key_for_command` (`help_cmd.rs`) — `\<cmd\> help` manuals.
 */
const HELP_SECTION_BY_CANONICAL: Readonly<Record<string, HelpMessageKey>> = {
  tab: "help.section.tabs",
  back: "help.section.back",
  forward: "help.section.forward",
  reload: "help.section.reload",
  close: "help.section.close",
  dom: "help.section.dom",
  search: "help.section.search",
  session: "help.section.session",
  setting: "help.section.setting",
  translate: "help.section.translate"
}

function canonicalFirstName(token: string): string {
  const lower = token.toLowerCase()
  for (const entry of COMMANDS) {
    if (entry.name === lower) {
      return entry.name
    }
    for (const alias of entry.aliases) {
      if (alias.toLowerCase() === lower) {
        return entry.name
      }
    }
  }
  return lower
}

function helpSectionKeyForCommand(canonical: string): HelpMessageKey | null {
  const key = HELP_SECTION_BY_CANONICAL[canonical]
  return key ?? null
}

function tokenizeBeforePickerSlot(line: string, tokenStart: number): string[] {
  const clamped = Math.min(Math.max(0, tokenStart), Math.max(0, line.length))
  const active = resolveActiveCommandSegment(line, clamped)
  const localInSegment = Math.max(0, clamped - active.segmentStart)
  const stage = resolveActivePipeStage(active.segmentText, localInSegment)
  const stageText = active.segmentText.slice(stage.stageStart, stage.stageEnd)
  const localInStage = Math.max(0, localInSegment - stage.stageStart)
  const before = stageText.slice(0, localInStage).trim()
  if (before.length === 0) {
    return []
  }
  return before.split(/\s+/).filter((part) => part.length > 0)
}

function helpPatternTokens(patternSide: string): string[] {
  const withOptionals = patternSide.replace(/\[([^\]]*)\]/g, " $1 ")
  const withoutEllipsis = withOptionals.replace(/…/g, " ")
  const withoutOr = withoutEllipsis.replace(/\s+\|\s+/g, " ")
  return withoutOr
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function pathMatchesHelpTokens(path: readonly string[], patternTokens: readonly string[]): boolean {
  if (path.length === 0 || path.length > patternTokens.length) {
    return false
  }
  for (let i = 0; i < path.length; i += 1) {
    if (patternTokens[i]!.toLowerCase() !== path[i]!.toLowerCase()) {
      return false
    }
  }
  return true
}

/** EN: Split a help-section body line into pattern + detail (same text as `help` / `\<cmd\> help`). */
function splitHelpSectionDetailLine(
  line: string
): { pattern: string; detail: string } | null {
  const trimmed = line.trim()
  if (trimmed.length === 0) {
    return null
  }
  const em = trimmed.indexOf(" — ")
  if (em >= 0) {
    const pattern = trimmed.slice(0, em).trim()
    const detail = trimmed.slice(em + 3).trim()
    if (pattern.length === 0 || detail.length === 0) {
      return null
    }
    return { pattern, detail }
  }
  const padded = /^(.*?)\s{2,}-\s+(.+)$/.exec(trimmed)
  if (padded) {
    const pattern = padded[1]!.trim()
    const detail = padded[2]!.trim()
    if (pattern.length === 0 || detail.length === 0) {
      return null
    }
    return { pattern, detail }
  }
  const single = /^(.*?)\s+-\s+(.+)$/.exec(trimmed)
  if (single) {
    const pattern = single[1]!.trim()
    const detail = single[2]!.trim()
    if (pattern.length === 0 || detail.length === 0) {
      return null
    }
    return { pattern, detail }
  }
  return null
}

/**
 * EN: First command → full `help.section.*` text; second+ → matching body lines only.
 * JA: 第一は help 節全文、第二以降は該当行のみ（help コマンドと同じ文言）。
 */
function resolveHelpSectionTextForPath(
  path: readonly string[],
  locale: UiLocale
): string | undefined {
  if (path.length === 0) {
    return undefined
  }
  const canonical = canonicalFirstName(path[0]!)
  const sectionKey = helpSectionKeyForCommand(canonical)
  if (sectionKey === null) {
    return undefined
  }
  const section = tHelp(sectionKey, locale)
  if (section === sectionKey || section.length === 0) {
    return undefined
  }
  if (path.length === 1) {
    return section
  }
  const bodyLines = section.split("\n").slice(1)
  let bestScore = -1
  const bestLines: string[] = []
  for (const rawLine of bodyLines) {
    const split = splitHelpSectionDetailLine(rawLine)
    if (split === null) {
      continue
    }
    const tokens = helpPatternTokens(split.pattern)
    if (!pathMatchesHelpTokens(path, tokens)) {
      continue
    }
    const score = (tokens.length === path.length ? 1000 : 0) + tokens.length
    if (score > bestScore) {
      bestScore = score
      bestLines.length = 0
      bestLines.push(rawLine.trim())
    } else if (score === bestScore) {
      bestLines.push(rawLine.trim())
    }
  }
  if (bestLines.length === 0) {
    return undefined
  }
  return bestLines.join("\n")
}

function candidatePathForHelp(
  candidate: string,
  tokensBefore: readonly string[]
): string[] | null {
  const trimmed = candidate.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (isPipeContinuationCandidate(trimmed)) {
    const match = /^\|\s+(\S+)/.exec(trimmed)
    if (match === null) {
      return null
    }
    return [canonicalFirstName(match[1]!)]
  }
  if (tokensBefore.length === 0) {
    return [canonicalFirstName(trimmed)]
  }
  return [
    canonicalFirstName(tokensBefore[0]!),
    ...tokensBefore.slice(1).map((t) => t.toLowerCase()),
    trimmed.toLowerCase()
  ]
}

/**
 * EN: Mozc-style help texts from `help.section.*` (parallel to candidates; UI shows highlighted only).
 */
export function listImeCandidateHelpsFromUsage(
  candidates: readonly string[],
  line: string,
  tokenStart: number,
  locale: UiLocale
): (string | undefined)[] {
  const tokensBefore = tokenizeBeforePickerSlot(line, tokenStart)
  return candidates.map((candidate) => {
    const path = candidatePathForHelp(candidate, tokensBefore)
    if (path === null) {
      return undefined
    }
    return resolveHelpSectionTextForPath(path, locale)
  })
}

/** EN: Resolve dropdown candidates for the token under `cursor` (prefix-filtered). */
export function resolveImeTokenPicker(
  line: string,
  cursor: number,
  firstCommandTokens: readonly string[],
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const active = resolveActiveCommandSegment(line, cursor)
  const segmentLine = line.slice(active.segmentStart, active.segmentEnd)
  const pipe = resolveActivePipeStage(segmentLine, active.localCursor)
  const stageLine = segmentLine.slice(pipe.stageStart, pipe.stageEnd)
  const stageTokens =
    pipe.stageIndex >= 1 ? listPipeConsumerCompletionTokens() : firstCommandTokens
  let picked = resolveImeTokenPickerInSegment(
    stageLine,
    pipe.localCursor,
    stageTokens,
    opts
  )
  if (pipe.stageIndex === 0) {
    picked = applyPipeContinuationCandidates(picked, stageLine, pipe.localCursor, opts)
  } else {
    picked = suppressExactCompletePipeConsumerFirstPicker(
      picked,
      stageLine,
      pipe.localCursor
    )
  }
  if (!picked) {
    return null
  }
  const stageAbsStart = active.segmentStart + pipe.stageStart
  const ordered = finalizeCandidateOrder({
    ...picked,
    tokenStart: stageAbsStart + picked.tokenStart,
    tokenEnd: stageAbsStart + picked.tokenEnd
  })
  // EN: Second/third tier — first command already on the stage line.
  // First tier uses the highlighted candidate in TokenPickerPanel.
  const pipeAvailable =
    ordered.tier === "first" ? false : stageLineHasPipeProducerFirstCommand(stageLine)
  return { ...ordered, pipeAvailable }
}

function resolveImeTokenPickerInSegment(
  line: string,
  cursor: number,
  firstCommandTokens: readonly string[],
  opts?: ResolveImeTokenPickerOptions
): ImeTokenPickerModel | null {
  const matchMode: CandidateMatchMode = opts?.candidateMatch ?? "prefix"

  const wasmPick = resolveFixedTokenPicker(line, cursor, firstCommandTokens, opts)
  if (wasmPick !== null) {
    return wasmPick
  }

  const overlayResult = runWithImeLiveOverlayContext(
    {
      firstCommandTokens,
      resolveNestedSegment: (nestedLine, nestedCursor, nestedTokens, nestedOpts) =>
        resolveImeTokenPickerInSegment(nestedLine, nestedCursor, nestedTokens, nestedOpts),
      resolveFixedTokenPicker
    },
    () => resolveImeLiveOverlayResult(line, cursor, opts)
  )
  if (overlayResult.type === "suppress") {
    return null
  }
  if (overlayResult.type === "pick") {
    return overlayResult.model
  }

  if (!isBmxtCoreReady()) {
    return resolveFixedTokenPickerFallback(line, cursor, firstCommandTokens, opts)
  }
  if (matchMode === "contains") {
    return resolveFixedTokenPickerFallback(line, cursor, firstCommandTokens, opts)
  }
  return null
}
