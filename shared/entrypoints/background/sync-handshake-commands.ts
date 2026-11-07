import {
  SYNC_HANDSHAKE_COMMAND_MESSAGE,
  type SyncHandshakeCommandAction
} from "../../lib/features/sync/connect/sync-handshake-protocol.ts"

function broadcastHandshakeAction(action: SyncHandshakeCommandAction): void {
  void chrome.runtime.sendMessage({
    type: SYNC_HANDSHAKE_COMMAND_MESSAGE,
    action
  })
}

/**
 * EN: Relay manifest handshake shortcuts to open BMXt UI pages (copy / paste apply).
 * JA: 握手コピペ用ショートカットを開いている BMXt UI へ中継する。
 */
export function setupSyncHandshakeCommands(
  onCommand: typeof chrome.commands.onCommand
): void {
  onCommand.addListener((command) => {
    if (command === "sync-handshake-copy") {
      broadcastHandshakeAction("copy")
      return
    }
    if (command === "sync-handshake-paste") {
      broadcastHandshakeAction("paste")
    }
  })
}
