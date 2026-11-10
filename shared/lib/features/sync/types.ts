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

/** EN: Portable tab-list rows over the command bus (IDs are peer-local). */
export type SyncRemoteTabRow =
  | {
      kind: "window"
      windowId: number
      title: string
      focused: boolean
    }
  | {
      kind: "group"
      windowId: number
      groupId: number | null
      label: string
    }
  | {
      kind: "tab"
      tabId: number
      windowId: number
      groupId: number | null
      title: string
      url: string
      active: boolean
      /**
       * EN: Portable favicon URL on the sync wire (`https:` only after extraction).
       *     Optional for older peers; omit when unknown. Never host-local `/_favicon/`,
       *     `data:`, `blob:`, or extension-origin URLs.
       * JA: sync ワイヤ上の可搬ファビコン URL（抽出後は `https:` のみ）。
       *     旧 peer 向けに省略可。不明時は載せるな。宿主ローカル `/_favicon/`・
       *     `data:`・`blob:`・拡張オリジンは載せない。
       */
      favIconUrl?: string | null
    }

/** EN: Portable search hit over the command bus. */
export type SyncRemoteSearchHit = {
  index: number
  source: string
  title: string
  url: string
  tabId: number | null
  hitCount: number
  pattern: string
  windowId: number | null
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
      /** EN: Optional peer-local window id (older peers ignore). */
      windowId: number | null
    }
  | {
      type: "open_tabs_result"
      id: string
      replyTo: string
      from: SyncDeviceId
      ok: boolean
      detail: string | null
      /** EN: URLs that were successfully opened on the peer (for --close mapping). */
      openedUrls: string[]
    }
  | {
      type: "tabs_list"
      id: string
      from: SyncDeviceId
      showUrl: boolean
    }
  | {
      type: "tabs_list_result"
      id: string
      replyTo: string
      from: SyncDeviceId
      ok: boolean
      detail: string | null
      rows: SyncRemoteTabRow[]
    }
  | {
      type: "search_query"
      id: string
      from: SyncDeviceId
      dispatchLine: string
    }
  | {
      type: "search_query_result"
      id: string
      replyTo: string
      from: SyncDeviceId
      ok: boolean
      detail: string | null
      hits: SyncRemoteSearchHit[]
    }
  | {
      type: "tabs_ops"
      id: string
      from: SyncDeviceId
      op: SyncTabsOp
    }
  | {
      type: "tabs_ops_result"
      id: string
      replyTo: string
      from: SyncDeviceId
      ok: boolean
      detail: string | null
    }
  | {
      /** EN: Announce other live DataChannel peers so the receiver can mesh. */
      type: "mesh_peers"
      id: string
      from: SyncDeviceId
      peers: Array<{ deviceId: SyncDeviceId; displayName: string }>
    }
  | {
      /**
       * EN: One-hop relay of a directed WebRTC offer/answer for mesh completion.
       * JA: メッシュ補完用の directed offer/answer を1ホップ中継する。
       */
      type: "mesh_signal"
      id: string
      from: SyncDeviceId
      /** EN: Final destination of this signal. */
      targetDeviceId: SyncDeviceId
      /** EN: Device that created the SDP (offer/answer originator). */
      originDeviceId: SyncDeviceId
      originDisplayName: string
      familyId: SyncFamilyId
      role: "offer" | "answer"
      sessionId: string
      sdp: string
      ice: string[]
    }

/** EN: Peer-local tab mutations requested over the command bus. */
export type SyncTabsOp =
  | {
      kind: "move"
      tabIds: number[]
      windowId: number
      /** EN: Absolute index, or -1 for end-of-window when beforeTabId is null. */
      index: number
      /** EN: When set, move immediately before this peer-local tab id (index ignored). */
      beforeTabId: number | null
      groupId: number | null
      ungroup: boolean
      groupAfter: boolean
    }
  | {
      kind: "activate"
      tabId: number
      windowId: number
    }
  | {
      kind: "close_tabs"
      tabIds: number[]
    }
  | {
      kind: "close_windows"
      windowIds: number[]
    }
  | {
      kind: "reload"
      tabIds: number[]
    }
  | {
      kind: "focus_window"
      windowId: number
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
