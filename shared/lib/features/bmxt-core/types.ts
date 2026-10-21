import type { HostEffect } from "../dispatch/effect-types"

export type CmdMeta = {
  readonly name: string
  readonly aliases: readonly string[]
  readonly usagePrimary: string
}

export type DispatchJson =
  | { ty: "lines"; lines: string[] }
  | { ty: "effects"; effects: HostEffect[] }

export function linesDispatch(lines: string[]): DispatchJson {
  return { ty: "lines", lines }
}

export function effectsDispatch(effects: HostEffect[]): DispatchJson {
  return { ty: "effects", effects }
}
