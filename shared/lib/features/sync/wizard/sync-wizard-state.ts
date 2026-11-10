/**
 * EN: Module-level sync wizard session (setup / connect). UI subscribes; commands open it.
 * JA: sync ウィザードのセッション状態。UI が購読し、コマンドが開く。
 */

export type SyncWizardMode = "setup" | "connect"

export type SyncWizardStep =
  | "family"
  | "joinInvite"
  | "showInvite"
  | "role"
  | "showOffer"
  | "pasteOffer"
  | "showAnswer"
  | "done"

export type SyncWizardState = {
  open: boolean
  mode: SyncWizardMode
  step: SyncWizardStep
  hasFamily: boolean
  peerDisplayName: string | null
  peerDeviceId: string | null
  /** EN: Bilingual message already resolved for the current locale at set time, or a stable token. */
  banner: string | null
  busy: boolean
}

const CLOSED: SyncWizardState = {
  open: false,
  mode: "setup",
  step: "family",
  hasFamily: false,
  peerDisplayName: null,
  peerDeviceId: null,
  banner: null,
  busy: false
}

let state: SyncWizardState = { ...CLOSED }

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function getSyncWizardState(): SyncWizardState {
  return state
}

export function isSyncWizardOpen(): boolean {
  return state.open
}

export function setSyncWizardState(next: SyncWizardState): void {
  state = next
  notify()
}

export function patchSyncWizardState(patch: Partial<SyncWizardState>): void {
  state = { ...state, ...patch }
  notify()
}

export function closeSyncWizardState(): void {
  state = { ...CLOSED }
  notify()
}

export function subscribeSyncWizard(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
