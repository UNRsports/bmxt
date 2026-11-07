/**
 * EN: SW → UI message for the manifest handshake *copy* shortcut.
 * JA: 握手コード *コピー* 用 manifest command の SW→UI 通知。
 */

export const SYNC_HANDSHAKE_COMMAND_MESSAGE = "BMXT_SYNC_HANDSHAKE_COMMAND" as const

export type SyncHandshakeCommandAction = "copy"

export type SyncHandshakeCommandMessage = {
  type: typeof SYNC_HANDSHAKE_COMMAND_MESSAGE
  action: SyncHandshakeCommandAction
}

export function isSyncHandshakeCommandMessage(
  value: unknown
): value is SyncHandshakeCommandMessage {
  if (value === null || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  if (o.type !== SYNC_HANDSHAKE_COMMAND_MESSAGE) {
    return false
  }
  return o.action === "copy"
}
