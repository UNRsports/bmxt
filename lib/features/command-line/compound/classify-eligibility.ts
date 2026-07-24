import { isBmxtCoreReady, wasmCompoundSegmentEligibility } from "../../bmxt-core/wasm-host.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { tCompound } from "../../setting/i18n/ns/compound.ts"
import type { SegmentOutcome } from "./types.ts"
import { segmentFailure } from "./classify-outcome.ts"

export type CompoundEligibility =
  | { eligible: true }
  | { eligible: false; outcome: SegmentOutcome }

type WasmEligibilityKind = "eligible" | "continuation" | "interactive" | "empty"

function parseEligibilityKind(raw: string): WasmEligibilityKind {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object") {
      return "eligible"
    }
    const kind = (parsed as { kind?: unknown }).kind
    if (
      kind === "eligible" ||
      kind === "continuation" ||
      kind === "interactive" ||
      kind === "empty"
    ) {
      return kind
    }
  } catch {
    /* fall through */
  }
  return "eligible"
}

/** EN: Reject continuation / interactive segments inside a compound line (WASM SoT). */
export function classifyCompoundEligibility(
  segment: string,
  locale: UiLocale,
  sessionNameTyping: boolean
): CompoundEligibility {
  if (sessionNameTyping) {
    return {
      eligible: false,
      outcome: segmentFailure("interactive", [
        tCompound("compound.error.interactive", locale)
      ])
    }
  }

  const trimmed = segment.trim()
  if (trimmed.length === 0) {
    return {
      eligible: false,
      outcome: segmentFailure("parse", [tCompound("compound.error.emptySegment", locale)])
    }
  }

  if (!isBmxtCoreReady()) {
    throw new Error(
      "BMXt core WASM not initialized; call ensureBmxtCore() before classifyCompoundEligibility"
    )
  }

  const kind = parseEligibilityKind(wasmCompoundSegmentEligibility(trimmed))
  if (kind === "empty") {
    return {
      eligible: false,
      outcome: segmentFailure("parse", [tCompound("compound.error.emptySegment", locale)])
    }
  }
  if (kind === "continuation") {
    return continuationFailure(trimmed, locale)
  }
  if (kind === "interactive") {
    return interactiveFailure(locale)
  }
  return { eligible: true }
}

function continuationFailure(segment: string, locale: UiLocale): CompoundEligibility {
  return {
    eligible: false,
    outcome: segmentFailure("continuation", [
      tCompound("compound.error.continuation", locale, { segment })
    ])
  }
}

function interactiveFailure(locale: UiLocale): CompoundEligibility {
  return {
    eligible: false,
    outcome: segmentFailure("interactive", [tCompound("compound.error.interactive", locale)])
  }
}
