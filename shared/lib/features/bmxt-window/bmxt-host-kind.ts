/**
 * EN: Which extension UI document owns in-memory session / process UI state.
 * JA: インメモリのセッション／プロセス UI を所有する拡張 UI ドキュメント種別。
 */

export type BmxtHostKind = "popup"

export type BmxtSessionClearHost = "popup" | "all"

export function isBmxtHostKind(value: unknown): value is BmxtHostKind {
  return value === "popup"
}

export function isBmxtSessionClearHost(value: unknown): value is BmxtSessionClearHost {
  return value === "all" || isBmxtHostKind(value)
}

export function sessionClearAppliesToHost(
  clearHost: BmxtSessionClearHost,
  listenerHost: BmxtHostKind
): boolean {
  return clearHost === "all" || clearHost === listenerHost
}
