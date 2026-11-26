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

/** EN: Wire envelope for Family-authenticated connection / invite payloads. */
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
      /** EN: Display label (may include UI wrappers). Prefer `title` when present. */
      label: string
      /** EN: Raw chrome.tabGroups title (empty when untitled). Optional for older peers. */
      title?: string
      /** EN: chrome.tabGroups.Color enum string. Optional for older peers. */
      color?: string
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
  /** EN: Present when source is bookmark (peer remove/move). */
  bookmarkId?: string | null
  parentId?: string | null
}

/** EN: Why a Family tabs_changed signal was emitted (refresh hint only). */
export type TabsChangedReason =
  | "open_tabs"
  | "tabs_ops"
  | "local_close"
  /** EN: Local Chrome inventory changed (close / create / move / group) while peers are connected. */
  | "local_inventory"

/**
 * EN: Payload delivered to local subscribers of tabs_changed (after wire normalize).
 * JA: tabs_changed のローカル購読者へ渡すペイロード（ワイヤ正規化後）。
 */
export type TabsChangedSignal = {
  reason: TabsChangedReason
  /** EN: First-command selection code (e.g. `"tab"`). */
  first: string
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
      /** EN: Raw group title; null when ungrouped or untitled (pair with groupColor). */
      groupTitle: string | null
      /**
       * EN: chrome.tabGroups.Color when recreating a group (including untitled).
       *     null/omit = ungrouped batch, or title-only for older CLI `--group`.
       * JA: グループ再現時の色（無題含む）。null/省略は非グループ、または旧 `--group` のみ。
       */
      groupColor?: string | null
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
      /**
       * EN: Ordered search hit fragment (eof closes the stream for replyTo).
       * JA: 順序付き search ヒット断片（eof で replyTo のストリーム終了）。
       */
      type: "search_query_chunk"
      id: string
      replyTo: string
      from: SyncDeviceId
      ok: boolean
      detail: string | null
      seq: number
      eof: boolean
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
      /**
       * EN: Lightweight Family broadcast — inventory changed; peers refresh matching open pickers.
       * JA: 軽量 Family 广播。在庫が変わったので、符号に合う開いている picker を再取得する。
       */
      type: "tabs_changed"
      id: string
      from: SyncDeviceId
      at: number
      reason: TabsChangedReason
      /**
       * EN: First-command selection code (`tab`, later `search`, …). Older peers may omit → treat as `tab`.
       * JA: 第一コマンド選別符号。旧ピア欠落時は `tab` 扱い。
       */
      first: string
    }
  | {
      /**
       * EN: Import a list of http(s) bookmarks into the local bookmark tree.
       * JA: http(s) ブックマークリストをローカルブックマークツリーへ取り込む。
       */
      type: "bookmarks_import"
      id: string
      from: SyncDeviceId
      /** EN: Destination folder id; null = Bookmarks Bar root. */
      parentId: string | null
      items: Array<{ url: string; title: string }>
    }
  | {
      type: "bookmarks_import_result"
      id: string
      replyTo: string
      from: SyncDeviceId
      ok: boolean
      detail: string | null
      /** EN: Number of bookmarks successfully created. */
      created: number
    }
  | {
      /**
       * EN: Peer-local bookmark mutations (create / folder / remove / move).
       * JA: ピア上のブックマーク操作（作成／フォルダ／削除／移動）。
       */
      type: "bookmarks_ops"
      id: string
      from: SyncDeviceId
      op: SyncBookmarksOp
    }
  | {
      type: "bookmarks_ops_result"
      id: string
      replyTo: string
      from: SyncDeviceId
      ok: boolean
      detail: string | null
    }
  | {
      /** EN: Ask peer to run browser capability probe (`aboutbmxt -system`). */
      type: "probe_capabilities"
      id: string
      from: SyncDeviceId
      /** EN: Locale hint (`en` / `ja`). */
      locale: string
    }
  | {
      type: "probe_capabilities_result"
      id: string
      replyTo: string
      from: SyncDeviceId
      ok: boolean
      detail: string | null
      lines: string[]
    }
  | {
      /** EN: Capture DOM lines for a peer tab (CLI oneshot / wizard). */
      type: "dom_list"
      id: string
      from: SyncDeviceId
      tabId: number
      /** EN: `document` | `viewport` */
      scope: string
      /** EN: `--html` | `--react` */
      flavor: string
      showTag: boolean
      pattern: string
    }
  | {
      type: "dom_list_result"
      id: string
      replyTo: string
      from: SyncDeviceId
      ok: boolean
      detail: string | null
      lines: string[]
    }
  | {
      /** EN: Drive peer nav overlay (CLI key loop / arm / disarm). */
      type: "nav_control"
      id: string
      from: SyncDeviceId
      tabId: number
      op: SyncNavControlOp
    }
  | {
      type: "nav_control_result"
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

/** EN: Peer-local bookmark mutations requested over the command bus. */
export type SyncBookmarksOp =
  | {
      kind: "create"
      url: string
      title: string
      parentId: string | null
    }
  | {
      kind: "create_folder"
      title: string
      parentId: string | null
    }
  | {
      kind: "remove"
      bookmarkIds: string[]
    }
  | {
      kind: "move"
      bookmarkIds: string[]
      parentId: string
      index: number | null
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

/** EN: Peer nav overlay control ops (CLI remote drive). */
export type SyncNavControlOp =
  | { kind: "start"; useCenter: boolean }
  | { kind: "stop" }
  | { kind: "move"; dx: number; dy: number; freeMove: boolean }
  | { kind: "click" }
  | {
      kind: "key"
      key: string
      code: string
      ctrlKey: boolean
      shiftKey: boolean
      altKey: boolean
      metaKey: boolean
    }
  | { kind: "jump_query"; query: string; preview: boolean }
  | { kind: "apply_typing"; text: string }
  | { kind: "clear_typing" }

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
