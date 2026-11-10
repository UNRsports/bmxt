import { SYNC_HANDSHAKE_COMMAND_MESSAGE } from "../../lib/features/sync/connect/sync-handshake-protocol.ts"

/**
 * EN: Relay the handshake *copy* shortcut to open BMXt UI pages.
 * JA: 握手コード *コピー* ショートカットを開いている BMXt UI へ中継する。
 */
export function setupSyncHandshakeCommands(
  onCommand: typeof chrome.commands.onCommand
): void {
  onCommand.addListener((command) => {
    if (command !== "sync-handshake-copy") {
      return
    }
    void chrome.runtime.sendMessage({
      type: SYNC_HANDSHAKE_COMMAND_MESSAGE,
      action: "copy"
    })
  })
}
