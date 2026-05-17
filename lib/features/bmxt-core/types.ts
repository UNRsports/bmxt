import type { ChromeEffect } from "../dispatch/effect-types"

export type CmdMeta = {
  readonly name: string
  readonly aliases: readonly string[]
  readonly usagePrimary: string
}

export type DispatchJson =
  | { ty: "lines"; lines: string[] }
  | { ty: "effects"; effects: ChromeEffect[] }

export function linesDispatch(lines: string[]): DispatchJson {
  return { ty: "lines", lines }
}

export function effectsDispatch(effects: ChromeEffect[]): DispatchJson {
  return { ty: "effects", effects }
}
