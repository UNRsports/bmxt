import type { BmxtHostKind } from "./bmxt-host-kind.ts"
import { isBmxtHostKind } from "./bmxt-host-kind.ts"

export type ExitHostAction =
  | { kind: "closePopupWindow" }
  | { kind: "hideFloat"; tabId: number | undefined }
  | { kind: "exitSession" }

/**
 * EN: Infer host from the RUN_CMD sender when the UI omits `hostKind`.
 * JA: UI が `hostKind` を付けない場合の sender 推定（フロート iframe）。
 */
export function inferHostKindFromSender(
  sender?: chrome.runtime.MessageSender
): BmxtHostKind {
  const url = typeof sender?.url === "string" ? sender.url : ""
  if (url.includes("bmxt-float.html")) {
    return "float"
  }
  return "popup"
}

export function resolveHostKindForExit(
  hostKindRaw: unknown,
  sender?: chrome.runtime.MessageSender
): BmxtHostKind {
  if (isBmxtHostKind(hostKindRaw)) {
    return hostKindRaw
  }
  return inferHostKindFromSender(sender)
}

/**
 * EN: Popup last-session exit closes the BMXt window; float only hides the in-page prompt.
 * JA: ポップアップは窓を閉じる。サイト上フロートはプロンプト非表示のみ（ブラウザ窓は閉じない）。
 */
export function resolveExitHostAction(args: {
  hostKind: BmxtHostKind
  sessionOrderLength: number
  senderTabId?: number
}): ExitHostAction {
  if (args.sessionOrderLength > 1) {
    return { kind: "exitSession" }
  }
  if (args.hostKind === "float") {
    return { kind: "hideFloat", tabId: args.senderTabId }
  }
  return { kind: "closePopupWindow" }
}
