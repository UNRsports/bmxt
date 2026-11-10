import type { CommandQueueStabilizer } from "../stabilizers/command-queue"
import type { SyncBusCommand, SyncDeviceId } from "../types"

/**
 * EN: In-memory command queue (no FSA). Lost on reload; online DataChannel is the path.
 * JA: メモリ上のコマンドキュー（FSA なし）。再読込で消える。本線は DataChannel。
 */
export function createMemoryCommandQueueStabilizer(): CommandQueueStabilizer {
  const byDevice = new Map<SyncDeviceId, SyncBusCommand[]>()

  return {
    async enqueue(toDeviceId, command) {
      const list = byDevice.get(toDeviceId) ?? []
      list.push(command)
      if (list.length > 64) {
        list.splice(0, list.length - 64)
      }
      byDevice.set(toDeviceId, list)
    },

    async dequeueFor(deviceId) {
      const list = byDevice.get(deviceId) ?? []
      byDevice.delete(deviceId)
      return list
    },

    async pruneExpired() {
      return 0
    }
  }
}
