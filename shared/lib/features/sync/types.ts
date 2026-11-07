/**
 * EN: Closed types for Family local sync (6a/6b/6c). No host imports.
 * JA: Family ローカル同期の閉じた型。ホスト依存なし。
 */

export type SyncDeviceId = string

export type SyncFamilyId = string

export type SyncBrowserKind = "chrome" | "brave" | "firefox" | "unknown"

export type SyncDeviceIdentity = {
  deviceId: SyncDeviceId
  displayName: string
  browser: SyncBrowserKind
  createdAt: string
  updatedAt: string
}

export type SyncFamilyMembership = {
  familyId: SyncFamilyId
  /** EN: Base64url of 32-byte Family seed (zero custody — never uploaded). */
  seedB64: string
  createdAt: string
  joinedAt: string
}

export type SyncRosterMember = {
  deviceId: SyncDeviceId
  displayName: string
  browser: SyncBrowserKind
  familyId: SyncFamilyId
  updatedAt: string
  /** EN: Optional LAN hint (manual/QR); never a custody endpoint. */
  endpointHint: string | null
}

export type SyncRosterDocument = {
  version: 1
  familyId: SyncFamilyId
  members: SyncRosterMember[]
  updatedAt: string
}

export type SyncLwwMeta = {
  updatedAt: string
  deviceId: SyncDeviceId
}

export type SyncPrefEntry = {
  key: string
  value: unknown
  meta: SyncLwwMeta
}

export type SyncPrefsDocument = {
  version: 1
  familyId: SyncFamilyId
  entries: SyncPrefEntry[]
  meta: SyncLwwMeta
}

export type SyncSnapshotIndexEntry = {
  id: string
  title: string
  updatedAt: string
  deviceId: SyncDeviceId
  bodyChars: number
}

export type SyncSnapshotIndexDocument = {
  version: 1
  familyId: SyncFamilyId
  files: SyncSnapshotIndexEntry[]
  meta: SyncLwwMeta
}

export type SyncConnectionState =
  | "idle"
  | "signaling"
  | "connected"
  | "disconnected"
  | "queued"

export type SyncStatusSnapshot = {
  device: SyncDeviceIdentity
  family: SyncFamilyMembership | null
  members: SyncRosterMember[]
  connections: Array<{ deviceId: SyncDeviceId; state: SyncConnectionState }>
  invite: string | null
}

/** EN: Wire envelope for Family-sealed handshake / queue payloads. */
export type SyncSealedEnvelope = {
  version: 1
  familyId: SyncFamilyId
  fromDeviceId: SyncDeviceId
  toDeviceId: SyncDeviceId | "*"
  kind: "signal" | "command"
  createdAt: string
  expiresAt: string
  /** EN: Base64url ciphertext (AES-GCM) of JSON payload. */
  ciphertextB64: string
  /** EN: Base64url IV. */
  ivB64: string
}

export type SyncSignalPayload =
  | {
      type: "offer"
      sessionId: string
      sdp: string
    }
  | {
      type: "answer"
      sessionId: string
      sdp: string
    }
  | {
      type: "ice"
      sessionId: string
      candidate: string
    }

export type SyncBusCommand =
  | {
      type: "ping"
      id: string
      from: SyncDeviceId
      at: number
    }
  | {
      type: "ack"
      id: string
      replyTo: string
      from: SyncDeviceId
      at: number
    }
  | {
      type: "open_tabs"
      id: string
      from: SyncDeviceId
      urls: string[]
      groupTitle: string | null
    }
  | {
      type: "open_tabs_result"
      id: string
      replyTo: string
      from: SyncDeviceId
      ok: boolean
      detail: string | null
    }

export type SyncInviteV1 = {
  version: 1
  familyId: SyncFamilyId
  seedB64: string
  fromDeviceId: SyncDeviceId
  fromDisplayName: string
}

export type SyncDiscoveryRecord = {
  deviceId: SyncDeviceId
  displayName: string
  familyId: SyncFamilyId
  endpointHint: string | null
  discoveredAt: string
  source: "manual" | "qr" | "roster"
}
