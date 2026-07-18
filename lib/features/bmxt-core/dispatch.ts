import type { DispatchBundle } from "../dispatch"
import { getRunLocale, setRunLocale } from "../setting/i18n/run-locale"
import type { UiLocale } from "../setting/locale"
import { expandDispatchMsgs } from "./expand-msgs"
import { isBmxtCoreReady, wasmRun } from "./wasm-host"

function normalizeBundle(bundle: DispatchBundle, locale: UiLocale): DispatchBundle {
  if (bundle.ty === "msgs") {
    return {
      ty: "lines",
      lines: expandDispatchMsgs(bundle.msgs ?? [], locale)
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
      return { ty: "msgs", msgs: o.msgs ?? [] }
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

export function runDispatch(line: string, locale?: UiLocale): DispatchBundle {
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
    return normalizeBundle(bundle, loc)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ty: "lines",
      lines: [
        `error: dispatch failed (${msg})`,
        "Reload the BMXt window / extension if this persists."
      ]
    }
  }
}
