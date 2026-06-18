import type { DispatchBundle } from "../dispatch"
import { isSecondToken } from "../builtin-commands/command-subcommands.gen"
import { setRunLocale } from "../setting/i18n/run-locale"
import type { UiLocale } from "../setting/locale"
import { parseHttpUrlCandidate, tokenize } from "./line-parse"
import type { DispatchJson } from "./types"
import { effectsDispatch, linesDispatch } from "./types"
import { resolveCanonical, runCommand } from "./registry"

function dispatchJsonString(out: DispatchJson): string {
  return JSON.stringify(out)
}

function tryUrlLine(trimmed: string): DispatchJson | null {
  const nwSuffixes = [" -nw", " -nW", " -Nw", " -NW"] as const
  for (const suf of nwSuffixes) {
    if (trimmed.endsWith(suf)) {
      const inner = trimmed.slice(0, -suf.length).trimEnd()
      const url = parseHttpUrlCandidate(inner)
      if (url) {
        return effectsDispatch([{ kind: "open_url_new_window", url }])
      }
    }
  }
  if (trimmed.endsWith(" .")) {
    const inner = trimmed.slice(0, -2).trimEnd()
    const url = parseHttpUrlCandidate(inner)
    if (url) {
      return effectsDispatch([{ kind: "navigate_current_tab", url }])
    }
  }
  if (!/\s/.test(trimmed)) {
    const url = parseHttpUrlCandidate(trimmed)
    if (url) {
      return effectsDispatch([{ kind: "open_url_new_tab", url }])
    }
  }
  return null
}

export function dispatchFull(line: string, locale?: UiLocale): string {
  if (locale !== undefined) {
    setRunLocale(locale)
  }
  const trimmed = line.trim()
  if (!trimmed) {
    return dispatchJsonString(linesDispatch([]))
  }
  const urlOut = tryUrlLine(trimmed)
  if (urlOut) {
    return dispatchJsonString(urlOut)
  }
  const args = tokenize(trimmed)
  if (args.length === 0) {
    return dispatchJsonString(linesDispatch([]))
  }
  const cmdToken = args[0].toLowerCase()
  const canonical = resolveCanonical(cmdToken)
  if (!canonical) {
    return dispatchJsonString(
      linesDispatch([`unknown command: ${cmdToken}. Type help.`])
    )
  }
  const out = runCommand(canonical, args)
  return dispatchJsonString(out)
}

export function parseDispatchJson(raw: string): DispatchBundle {
  const o = JSON.parse(raw) as DispatchBundle
  if (o.ty === "lines") {
    return { ty: "lines", lines: o.lines ?? [] }
  }
  if (o.ty === "effects") {
    return { ty: "effects", effects: o.effects ?? [] }
  }
  throw new Error(`BMXt: unknown dispatch ty ${(o as { ty?: string }).ty}`)
}

export function runDispatch(line: string, locale?: UiLocale): DispatchBundle {
  try {
    return parseDispatchJson(dispatchFull(line, locale))
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
