import { isEnvelopeExpired } from "../crypto/family-crypto"
import type { SignalingBoxStabilizer } from "../stabilizers/signaling-box"
import type { SyncDeviceId, SyncSealedEnvelope } from "../types"
import { SYNC_COMMAND_QUEUE_DIR, SYNC_SIGNAL_DIR } from "../workdir/bundle-layout"
import {
  ensureSubdir,
  listFileNames,
  readJsonFile,
  removeFileIfExists,
  resolveWritableSyncRoot,
  writeJsonFile
} from "../workdir/fsa-io"

function envelopeFileName(envelope: SyncSealedEnvelope): string {
  const safeFrom = envelope.fromDeviceId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24)
  const safeTo = envelope.toDeviceId.replace(/[^a-zA-Z0-9_*-]/g, "").slice(0, 24)
  const stamp = Date.parse(envelope.createdAt) || Date.now()
  return `${envelope.kind}-${stamp}-${safeFrom}-${safeTo}.json`
}

function dirForKind(kind: "signal" | "command"): string {
  return kind === "signal" ? SYNC_SIGNAL_DIR : SYNC_COMMAND_QUEUE_DIR
}

export function createFsaSignalingBoxStabilizer(): SignalingBoxStabilizer {
  return {
    kind: "fsa",

    async put(envelope: SyncSealedEnvelope) {
      const root = await resolveWritableSyncRoot()
      if (root === null) {
        throw new Error("sync workdir unavailable")
      }
      const dir = await ensureSubdir(root, dirForKind(envelope.kind))
      await writeJsonFile(dir, envelopeFileName(envelope), envelope)
    },

    async listFor(toDeviceId: SyncDeviceId) {
      const root = await resolveWritableSyncRoot()
      if (root === null) {
        return []
      }
      const out: SyncSealedEnvelope[] = []
      for (const kind of ["signal", "command"] as const) {
        const dir = await ensureSubdir(root, dirForKind(kind))
        const names = await listFileNames(dir)
        for (const name of names) {
          if (!name.endsWith(".json")) {
            continue
          }
          const env = await readJsonFile<SyncSealedEnvelope>(dir, name)
          if (!env || env.version !== 1) {
            continue
          }
          if (isEnvelopeExpired(env)) {
            continue
          }
          if (env.toDeviceId !== toDeviceId && env.toDeviceId !== "*") {
            continue
          }
          out.push(env)
        }
      }
      return out
    },

    async remove(envelope: SyncSealedEnvelope) {
      const root = await resolveWritableSyncRoot()
      if (root === null) {
        return
      }
      const dir = await ensureSubdir(root, dirForKind(envelope.kind))
      await removeFileIfExists(dir, envelopeFileName(envelope))
      // EN: Also try listing match by content fields if filename drifted.
      const names = await listFileNames(dir)
      for (const name of names) {
        const env = await readJsonFile<SyncSealedEnvelope>(dir, name)
        if (
          env &&
          env.fromDeviceId === envelope.fromDeviceId &&
          env.toDeviceId === envelope.toDeviceId &&
          env.createdAt === envelope.createdAt &&
          env.ciphertextB64 === envelope.ciphertextB64
        ) {
          await removeFileIfExists(dir, name)
        }
      }
    },

    async pruneExpired() {
      const root = await resolveWritableSyncRoot()
      if (root === null) {
        return 0
      }
      let removed = 0
      for (const kind of ["signal", "command"] as const) {
        const dir = await ensureSubdir(root, dirForKind(kind))
        const names = await listFileNames(dir)
        for (const name of names) {
          const env = await readJsonFile<SyncSealedEnvelope>(dir, name)
          if (!env || isEnvelopeExpired(env)) {
            await removeFileIfExists(dir, name)
            removed += 1
          }
        }
      }
      return removed
    }
  }
}
