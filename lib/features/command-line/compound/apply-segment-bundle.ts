import type { DispatchBundle } from "../../dispatch/effect-types"
import { runDispatch } from "../../bmxt-core/dispatch"
import { ensureBmxtCore } from "../../bmxt-core/wasm-host"
import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types"
import { applyUiActionForSegment } from "../../bmxt-window/shell/apply-ui-action"
import { enrichHostMsgParams } from "../../bmxt-window/shell/enrich-host-msg-params"
import { setContinuationPrompt } from "../../bmxt-window/shell/command-dispatch/types"
import type { UiLocale } from "../../setting/locale"
import { segmentSuccess } from "./classify-outcome"
import type { SegmentOutcome } from "./types"

/**
 * EN: Map WASM `runDispatch` bundle to compound `SegmentOutcome` (UI actions only).
 * Returns `null` when the bundle should fall through (effects / picker_pass).
 */
export async function applySegmentBundle(
  bundle: DispatchBundle,
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  if (bundle.ty !== "ui" || !bundle.action) {
    return null
  }
  return applyUiActionForSegment(bundle.action, {
    deps,
    trimmed: segment,
    rawLine: segment,
    locale
  })
}

/** EN: Ensure WASM, dispatch one segment, return UI outcome or `null`. */
export async function dispatchSegmentUiOutcome(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<{ bundle: DispatchBundle; uiOutcome: SegmentOutcome | null }> {
  await ensureBmxtCore()
  const bundle = runDispatch(segment, locale, {
    enrichMsgs: (msgs) => enrichHostMsgParams(msgs, deps)
  })
  if (bundle.ty === "lines") {
    if (bundle.promptPrefix !== undefined && bundle.promptPrefix.length > 0) {
      setContinuationPrompt(deps, bundle.promptPrefix)
    }
    return { bundle, uiOutcome: segmentSuccess(bundle.lines ?? []) }
  }
  const uiOutcome = await applySegmentBundle(bundle, segment, deps, locale)
  return { bundle, uiOutcome }
}
