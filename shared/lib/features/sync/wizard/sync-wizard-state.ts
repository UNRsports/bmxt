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

/** EN: Manual token exchange path chosen in the wizard (null = not chosen yet). */
export type SyncWizardHandshakeTransport = "clipboard" | "file" | null

/** EN: Banner presentation — warning is used for invalid tokens and hard failures. */
export type SyncWizardBannerKind = "info" | "warning"

export type SyncWizardState = {
  open: boolean
  mode: SyncWizardMode
  step: SyncWizardStep
  hasFamily: boolean
  peerDisplayName: string | null
  peerDeviceId: string | null
  /** EN: Bilingual message already resolved for the current locale at set time, or a stable token. */
  banner: string | null
  /** EN: Visual/ARIA tone for `banner`. Ignored when banner is null. */
  bannerKind: SyncWizardBannerKind
  busy: boolean
  /**
   * EN: Clipboard vs file exchange. Chosen once per wizard session; null until the user picks.
   * JA: コピペ／ファイル交換。ウィザード開始ごとに選び直し（未選択は null）。
   */
  handshakeTransport: SyncWizardHandshakeTransport
}

const CLOSED: SyncWizardState = {
  open: false,
  mode: "setup",
  step: "family",
  hasFamily: false,
  peerDisplayName: null,
  peerDeviceId: null,
  banner: null,
  bannerKind: "info",
  busy: false,
  handshakeTransport: null
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

/**
 * EN: Set or clear the wizard banner. Clearing resets tone to info.
 * JA: バナーを設定／消去する。消去時は tone を info に戻す。
 */
export function setSyncWizardBanner(
  banner: string | null,
  kind: SyncWizardBannerKind = "info",
  extra?: Omit<Partial<SyncWizardState>, "banner" | "bannerKind">
): void {
  if (banner === null) {
    patchSyncWizardState({
      ...extra,
      banner: null,
      bannerKind: "info"
    })
    return
  }
  patchSyncWizardState({
    ...extra,
    banner,
    bannerKind: kind
  })
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
