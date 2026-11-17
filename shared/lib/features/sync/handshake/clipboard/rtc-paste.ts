/**
 * EN: Clipboard / text-paste parsing for Family-sealed RTC handshake codes.
 * JA: Family 封印 RTC 握手コードの clipboard／テキスト貼付パース。
 */

import {
  compactRtcHandshakeCode,
  RTC_HANDSHAKE_PREFIX
} from "../common/rtc-handshake-codec.ts"
import { isSyncSetupCancel, type SyncSetupPasteResult } from "../../setup/sync-setup-pending.ts"

const MAX_RTC_CODE_CHARS = 48_000

/**
 * EN: Accept bare `bmxt-rtc1.…` or a CLI line such as `sync -accept bmxt-rtc1.…`
 *     (whitespace is stripped; the first handshake prefix wins).
 * JA: 素の `bmxt-rtc1.…` でも `sync -accept bmxt-rtc1.…` のような CLI 行でも受理する
 *     （空白除去後、最初の握手プレフィックスから採取）。
 */
export function parseSyncSetupRtcPaste(raw: string): SyncSetupPasteResult {
  if (isSyncSetupCancel(raw)) {
    return { kind: "cancel" }
  }
  const compact = compactRtcHandshakeCode(raw)
  const prefixAt = compact.indexOf(RTC_HANDSHAKE_PREFIX)
  if (prefixAt < 0) {
    return { kind: "invalid" }
  }
  const code = compact.slice(prefixAt)
  if (code.length < 16 || code.length > MAX_RTC_CODE_CHARS) {
    return { kind: "invalid" }
  }
  return { kind: "value", value: code }
}
