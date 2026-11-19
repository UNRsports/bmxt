/**
 * EN: Loopback-only fetch for the CLI localhost listener (todo §11).
 *     Call sites must stay under handshake/localhost/; check:no-fetch allowlists this dir.
 * JA: CLI localhost 待ち受け専用の loopback fetch（todo §11）。
 *     呼び出しは handshake/localhost/ 内のみ。check:no-fetch がこのディレクトリを許可。
 */

import { LOCALHOST_DOOR_BASE_URL, LOCALHOST_DOOR_ORIGINS } from "./door-constants.ts"

function assertDoorUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error("invalid door URL")
  }
  const origin = parsed.origin
  if (!(LOCALHOST_DOOR_ORIGINS as readonly string[]).includes(origin)) {
    throw new Error(`refusing non-door origin: ${origin}`)
  }
  if (parsed.protocol !== "http:") {
    throw new Error("door URL must be http")
  }
}

/**
 * EN: fetch() restricted to the BMXt localhost listener origins.
 * JA: BMXt localhost 待ち受けオリジンに限定した fetch()。
 */
export async function doorFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${LOCALHOST_DOOR_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  assertDoorUrl(url)
  return fetch(url, {
    ...init,
    // EN: Never send credentials; listener is loopback + Family membership auth.
    credentials: "omit",
    cache: "no-store"
  })
}
