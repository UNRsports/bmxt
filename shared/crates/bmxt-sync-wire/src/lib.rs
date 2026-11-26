//! EN: Closed SyncBusCommand wire types (extension `types.ts` SoT).
//! JA: 閉じた SyncBusCommand ワイヤ型（拡張 `types.ts` が正本）。

use serde::{Deserialize, Serialize};
use thiserror::Error;

/** EN: Soft cap aligned with SEARCH_WIRE_SOFT_CAP_BYTES. */
pub const WIRE_SOFT_CAP_BYTES: usize = 180_000;
pub const SYNC_REMOTE_QUERY_TIMEOUT_MS: u64 = 20_000;
pub const INBOUND_MESSAGE_MAX_CHARS: usize = 200_000;
pub const DATA_CHANNEL_LABEL: &str = "bmxt-sync";

#[derive(Debug, Error)]
pub enum WireError {
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("message too large")]
    TooLarge,
    #[error("invalid bus command")]
    Invalid,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SyncBusCommand {
    #[serde(rename = "ping")]
    Ping {
        id: String,
        from: String,
        at: i64,
    },
    #[serde(rename = "ack")]
    Ack {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        at: i64,
    },
    #[serde(rename = "open_tabs")]
    OpenTabs {
        id: String,
        from: String,
        urls: Vec<String>,
        #[serde(rename = "groupTitle")]
        group_title: Option<String>,
        #[serde(rename = "groupColor", default, skip_serializing_if = "Option::is_none")]
        group_color: Option<String>,
        #[serde(rename = "windowId")]
        window_id: Option<i64>,
    },
    #[serde(rename = "open_tabs_result")]
    OpenTabsResult {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        ok: bool,
        detail: Option<String>,
        #[serde(rename = "openedUrls")]
        opened_urls: Vec<String>,
    },
    #[serde(rename = "tabs_list")]
    TabsList {
        id: String,
        from: String,
        #[serde(rename = "showUrl")]
        show_url: bool,
    },
    #[serde(rename = "tabs_list_result")]
    TabsListResult {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        ok: bool,
        detail: Option<String>,
        rows: Vec<SyncRemoteTabRow>,
    },
    #[serde(rename = "search_query")]
    SearchQuery {
        id: String,
        from: String,
        #[serde(rename = "dispatchLine")]
        dispatch_line: String,
    },
    #[serde(rename = "search_query_result")]
    SearchQueryResult {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        ok: bool,
        detail: Option<String>,
        hits: Vec<SyncRemoteSearchHit>,
    },
    #[serde(rename = "search_query_chunk")]
    SearchQueryChunk {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        ok: bool,
        detail: Option<String>,
        seq: u32,
        eof: bool,
        hits: Vec<SyncRemoteSearchHit>,
    },
    #[serde(rename = "tabs_ops")]
    TabsOps {
        id: String,
        from: String,
        op: SyncTabsOp,
    },
    #[serde(rename = "tabs_ops_result")]
    TabsOpsResult {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        ok: bool,
        detail: Option<String>,
    },
    #[serde(rename = "tabs_changed")]
    TabsChanged {
        id: String,
        from: String,
        at: i64,
        reason: TabsChangedReason,
        #[serde(default = "default_first_tab")]
        first: String,
    },
    #[serde(rename = "bookmarks_import")]
    BookmarksImport {
        id: String,
        from: String,
        #[serde(rename = "parentId")]
        parent_id: Option<String>,
        items: Vec<BookmarkImportItem>,
    },
    #[serde(rename = "bookmarks_import_result")]
    BookmarksImportResult {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        ok: bool,
        detail: Option<String>,
        created: u32,
    },
    #[serde(rename = "bookmarks_ops")]
    BookmarksOps {
        id: String,
        from: String,
        op: SyncBookmarksOp,
    },
    #[serde(rename = "bookmarks_ops_result")]
    BookmarksOpsResult {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        ok: bool,
        detail: Option<String>,
    },
    /** EN: Ask peer to run browser capability probe (aboutbmxt -system). */
    #[serde(rename = "probe_capabilities")]
    ProbeCapabilities {
        id: String,
        from: String,
        /** EN: Locale hint (`en` / `ja`); peer may ignore. */
        locale: String,
    },
    #[serde(rename = "probe_capabilities_result")]
    ProbeCapabilitiesResult {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        ok: bool,
        detail: Option<String>,
        lines: Vec<String>,
    },
    /** EN: Capture DOM lines for a peer tab (CLI oneshot / wizard). */
    #[serde(rename = "dom_list")]
    DomList {
        id: String,
        from: String,
        #[serde(rename = "tabId")]
        tab_id: i64,
        /** EN: `document` | `viewport` */
        scope: String,
        /** EN: `--html` | `--react` */
        flavor: String,
        #[serde(rename = "showTag")]
        show_tag: bool,
        pattern: String,
    },
    #[serde(rename = "dom_list_result")]
    DomListResult {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        ok: bool,
        detail: Option<String>,
        lines: Vec<String>,
    },
    /** EN: Drive peer nav overlay (CLI key loop / arm / disarm). */
    #[serde(rename = "nav_control")]
    NavControl {
        id: String,
        from: String,
        #[serde(rename = "tabId")]
        tab_id: i64,
        op: SyncNavControlOp,
    },
    #[serde(rename = "nav_control_result")]
    NavControlResult {
        id: String,
        #[serde(rename = "replyTo")]
        reply_to: String,
        from: String,
        ok: bool,
        detail: Option<String>,
    },
    #[serde(rename = "mesh_peers")]
    MeshPeers {
        id: String,
        from: String,
        peers: Vec<MeshPeerEntry>,
    },
    #[serde(rename = "mesh_signal")]
    MeshSignal {
        id: String,
        from: String,
        #[serde(rename = "targetDeviceId")]
        target_device_id: String,
        #[serde(rename = "originDeviceId")]
        origin_device_id: String,
        #[serde(rename = "originDisplayName")]
        origin_display_name: String,
        #[serde(rename = "familyId")]
        family_id: String,
        role: String,
        #[serde(rename = "sessionId")]
        session_id: String,
        sdp: String,
        ice: Vec<String>,
    },
}

fn default_first_tab() -> String {
    "tab".to_string()
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum SyncRemoteTabRow {
    Window {
        #[serde(rename = "windowId")]
        window_id: i64,
        title: String,
        focused: bool,
    },
    Group {
        #[serde(rename = "windowId")]
        window_id: i64,
        #[serde(rename = "groupId")]
        group_id: Option<i64>,
        label: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        title: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        color: Option<String>,
    },
    Tab {
        #[serde(rename = "tabId")]
        tab_id: i64,
        #[serde(rename = "windowId")]
        window_id: i64,
        #[serde(rename = "groupId")]
        group_id: Option<i64>,
        title: String,
        url: String,
        active: bool,
        #[serde(rename = "favIconUrl", default, skip_serializing_if = "Option::is_none")]
        fav_icon_url: Option<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncRemoteSearchHit {
    pub index: i64,
    pub source: String,
    pub title: String,
    pub url: String,
    pub tab_id: Option<i64>,
    pub hit_count: i64,
    pub pattern: String,
    pub window_id: Option<i64>,
    /** EN: Present when source is bookmark (peer remove/move). */
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bookmark_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TabsChangedReason {
    OpenTabs,
    TabsOps,
    LocalClose,
    LocalInventory,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MeshPeerEntry {
    pub device_id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SyncTabsOp {
    #[serde(rename = "move")]
    Move {
        #[serde(rename = "tabIds")]
        tab_ids: Vec<i64>,
        #[serde(rename = "windowId")]
        window_id: i64,
        index: i64,
        #[serde(rename = "beforeTabId")]
        before_tab_id: Option<i64>,
        #[serde(rename = "groupId")]
        group_id: Option<i64>,
        ungroup: bool,
        #[serde(rename = "groupAfter")]
        group_after: bool,
    },
    #[serde(rename = "activate")]
    Activate {
        #[serde(rename = "tabId")]
        tab_id: i64,
        #[serde(rename = "windowId")]
        window_id: i64,
        /// EN: Focus OS window. Omitted/default true keeps legacy senders focusing.
        #[serde(rename = "focusWindow", default = "default_true")]
        focus_window: bool,
    },
    #[serde(rename = "close_tabs")]
    CloseTabs {
        #[serde(rename = "tabIds")]
        tab_ids: Vec<i64>,
    },
    #[serde(rename = "close_windows")]
    CloseWindows {
        #[serde(rename = "windowIds")]
        window_ids: Vec<i64>,
    },
    #[serde(rename = "reload")]
    Reload {
        #[serde(rename = "tabIds")]
        tab_ids: Vec<i64>,
    },
    #[serde(rename = "focus_window")]
    FocusWindow {
        #[serde(rename = "windowId")]
        window_id: i64,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkImportItem {
    pub url: String,
    pub title: String,
}

/**
 * EN: Peer-local bookmark mutations (mirrors tabs_ops for bookmarks).
 * JA: ピア上のブックマーク操作（tabs_ops の bookmark 版）。
 */
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SyncBookmarksOp {
    #[serde(rename = "create")]
    Create {
        url: String,
        title: String,
        #[serde(rename = "parentId")]
        parent_id: Option<String>,
    },
    #[serde(rename = "create_folder")]
    CreateFolder {
        title: String,
        #[serde(rename = "parentId")]
        parent_id: Option<String>,
    },
    #[serde(rename = "remove")]
    Remove {
        #[serde(rename = "bookmarkIds")]
        bookmark_ids: Vec<String>,
    },
    #[serde(rename = "move")]
    Move {
        #[serde(rename = "bookmarkIds")]
        bookmark_ids: Vec<String>,
        #[serde(rename = "parentId")]
        parent_id: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        index: Option<i64>,
    },
}

/**
 * EN: Peer nav overlay control ops (mirrors nav-tab-bridge / run-nav-inject).
 * JA: ピア nav overlay 制御（nav-tab-bridge / run-nav-inject 相当）。
 */
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SyncNavControlOp {
    #[serde(rename = "start")]
    Start {
        #[serde(rename = "useCenter", default)]
        use_center: bool,
    },
    #[serde(rename = "stop")]
    Stop,
    #[serde(rename = "move")]
    Move {
        dx: i64,
        dy: i64,
        #[serde(rename = "freeMove", default)]
        free_move: bool,
    },
    #[serde(rename = "click")]
    Click,
    #[serde(rename = "key")]
    Key {
        key: String,
        code: String,
        #[serde(rename = "ctrlKey", default)]
        ctrl_key: bool,
        #[serde(rename = "shiftKey", default)]
        shift_key: bool,
        #[serde(rename = "altKey", default)]
        alt_key: bool,
        #[serde(rename = "metaKey", default)]
        meta_key: bool,
    },
    #[serde(rename = "jump_query")]
    JumpQuery {
        query: String,
        #[serde(default)]
        preview: bool,
    },
    #[serde(rename = "apply_typing")]
    ApplyTyping { text: String },
    #[serde(rename = "clear_typing")]
    ClearTyping,
}

impl SyncBusCommand {
    pub fn parse_text(text: &str) -> Result<Self, WireError> {
        if text.is_empty() || text.chars().count() > INBOUND_MESSAGE_MAX_CHARS {
            return Err(WireError::TooLarge);
        }
        if text.len() > WIRE_SOFT_CAP_BYTES * 2 {
            // EN: UTF-8 byte soft guard before full parse.
            return Err(WireError::TooLarge);
        }
        let cmd: SyncBusCommand = serde_json::from_str(text)?;
        cmd.validate()?;
        Ok(cmd)
    }

    pub fn to_text(&self) -> Result<String, WireError> {
        self.validate()?;
        let text = serde_json::to_string(self)?;
        if text.len() > WIRE_SOFT_CAP_BYTES {
            return Err(WireError::TooLarge);
        }
        Ok(text)
    }

    pub fn validate(&self) -> Result<(), WireError> {
        match self {
            SyncBusCommand::Ping { id, from, .. }
            | SyncBusCommand::Ack { id, from, .. }
            | SyncBusCommand::OpenTabs { id, from, .. }
            | SyncBusCommand::OpenTabsResult { id, from, .. }
            | SyncBusCommand::TabsList { id, from, .. }
            | SyncBusCommand::TabsListResult { id, from, .. }
            | SyncBusCommand::SearchQuery { id, from, .. }
            | SyncBusCommand::SearchQueryResult { id, from, .. }
            | SyncBusCommand::SearchQueryChunk { id, from, .. }
            | SyncBusCommand::TabsOps { id, from, .. }
            | SyncBusCommand::TabsOpsResult { id, from, .. }
            | SyncBusCommand::TabsChanged { id, from, .. }
            | SyncBusCommand::BookmarksImport { id, from, .. }
            | SyncBusCommand::BookmarksImportResult { id, from, .. }
            | SyncBusCommand::BookmarksOps { id, from, .. }
            | SyncBusCommand::BookmarksOpsResult { id, from, .. }
            | SyncBusCommand::ProbeCapabilities { id, from, .. }
            | SyncBusCommand::ProbeCapabilitiesResult { id, from, .. }
            | SyncBusCommand::DomList { id, from, .. }
            | SyncBusCommand::DomListResult { id, from, .. }
            | SyncBusCommand::NavControl { id, from, .. }
            | SyncBusCommand::NavControlResult { id, from, .. }
            | SyncBusCommand::MeshPeers { id, from, .. }
            | SyncBusCommand::MeshSignal { id, from, .. } => {
                if id.is_empty() || from.is_empty() {
                    return Err(WireError::Invalid);
                }
            }
        }
        Ok(())
    }

    pub fn id(&self) -> &str {
        match self {
            SyncBusCommand::Ping { id, .. }
            | SyncBusCommand::Ack { id, .. }
            | SyncBusCommand::OpenTabs { id, .. }
            | SyncBusCommand::OpenTabsResult { id, .. }
            | SyncBusCommand::TabsList { id, .. }
            | SyncBusCommand::TabsListResult { id, .. }
            | SyncBusCommand::SearchQuery { id, .. }
            | SyncBusCommand::SearchQueryResult { id, .. }
            | SyncBusCommand::SearchQueryChunk { id, .. }
            | SyncBusCommand::TabsOps { id, .. }
            | SyncBusCommand::TabsOpsResult { id, .. }
            | SyncBusCommand::TabsChanged { id, .. }
            | SyncBusCommand::BookmarksImport { id, .. }
            | SyncBusCommand::BookmarksImportResult { id, .. }
            | SyncBusCommand::BookmarksOps { id, .. }
            | SyncBusCommand::BookmarksOpsResult { id, .. }
            | SyncBusCommand::ProbeCapabilities { id, .. }
            | SyncBusCommand::ProbeCapabilitiesResult { id, .. }
            | SyncBusCommand::DomList { id, .. }
            | SyncBusCommand::DomListResult { id, .. }
            | SyncBusCommand::NavControl { id, .. }
            | SyncBusCommand::NavControlResult { id, .. }
            | SyncBusCommand::MeshPeers { id, .. }
            | SyncBusCommand::MeshSignal { id, .. } => id,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn parse_ping_ack_fixtures() {
        let ping_raw = include_str!("../../../../_context/cli-peer/fixtures/ping.json");
        let ping = SyncBusCommand::parse_text(ping_raw.trim()).expect("ping");
        match &ping {
            SyncBusCommand::Ping { id, .. } => assert_eq!(id, "ping-fixture-001"),
            other => panic!("expected ping, got {other:?}"),
        }
        let round = ping.to_text().expect("to_text");
        let again = SyncBusCommand::parse_text(&round).expect("reparse");
        assert_eq!(ping, again);

        let ack_raw = include_str!("../../../../_context/cli-peer/fixtures/ack.json");
        let ack = SyncBusCommand::parse_text(ack_raw.trim()).expect("ack");
        match ack {
            SyncBusCommand::Ack { reply_to, .. } => {
                assert_eq!(reply_to, "ping-fixture-001");
            }
            other => panic!("expected ack, got {other:?}"),
        }
    }
}
