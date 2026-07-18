import type { DispatchBundle, DispatchMsg } from "../dispatch"
import { getRunLocale, setRunLocale } from "../setting/i18n/run-locale"
import { tError } from "../setting/i18n/ns/error"
import type { UiLocale } from "../setting/locale"
import { expandDispatchMsgs } from "./expand-msgs"
import { isBmxtCoreReady, wasmRun } from "./wasm-host"

export type RunDispatchOptions = {
  /** EN: Optional enrichment of msgs params (host live state) before expand. */
  enrichMsgs?: (msgs: DispatchMsg[]) => DispatchMsg[]
}

function normalizeBundle(
  bundle: DispatchBundle,
  locale: UiLocale,
  enrichMsgs?: (msgs: DispatchMsg[]) => DispatchMsg[]
): DispatchBundle {
  if (bundle.ty === "msgs") {
    const rawMsgs = bundle.msgs ?? []
    const msgs = enrichMsgs ? enrichMsgs(rawMsgs) : rawMsgs
    return {
      ty: "lines",
      lines: expandDispatchMsgs(msgs, locale),
      promptPrefix: bundle.promptPrefix
    }
  }
  return bundle
}

export function parseDispatchJson(raw: string): DispatchBundle {
  const o = JSON.parse(raw) as DispatchBundle
  switch (o.ty) {
    case "lines":
      return { ty: "lines", lines: o.lines ?? [] }
    case "effects":
      return { ty: "effects", effects: o.effects ?? [] }
    case "ui":
      return { ty: "ui", action: o.action ?? { kind: "picker_pass" } }
    case "msgs":
      return {
        ty: "msgs",
        msgs: o.msgs ?? [],
        promptPrefix: o.promptPrefix
      }
    default:
      throw new Error(`BMXt: unknown dispatch ty ${(o as { ty?: string }).ty}`)
  }
}

export function dispatchFull(line: string, locale?: UiLocale): string {
  if (!isBmxtCoreReady()) {
    throw new Error("BMXt core WASM not initialized; call ensureBmxtCore() first")
  }
  const loc = locale ?? getRunLocale()
  if (locale !== undefined) {
    setRunLocale(locale)
  }
  return wasmRun(line, loc)
}

export function runDispatch(
  line: string,
  locale?: UiLocale,
  options?: RunDispatchOptions
): DispatchBundle {
  if (!isBmxtCoreReady()) {
    throw new Error("BMXt core WASM not initialized; call ensureBmxtCore() first")
  }
  const loc = locale ?? getRunLocale()
  if (locale !== undefined) {
    setRunLocale(locale)
  }
  try {
    const raw = wasmRun(line, loc)
    const bundle = parseDispatchJson(raw)
    return normalizeBundle(bundle, loc, options?.enrichMsgs)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      ty: "lines",
      lines: [
        tError("error.dispatchFailed", loc, { message }),
        tError("error.reloadHint", loc)
      ]
    }
  }
}
