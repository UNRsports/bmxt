import { compactInviteToken } from "../discovery/invite-codec.ts"
import {
  compactRtcHandshakeCode,
  RTC_HANDSHAKE_PREFIX
} from "../discovery/rtc-handshake-codec.ts"

const INVITE_PREFIX = "bmxt1."
const MAX_INVITE_CHARS = 8_192
const MAX_RTC_CODE_CHARS = 48_000

export type SyncSetupStep =
  | "family"
  | "joinInvite"
  | "role"
  | "pasteOffer"
  | "pasteAnswer"

export type SyncSetupPending = {
  step: SyncSetupStep
  hasFamily: boolean
}

export type SyncSetupFamilyChoice = "create" | "join" | "continue" | "cancel" | "invalid"
export type SyncSetupRoleChoice = "offer" | "answer" | "cancel" | "invalid"

export type SyncSetupPasteResult =
  | { kind: "cancel" }
  | { kind: "invalid" }
  | { kind: "value"; value: string }

function normalizeChoice(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isSyncSetupCancel(raw: string): boolean {
  const n = normalizeChoice(raw)
  return (
    n === "cancel" ||
    n === "abort" ||
    n === "n" ||
    n === "no" ||
    n === "q" ||
    n === "quit" ||
    n === "キャンセル" ||
    n === "中止"
  )
}

export function parseSyncSetupFamilyChoice(
  raw: string,
  hasFamily: boolean
): SyncSetupFamilyChoice {
  if (isSyncSetupCancel(raw)) {
    return "cancel"
  }
  const n = normalizeChoice(raw)
  if (n === "1" || n === "create" || n === "c" || n === "作成" || n === "新規") {
    return "create"
  }
  if (n === "2" || n === "join" || n === "j" || n === "参加") {
    return "join"
  }
  if (
    hasFamily &&
    (n === "3" || n === "continue" || n === "ok" || n === "続行" || n === "このまま")
  ) {
    return "continue"
  }
  return "invalid"
}

export function parseSyncSetupRoleChoice(raw: string): SyncSetupRoleChoice {
  if (isSyncSetupCancel(raw)) {
    return "cancel"
  }
  const n = normalizeChoice(raw)
  if (n === "1" || n === "offer" || n === "o" || n === "開始" || n === "オファー") {
    return "offer"
  }
  if (
    n === "2" ||
    n === "answer" ||
    n === "a" ||
    n === "receive" ||
    n === "受け取り" ||
    n === "アンサー"
  ) {
    return "answer"
  }
  return "invalid"
}

export function parseSyncSetupInvitePaste(raw: string): SyncSetupPasteResult {
  if (isSyncSetupCancel(raw)) {
    return { kind: "cancel" }
  }
  const compact = compactInviteToken(raw)
  if (compact.length < 16 || compact.length > MAX_INVITE_CHARS) {
    return { kind: "invalid" }
  }
  if (!compact.startsWith(INVITE_PREFIX)) {
    return { kind: "invalid" }
  }
  return { kind: "value", value: compact }
}

export function parseSyncSetupRtcPaste(raw: string): SyncSetupPasteResult {
  if (isSyncSetupCancel(raw)) {
    return { kind: "cancel" }
  }
  const compact = compactRtcHandshakeCode(raw)
  if (compact.length < 16 || compact.length > MAX_RTC_CODE_CHARS) {
    return { kind: "invalid" }
  }
  if (!compact.startsWith(RTC_HANDSHAKE_PREFIX)) {
    return { kind: "invalid" }
  }
  return { kind: "value", value: compact }
}
