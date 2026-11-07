/** EN: Extract `--device` / `--peers` from a search -list dispatch line. */

import {
  parseDeviceListScopeTokens,
  type DeviceListScope
} from "../sync/bus/device-list-scope.ts"

export type SearchListDeviceScopeParse = {
  scope: DeviceListScope
  /** EN: Line with device-routing flags removed (safe for peer RPC / local effects). */
  peerDispatchLine: string
}

/**
 * EN: Parse device scope from `search -list …` tokens; returns null on flag conflict.
 */
export function parseSearchListDeviceScope(dispatchLine: string): SearchListDeviceScopeParse | null {
  const parts = dispatchLine.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return null
  }
  const head = parts.slice(0, 2)
  const scoped = parseDeviceListScopeTokens(parts.slice(2))
  if (!scoped.ok) {
    return null
  }
  return {
    scope: scoped.scope,
    peerDispatchLine: [...head, ...scoped.rest].join(" ")
  }
}
