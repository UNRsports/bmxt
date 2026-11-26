import type { BmxtHostKind } from "./bmxt-host-kind.ts"
import { isBmxtHostKind } from "./bmxt-host-kind.ts"

export type ExitHostAction =
  | { kind: "closePopupWindow" }
  | { kind: "exitSession" }

/**
 * EN: Infer host from the RUN_CMD sender (always popup; kept for backward compatibility).
 * JA: sender からホスト種別を推定（常にポップアップ）。後方互換のため関数は維持。
 */
export function inferHostKindFromSender(
  _sender?: chrome.runtime.MessageSender
): BmxtHostKind {
  return "popup"
}

export function resolveHostKindForExit(
  hostKindRaw: unknown,
  _sender?: chrome.runtime.MessageSender
): BmxtHostKind {
  if (isBmxtHostKind(hostKindRaw)) {
    return hostKindRaw
  }
  return "popup"
}

/**
 * EN: Last session always closes the BMXt popup window.
 * JA: 最終セッションは常にポップアップ窓を閉じる。
 */
export function resolveExitHostAction(args: {
  hostKind: BmxtHostKind
  sessionOrderLength: number
  senderTabId?: number
}): ExitHostAction {
  if (args.sessionOrderLength > 1) {
    return { kind: "exitSession" }
  }
  return { kind: "closePopupWindow" }
}
