/** EN: Shared device-scope flags for tab/search -list (local routing only). */

export type DeviceListScope =
  | { kind: "local" }
  | { kind: "device"; deviceId: string }
  | { kind: "peers" }

export type ParseDeviceScopeResult =
  | { ok: true; scope: DeviceListScope; rest: string[] }
  | { ok: false; reason: "conflict" | "missing_device_id" | "empty_device_id" }

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

/**
 * EN: Pull `--device <id>` / `--peers` from trailing tokens. Remaining tokens returned as `rest`.
 * JA: 末尾トークンから `--device` / `--peers` を抜き、残りを `rest` で返す。
 */
export function parseDeviceListScopeTokens(tokens: readonly string[]): ParseDeviceScopeResult {
  let scope: DeviceListScope = { kind: "local" }
  let sawDevice = false
  let sawPeers = false
  const rest: string[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const raw = tokens[index]!
    const token = normalizeToken(raw)
    if (token === "--peers") {
      if (sawDevice || sawPeers) {
        return { ok: false, reason: "conflict" }
      }
      sawPeers = true
      scope = { kind: "peers" }
      continue
    }
    if (token === "--device") {
      if (sawDevice || sawPeers) {
        return { ok: false, reason: "conflict" }
      }
      const next = tokens[index + 1]
      if (next === undefined) {
        return { ok: false, reason: "missing_device_id" }
      }
      const deviceId = next.trim()
      if (deviceId.length === 0 || deviceId.startsWith("-")) {
        return { ok: false, reason: "empty_device_id" }
      }
      sawDevice = true
      scope = { kind: "device", deviceId }
      index += 1
      continue
    }
    rest.push(raw)
  }

  return { ok: true, scope, rest }
}

/** EN: Strip `--device` / `--peers` from a search -list dispatch line for peer RPC. */
export function stripDeviceScopeFromSearchDispatchLine(dispatchLine: string): string {
  const parts = dispatchLine.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return dispatchLine.trim()
  }
  const head = parts.slice(0, 2)
  const parsed = parseDeviceListScopeTokens(parts.slice(2))
  if (!parsed.ok) {
    return dispatchLine.trim()
  }
  return [...head, ...parsed.rest].join(" ")
}
