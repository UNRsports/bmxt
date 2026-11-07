import type { SyncWorkdirConfig } from "../types"
import { SYNC_WORKDIR_CONFIG_KEY } from "./storage-keys"

const DEFAULT_CONFIG: SyncWorkdirConfig = {
  enabled: false,
  paused: false,
  directoryName: null,
  lastPullAt: null,
  lastPushAt: null
}

function normalizeConfig(raw: unknown): SyncWorkdirConfig {
  if (raw === null || typeof raw !== "object") {
    return { ...DEFAULT_CONFIG }
  }
  const o = raw as Record<string, unknown>
  return {
    enabled: o.enabled === true,
    paused: o.paused === true,
    directoryName: typeof o.directoryName === "string" ? o.directoryName : null,
    lastPullAt: typeof o.lastPullAt === "string" ? o.lastPullAt : null,
    lastPushAt: typeof o.lastPushAt === "string" ? o.lastPushAt : null
  }
}

export async function loadSyncWorkdirConfig(): Promise<SyncWorkdirConfig> {
  const stored = await chrome.storage.local.get(SYNC_WORKDIR_CONFIG_KEY)
  return normalizeConfig(stored[SYNC_WORKDIR_CONFIG_KEY])
}

export async function saveSyncWorkdirConfig(config: SyncWorkdirConfig): Promise<void> {
  await chrome.storage.local.set({ [SYNC_WORKDIR_CONFIG_KEY]: normalizeConfig(config) })
}
