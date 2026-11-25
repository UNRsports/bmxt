//! EN: Multi-peer bus hub — inbound RPC, Family mesh (mesh_peers / mesh_signal), REPL RPC.
//! JA: 複数ピア・バスハブ。inbound RPC、Family メッシュ、REPL RPC。

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::{anyhow, Result};
use base64::Engine;
use bmxt_peer_rtc::{PeerSession, PeerSessionEvent};
use bmxt_sync_wire::{
    BookmarkImportItem, MeshPeerEntry, SyncBookmarksOp, SyncBusCommand, SyncRemoteTabRow,
    SyncTabsOp, SYNC_REMOTE_QUERY_TIMEOUT_MS,
};
use rand::RngCore;
use tokio::sync::{broadcast, mpsc, oneshot, Mutex};

use crate::mesh_plan::{peers_to_announce, peers_to_offer_mesh, MeshPeerAnnounce};
use crate::msgs::t_cli;

const MAX_MESH_PEERS: usize = 32;
const MESH_OFFER_BUSY_TTL: Duration = Duration::from_secs(60);
const CLI_NO_BROWSER: &str = "cli has no browser host";
/** EN: Same default as extension `FAMILY_SIGNAL_FIRST_DEFAULT_TAB`. */
const TABS_CHANGED_FIRST_TAB: &str = "tab";
const TABS_CHANGED_BROADCAST_CAP: usize = 64;

/**
 * EN: Inbound Family `tabs_changed` notice for open CLI pickers.
 * JA: 開いている CLI picker 向けの inbound Family `tabs_changed` 通知。
 */
#[derive(Debug, Clone)]
pub struct TabsChangedNotice {
    /** EN: Signaling peer device id (diagnostics / future filter). */
    #[allow(dead_code)]
    pub from: String,
    pub first: String,
}

impl TabsChangedNotice {
    /** EN: True when a tab-command picker should refresh (extension parity). */
    pub fn targets_tab_picker(&self) -> bool {
        self.first == TABS_CHANGED_FIRST_TAB
    }
}

struct TaggedEvent {
    via_remote: String,
    event: PeerSessionEvent,
}

struct PendingRpc {
    tx: oneshot::Sender<SyncBusCommand>,
}

/** EN: Live search stream events for CLI progress + final aggregation. */
enum SearchStreamEvent {
    /** EN: A chunk arrived (hits already appended into the pending buffer). */
    Progress {
        seq: u32,
        hits_so_far: usize,
        detail: Option<String>,
    },
    Done {
        ok: bool,
        detail: Option<String>,
        hits: Vec<bmxt_sync_wire::SyncRemoteSearchHit>,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SearchProgressPhase {
    Querying,
    Receiving,
    Done,
    Failed,
}

/** EN: Progress snapshot for Interactive CLI bars. */
#[derive(Debug, Clone)]
pub struct SearchProgress {
    pub peer_id: String,
    pub peer_index: usize,
    pub peer_total: usize,
    pub hits_so_far: usize,
    pub chunk_seq: Option<u32>,
    pub detail: Option<String>,
    pub phase: SearchProgressPhase,
}

/** EN: Accumulate search_query_chunk until eof (extension bus parity). */
struct PendingSearchRpc {
    hits: Vec<bmxt_sync_wire::SyncRemoteSearchHit>,
    next_seq: u32,
    event_tx: mpsc::UnboundedSender<SearchStreamEvent>,
}

struct HubInner {
    self_id: String,
    display_name: String,
    family_id: String,
    /// remote device id → session
    by_remote: HashMap<String, Arc<PeerSession>>,
    /// session id → remote device id
    remote_by_session: HashMap<String, String>,
    connected: HashSet<String>,
    display_by_remote: HashMap<String, String>,
    pending_rpc: HashMap<String, PendingRpc>,
    pending_search: HashMap<String, PendingSearchRpc>,
    /// remote → introducer (relay) device id
    relay_by_remote: HashMap<String, String>,
    offer_busy_until: HashMap<String, Instant>,
    last_connected_key: String,
    event_tx: mpsc::UnboundedSender<TaggedEvent>,
    tabs_changed_tx: broadcast::Sender<TabsChangedNotice>,
    /** EN: True after `close_all` — do not claim the listener is still running. */
    shutting_down: bool,
}

#[derive(Clone)]
pub struct BusClient {
    inner: Arc<Mutex<HubInner>>,
    tabs_changed_tx: broadcast::Sender<TabsChangedNotice>,
}

impl BusClient {
    /**
     * EN: Take the first live session (after sync-connect) and start mesh + inbound servicing.
     * JA: sync-connect 後の最初のセッションを受け取り、メッシュと inbound 処理を開始する。
     */
    /**
     * EN: Empty hub (localhost listener may attach peers before any manual connection setup).
     * JA: 空ハブ（手動接続前に localhost 待ち受けが peer を attach しうる）。
     */
    pub async fn create_hub(self_id: String, display_name: String, family_id: String) -> Self {
        let (event_tx, event_rx) = mpsc::unbounded_channel();
        let (tabs_changed_tx, _) = broadcast::channel(TABS_CHANGED_BROADCAST_CAP);
        let inner = Arc::new(Mutex::new(HubInner {
            self_id,
            display_name,
            family_id,
            by_remote: HashMap::new(),
            remote_by_session: HashMap::new(),
            connected: HashSet::new(),
            display_by_remote: HashMap::new(),
            pending_rpc: HashMap::new(),
            pending_search: HashMap::new(),
            relay_by_remote: HashMap::new(),
            offer_busy_until: HashMap::new(),
            last_connected_key: String::new(),
            event_tx,
            tabs_changed_tx: tabs_changed_tx.clone(),
            shutting_down: false,
        }));
        let client = Self {
            inner: Arc::clone(&inner),
            tabs_changed_tx,
        };
        tokio::spawn(dispatch_loop(Arc::clone(&inner), event_rx));
        client
    }

    /**
     * EN: Subscribe to inbound Family `tabs_changed` (for live tab picker refresh).
     * JA: inbound Family `tabs_changed` を購読する（tab picker ライブ更新用）。
     */
    pub fn subscribe_tabs_changed(&self) -> broadcast::Receiver<TabsChangedNotice> {
        self.tabs_changed_tx.subscribe()
    }

    #[allow(dead_code)] // EN: Convenience when constructing a hub with the first peer already live.
    pub async fn start(
        self_id: String,
        display_name: String,
        family_id: String,
        session: PeerSession,
        events: mpsc::UnboundedReceiver<PeerSessionEvent>,
        remote_device_id: String,
        remote_display_name: String,
        early_events: Vec<PeerSessionEvent>,
    ) -> Self {
        let client = Self::create_hub(self_id, display_name, family_id).await;
        client
            .attach_peer(
                session,
                events,
                remote_device_id,
                remote_display_name,
                early_events,
            )
            .await;
        client
    }

    /**
     * EN: Register a live (or soon-live) peer session on this hub.
     * JA: 本ハブに生存（または直後に開く）peer セッションを登録する。
     */
    pub async fn attach_peer(
        &self,
        session: PeerSession,
        events: mpsc::UnboundedReceiver<PeerSessionEvent>,
        remote_device_id: String,
        remote_display_name: String,
        early_events: Vec<PeerSessionEvent>,
    ) {
        let remote = remote_device_id.trim().to_string();
        if remote.is_empty() {
            return;
        }
        let session = Arc::new(session);
        let name = if remote_display_name.trim().is_empty() {
            remote.clone()
        } else {
            remote_display_name.trim().to_string()
        };
        let event_tx = {
            let mut guard = self.inner.lock().await;
            guard
                .remote_by_session
                .insert(session.session_id.clone(), remote.clone());
            guard.by_remote.insert(remote.clone(), Arc::clone(&session));
            guard.display_by_remote.insert(remote.clone(), name);
            guard.event_tx.clone()
        };
        for event in early_events {
            let _ = event_tx.send(TaggedEvent {
                via_remote: remote.clone(),
                event,
            });
        }
        spawn_forwarder(remote.clone(), events, event_tx);
        {
            let mut guard = self.inner.lock().await;
            if session.data_channel_is_open().await {
                guard.connected.insert(remote.clone());
            }
            drop(guard);
        }
        on_connected_set_changed(Arc::clone(&self.inner)).await;
    }

    pub async fn is_connected_to(&self, remote_device_id: &str) -> bool {
        let guard = self.inner.lock().await;
        guard.connected.contains(remote_device_id.trim())
    }

    pub async fn close_all(&self) {
        let sessions: Vec<Arc<PeerSession>> = {
            let mut guard = self.inner.lock().await;
            // EN: Exit/quit path — closed events must not print "listener keeps running".
            guard.shutting_down = true;
            guard.by_remote.values().cloned().collect()
        };
        for session in sessions {
            session.close().await;
        }
    }

    pub async fn list_connected(&self) -> Vec<(String, String)> {
        let guard = self.inner.lock().await;
        let mut out = Vec::new();
        for id in &guard.connected {
            let name = guard
                .display_by_remote
                .get(id)
                .cloned()
                .unwrap_or_else(|| id.clone());
            out.push((id.clone(), name));
        }
        out.sort_by(|a, b| a.0.cmp(&b.0));
        out
    }

    async fn request_on(&self, remote_id: &str, cmd: SyncBusCommand) -> Result<SyncBusCommand> {
        let id = cmd.id().to_string();
        let (tx, rx) = oneshot::channel();
        let session = {
            let mut guard = self.inner.lock().await;
            let session = guard
                .by_remote
                .get(remote_id)
                .cloned()
                .ok_or_else(|| anyhow!("not connected to {remote_id}"))?;
            guard.pending_rpc.insert(id.clone(), PendingRpc { tx });
            session
        };
        if let Err(err) = session.send_command(&cmd).await {
            let mut guard = self.inner.lock().await;
            guard.pending_rpc.remove(&id);
            return Err(anyhow!(err));
        }
        match tokio::time::timeout(Duration::from_millis(SYNC_REMOTE_QUERY_TIMEOUT_MS), rx).await {
            Ok(Ok(cmd)) => Ok(cmd),
            Ok(Err(_)) => Err(anyhow!("RPC canceled waiting for {id}")),
            Err(_) => {
                let mut guard = self.inner.lock().await;
                guard.pending_rpc.remove(&id);
                Err(anyhow!("RPC timeout waiting for {id}"))
            }
        }
    }

    pub async fn ping_one(&self, from: &str, remote_id: &str) -> Result<SyncBusCommand> {
        let id = new_id("ping");
        let at = chrono::Utc::now().timestamp_millis();
        self.request_on(
            remote_id,
            SyncBusCommand::Ping {
                id,
                from: from.to_string(),
                at,
            },
        )
        .await
    }

    #[allow(dead_code)] // EN: Kept for multi-peer diagnostics / future REPL helpers.
    pub async fn ping_all(&self, from: &str) -> Result<Vec<(String, SyncBusCommand)>> {
        let remotes = self.connected_ids().await;
        if remotes.is_empty() {
            return Err(anyhow!("no connected peers"));
        }
        let mut out = Vec::new();
        for remote in remotes {
            let ack = self.ping_one(from, &remote).await?;
            out.push((remote, ack));
        }
        Ok(out)
    }

    pub async fn tabs_all(
        &self,
        from: &str,
        show_url: bool,
    ) -> Result<Vec<(String, String, Vec<SyncRemoteTabRow>)>> {
        let remotes = self.connected_ids().await;
        if remotes.is_empty() {
            return Err(anyhow!("no connected peers"));
        }
        let mut out = Vec::new();
        for remote in remotes {
            let name = {
                let guard = self.inner.lock().await;
                guard
                    .display_by_remote
                    .get(&remote)
                    .cloned()
                    .unwrap_or_else(|| remote.clone())
            };
            let id = new_id("tabs");
            let resp = self
                .request_on(
                    &remote,
                    SyncBusCommand::TabsList {
                        id,
                        from: from.to_string(),
                        show_url,
                    },
                )
                .await?;
            match resp {
                SyncBusCommand::TabsListResult {
                    ok, detail, rows, ..
                } => {
                    if !ok {
                        eprintln!(
                            "warn: tabs_list from {name} failed: {}",
                            detail.unwrap_or_default()
                        );
                        continue;
                    }
                    out.push((remote, name, rows));
                }
                other => {
                    eprintln!("warn: unexpected tabs reply from {name}: {other:?}");
                }
            }
        }
        Ok(out)
    }

    async fn first_remote(&self) -> Result<String> {
        let remotes = self.connected_ids().await;
        remotes
            .into_iter()
            .next()
            .ok_or_else(|| anyhow!("no connected peers"))
    }

    /**
     * EN: Run tabs_ops on a specific peer (tab ids are per-browser — never guess first_remote).
     * JA: 指定 peer へ tabs_ops（tab id はブラウザごと。first_remote 推測はしない）。
     */
    pub async fn tabs_ops_on(&self, from: &str, remote: &str, op: SyncTabsOp) -> Result<()> {
        let remote = remote.trim();
        if remote.is_empty() {
            return Err(anyhow!("tabs_ops: empty remote device id"));
        }
        let id = new_id("ops");
        let resp = self
            .request_on(
                remote,
                SyncBusCommand::TabsOps {
                    id,
                    from: from.to_string(),
                    op,
                },
            )
            .await?;
        match resp {
            SyncBusCommand::TabsOpsResult { ok, detail, .. } => {
                if !ok {
                    return Err(anyhow!(detail.unwrap_or_else(|| "tabs_ops failed".into())));
                }
                Ok(())
            }
            other => Err(anyhow!("unexpected reply: {other:?}")),
        }
    }

    /** EN: Legacy helper — prefer `tabs_ops_on` when the owning peer is known. */
    pub async fn tabs_ops(&self, from: &str, op: SyncTabsOp) -> Result<()> {
        let remote = self.first_remote().await?;
        self.tabs_ops_on(from, &remote, op).await
    }

    /**
     * EN: Resolve a connected peer by exact device id or unique id prefix.
     * JA: 接続中 peer を device id 完全一致、または一意な id 接頭辞で解決する。
     */
    pub async fn resolve_remote_id(&self, needle: &str) -> Result<String> {
        let needle = needle.trim();
        if needle.is_empty() {
            return Err(anyhow!("empty device id"));
        }
        let peers = self.list_connected().await;
        if let Some((id, _)) = peers.iter().find(|(id, _)| id == needle) {
            return Ok(id.clone());
        }
        let prefix_hits: Vec<&(String, String)> = peers
            .iter()
            .filter(|(id, _)| id.starts_with(needle))
            .collect();
        match prefix_hits.as_slice() {
            [(id, _)] => Ok(id.clone()),
            [] => Err(anyhow!("not connected to {needle}")),
            many => {
                let ids: Vec<&str> = many.iter().map(|(id, _)| id.as_str()).collect();
                Err(anyhow!(
                    "ambiguous device id prefix {needle:?} matches: {}",
                    ids.join(", ")
                ))
            }
        }
    }

    /**
     * EN: open_tabs on a specific peer (optional group title / window).
     * JA: 指定 peer へ open_tabs（任意のグループ名 / window）。
     */
    pub async fn open_tabs_on(
        &self,
        from: &str,
        remote_id: &str,
        urls: Vec<String>,
        group_title: Option<String>,
        window_id: Option<i64>,
    ) -> Result<(Vec<String>, Option<String>)> {
        let remote = remote_id.trim();
        if remote.is_empty() {
            return Err(anyhow!("open_tabs: empty remote device id"));
        }
        let id = new_id("open");
        let resp = self
            .request_on(
                remote,
                SyncBusCommand::OpenTabs {
                    id,
                    from: from.to_string(),
                    urls,
                    group_title,
                    group_color: None,
                    window_id,
                },
            )
            .await?;
        match resp {
            SyncBusCommand::OpenTabsResult {
                ok,
                detail,
                opened_urls,
                ..
            } => {
                if !ok {
                    return Err(anyhow!(detail.unwrap_or_else(|| "open_tabs failed".into())));
                }
                Ok((opened_urls, detail))
            }
            other => Err(anyhow!("unexpected reply: {other:?}")),
        }
    }

    pub async fn open_tabs(
        &self,
        from: &str,
        urls: Vec<String>,
        window_id: Option<i64>,
    ) -> Result<Vec<String>> {
        let remote = self.first_remote().await?;
        let (opened, _) = self
            .open_tabs_on(from, &remote, urls, None, window_id)
            .await?;
        Ok(opened)
    }

    /**
     * EN: bookmarks_import on a specific peer (save mode of bookmark -send).
     * JA: 指定 peer へ bookmarks_import（bookmark -send の save）。
     */
    pub async fn bookmarks_import_on(
        &self,
        from: &str,
        remote: &str,
        parent_id: Option<String>,
        items: Vec<BookmarkImportItem>,
    ) -> Result<u32> {
        let remote = remote.trim();
        if remote.is_empty() {
            return Err(anyhow!("bookmarks_import: empty remote device id"));
        }
        let id = new_id("bmimp");
        let resp = self
            .request_on(
                remote,
                SyncBusCommand::BookmarksImport {
                    id,
                    from: from.to_string(),
                    parent_id,
                    items,
                },
            )
            .await?;
        match resp {
            SyncBusCommand::BookmarksImportResult {
                ok,
                detail,
                created,
                ..
            } => {
                if !ok {
                    return Err(anyhow!(
                        detail.unwrap_or_else(|| "bookmarks_import failed".into())
                    ));
                }
                Ok(created)
            }
            other => Err(anyhow!("unexpected reply: {other:?}")),
        }
    }

    /**
     * EN: bookmarks_ops on a specific peer (create / folder / remove / move).
     * JA: 指定 peer へ bookmarks_ops（作成／フォルダ／削除／移動）。
     */
    pub async fn bookmarks_ops_on(
        &self,
        from: &str,
        remote: &str,
        op: SyncBookmarksOp,
    ) -> Result<()> {
        let remote = remote.trim();
        if remote.is_empty() {
            return Err(anyhow!("bookmarks_ops: empty remote device id"));
        }
        let id = new_id("bmops");
        let resp = self
            .request_on(
                remote,
                SyncBusCommand::BookmarksOps {
                    id,
                    from: from.to_string(),
                    op,
                },
            )
            .await?;
        match resp {
            SyncBusCommand::BookmarksOpsResult { ok, detail, .. } => {
                if !ok {
                    return Err(anyhow!(
                        detail.unwrap_or_else(|| "bookmarks_ops failed".into())
                    ));
                }
                Ok(())
            }
            other => Err(anyhow!("unexpected reply: {other:?}")),
        }
    }

    /** EN: Legacy helper — prefer `bookmarks_ops_on` when the peer is known. */
    pub async fn bookmarks_ops(&self, from: &str, op: SyncBookmarksOp) -> Result<()> {
        let remote = self.first_remote().await?;
        self.bookmarks_ops_on(from, &remote, op).await
    }

    #[allow(dead_code)] // EN: Convenience wrapper; call sites prefer with_progress.
    pub async fn search_query(
        &self,
        from: &str,
        dispatch_line: String,
    ) -> Result<Vec<bmxt_sync_wire::SyncRemoteSearchHit>> {
        self.search_query_with_progress(from, dispatch_line, |_| {})
            .await
    }

    /**
     * EN: Peer search with optional progress callback (chunk / peer boundaries).
     * JA: 進捗コールバック付き peer search（チャンク／ピア境界）。
     */
    pub async fn search_query_with_progress<F>(
        &self,
        from: &str,
        dispatch_line: String,
        mut on_progress: F,
    ) -> Result<Vec<bmxt_sync_wire::SyncRemoteSearchHit>>
    where
        F: FnMut(SearchProgress),
    {
        let remotes = self.connected_ids().await;
        if remotes.is_empty() {
            return Err(anyhow!("no connected peers"));
        }
        // EN: Chunk streams need longer than a single RPC round-trip (parity with extension).
        // JA: チャンクストリームは単発 RPC より長い（拡張側と揃える）。
        const SEARCH_STREAM_TIMEOUT_MS: u64 = 90_000;
        let peer_total = remotes.len();
        let mut all_hits = Vec::new();
        for (peer_index, remote) in remotes.into_iter().enumerate() {
            on_progress(SearchProgress {
                peer_id: remote.clone(),
                peer_index,
                peer_total,
                hits_so_far: 0,
                chunk_seq: None,
                detail: None,
                phase: SearchProgressPhase::Querying,
            });
            let id = new_id("search");
            let (event_tx, mut event_rx) = mpsc::unbounded_channel();
            let session = {
                let mut guard = self.inner.lock().await;
                let session = guard
                    .by_remote
                    .get(&remote)
                    .cloned()
                    .ok_or_else(|| anyhow!("not connected to {remote}"))?;
                guard.pending_search.insert(
                    id.clone(),
                    PendingSearchRpc {
                        hits: Vec::new(),
                        next_seq: 0,
                        event_tx,
                    },
                );
                session
            };
            let cmd = SyncBusCommand::SearchQuery {
                id: id.clone(),
                from: from.to_string(),
                dispatch_line: dispatch_line.clone(),
            };
            if let Err(err) = session.send_command(&cmd).await {
                let mut guard = self.inner.lock().await;
                guard.pending_search.remove(&id);
                return Err(anyhow!(err));
            }

            let deadline = tokio::time::Instant::now()
                + Duration::from_millis(SEARCH_STREAM_TIMEOUT_MS);
            let (ok, detail, hits) = loop {
                let left = deadline.saturating_duration_since(tokio::time::Instant::now());
                if left.is_zero() {
                    let mut guard = self.inner.lock().await;
                    guard.pending_search.remove(&id);
                    return Err(anyhow!("search RPC timeout waiting for {id}"));
                }
                match tokio::time::timeout(left, event_rx.recv()).await {
                    Ok(Some(SearchStreamEvent::Progress {
                        seq,
                        hits_so_far,
                        detail,
                    })) => {
                        on_progress(SearchProgress {
                            peer_id: remote.clone(),
                            peer_index,
                            peer_total,
                            hits_so_far,
                            chunk_seq: Some(seq),
                            detail,
                            phase: SearchProgressPhase::Receiving,
                        });
                    }
                    Ok(Some(SearchStreamEvent::Done { ok, detail, hits })) => {
                        break (ok, detail, hits);
                    }
                    Ok(None) => {
                        let mut guard = self.inner.lock().await;
                        guard.pending_search.remove(&id);
                        return Err(anyhow!("search RPC canceled waiting for {id}"));
                    }
                    Err(_) => {
                        let mut guard = self.inner.lock().await;
                        guard.pending_search.remove(&id);
                        return Err(anyhow!("search RPC timeout waiting for {id}"));
                    }
                }
            };

            if !ok {
                eprintln!(
                    "warn: search on {remote} failed: {}",
                    detail.clone().unwrap_or_default()
                );
                on_progress(SearchProgress {
                    peer_id: remote.clone(),
                    peer_index,
                    peer_total,
                    hits_so_far: 0,
                    chunk_seq: None,
                    detail,
                    phase: SearchProgressPhase::Failed,
                });
                continue;
            }
            if let Some(ref d) = detail {
                if d.contains("truncated") {
                    eprintln!("warn: search on {remote} truncated: {d}");
                }
            }
            let hits_len = hits.len();
            on_progress(SearchProgress {
                peer_id: remote.clone(),
                peer_index,
                peer_total,
                hits_so_far: hits_len,
                chunk_seq: None,
                detail,
                phase: SearchProgressPhase::Done,
            });
            all_hits.extend(hits);
        }
        Ok(all_hits)
    }

    async fn connected_ids(&self) -> Vec<String> {
        let guard = self.inner.lock().await;
        let mut ids: Vec<String> = guard.connected.iter().cloned().collect();
        ids.sort();
        ids
    }
}

fn spawn_forwarder(
    via_remote: String,
    mut events: mpsc::UnboundedReceiver<PeerSessionEvent>,
    tx: mpsc::UnboundedSender<TaggedEvent>,
) {
    tokio::spawn(async move {
        while let Some(event) = events.recv().await {
            if tx
                .send(TaggedEvent {
                    via_remote: via_remote.clone(),
                    event,
                })
                .is_err()
            {
                break;
            }
        }
    });
}

async fn dispatch_loop(
    inner: Arc<Mutex<HubInner>>,
    mut events: mpsc::UnboundedReceiver<TaggedEvent>,
) {
    while let Some(tagged) = events.recv().await {
        match tagged.event {
            PeerSessionEvent::ConnectionState(state) => {
                // EN: Skip checking/connecting noise; ExternalPrinter keeps BMXt> caret.
                if state == "connected" || state == "failed" || state == "closed" {
                    crate::repl_log::line(&format!(
                        "connection[{}]: {state}",
                        tagged.via_remote
                    ));
                }
                let mut changed = false;
                let mut drop_session: Option<Arc<PeerSession>> = None;
                let mut became_idle = false;
                let shutting_down;
                {
                    let mut guard = inner.lock().await;
                    shutting_down = guard.shutting_down;
                    if state == "connected" {
                        changed = guard.connected.insert(tagged.via_remote.clone());
                    } else if state == "failed" || state == "closed" || state == "disconnected" {
                        changed = guard.connected.remove(&tagged.via_remote);
                        if state == "failed" || state == "closed" {
                            guard.offer_busy_until.remove(&tagged.via_remote);
                            if let Some(session) = guard.by_remote.remove(&tagged.via_remote) {
                                guard.remote_by_session.remove(&session.session_id);
                                drop_session = Some(session);
                            }
                        }
                        became_idle = changed && guard.connected.is_empty();
                    }
                }
                if let Some(session) = drop_session {
                    session.close().await;
                }
                // EN: Only when peers drop while the REPL stays up — not on quit/exit.
                if became_idle && !shutting_down {
                    let key = if crate::door::is_door_listening() {
                        "cmd.cli.door.peerTunnelClosed"
                    } else {
                        "cmd.cli.door.peerTunnelClosedPeerOnly"
                    };
                    crate::repl_log::line(&t_cli(key, &[("detail", state.as_str())]));
                }
                if changed {
                    on_connected_set_changed(Arc::clone(&inner)).await;
                }
            }
            PeerSessionEvent::IceConnectionState(state) => {
                if state == "closed" || state == "failed" || state == "disconnected" {
                    crate::repl_log::line(&format!("ice[{}]: {state}", tagged.via_remote));
                }
            }
            PeerSessionEvent::DataChannelOpen => {
                crate::repl_log::line(&format!(
                    "datachannel[{}]: open",
                    tagged.via_remote
                ));
                let changed = {
                    let mut guard = inner.lock().await;
                    guard.connected.insert(tagged.via_remote.clone())
                };
                if changed {
                    on_connected_set_changed(Arc::clone(&inner)).await;
                }
            }
            PeerSessionEvent::Command(cmd) => {
                handle_command(Arc::clone(&inner), &tagged.via_remote, cmd).await;
            }
        }
    }
}

async fn handle_command(inner: Arc<Mutex<HubInner>>, via_remote: &str, cmd: SyncBusCommand) {
    // EN: search_query_result / search_query_chunk → pending_search (accumulate until eof).
    // JA: search 結果は pending_search で eof まで蓄積する。
    match &cmd {
        SyncBusCommand::SearchQueryResult {
            reply_to,
            ok,
            detail,
            hits,
            ..
        } => {
            let mut guard = inner.lock().await;
            if let Some(pending) = guard.pending_search.remove(reply_to) {
                let _ = pending.event_tx.send(SearchStreamEvent::Done {
                    ok: *ok,
                    detail: detail.clone(),
                    hits: hits.clone(),
                });
                return;
            }
        }
        SyncBusCommand::SearchQueryChunk {
            reply_to,
            ok,
            detail,
            seq,
            eof,
            hits,
            ..
        } => {
            let mut guard = inner.lock().await;
            if guard.pending_search.contains_key(reply_to) {
                if let Some(pending) = guard.pending_search.get_mut(reply_to) {
                    if *seq == pending.next_seq {
                        pending.hits.extend(hits.iter().cloned());
                        pending.next_seq = seq.saturating_add(1);
                    }
                    let hits_so_far = pending.hits.len();
                    let _ = pending.event_tx.send(SearchStreamEvent::Progress {
                        seq: *seq,
                        hits_so_far,
                        detail: detail.clone(),
                    });
                }
                if *eof || !*ok {
                    if let Some(pending) = guard.pending_search.remove(reply_to) {
                        let _ = pending.event_tx.send(SearchStreamEvent::Done {
                            ok: *ok,
                            detail: detail.clone(),
                            hits: pending.hits,
                        });
                    }
                }
                return;
            }
        }
        _ => {}
    }

    if let Some(reply_to) = reply_to_of(&cmd) {
        let mut guard = inner.lock().await;
        if let Some(pending) = guard.pending_rpc.remove(reply_to) {
            let _ = pending.tx.send(cmd);
            return;
        }
    }

    match cmd {
        SyncBusCommand::Ping { id, .. } => {
            let (self_id, session) = {
                let guard = inner.lock().await;
                let session = guard.by_remote.get(via_remote).cloned();
                (guard.self_id.clone(), session)
            };
            let Some(session) = session else {
                return;
            };
            let ack = SyncBusCommand::Ack {
                id: new_id("ack"),
                reply_to: id,
                from: self_id,
                at: chrono::Utc::now().timestamp_millis(),
            };
            let _ = session.send_command(&ack).await;
        }
        SyncBusCommand::TabsList { id, .. } => {
            // EN: CLI has no browser tabs — reply empty success so extension --peers does not hang.
            let (self_id, session) = {
                let guard = inner.lock().await;
                let session = guard.by_remote.get(via_remote).cloned();
                (guard.self_id.clone(), session)
            };
            let Some(session) = session else {
                return;
            };
            let reply = SyncBusCommand::TabsListResult {
                id: new_id("tabs-r"),
                reply_to: id,
                from: self_id,
                ok: true,
                detail: None,
                rows: Vec::new(),
            };
            let _ = session.send_command(&reply).await;
        }
        SyncBusCommand::OpenTabs { id, .. } => {
            reply_fail_open(inner, via_remote, id).await;
        }
        SyncBusCommand::TabsOps { id, .. } => {
            reply_fail_ops(inner, via_remote, id).await;
        }
        SyncBusCommand::BookmarksImport { id, .. } => {
            reply_fail_bookmarks_import(inner, via_remote, id).await;
        }
        SyncBusCommand::BookmarksOps { id, .. } => {
            reply_fail_bookmarks_ops(inner, via_remote, id).await;
        }
        SyncBusCommand::SearchQuery { id, .. } => {
            reply_fail_search(inner, via_remote, id).await;
        }
        SyncBusCommand::MeshPeers { peers, from, .. } => {
            handle_mesh_peers(inner, via_remote, from, peers).await;
        }
        SyncBusCommand::MeshSignal { .. } => {
            handle_mesh_signal(inner, via_remote, cmd).await;
        }
        SyncBusCommand::TabsChanged { from, first, .. } => {
            let notice = TabsChangedNotice {
                from,
                first: if first.trim().is_empty() {
                    TABS_CHANGED_FIRST_TAB.to_string()
                } else {
                    first
                },
            };
            if notice.targets_tab_picker() {
                let tx = {
                    let guard = inner.lock().await;
                    guard.tabs_changed_tx.clone()
                };
                let _ = tx.send(notice);
            }
        }
        _ => {}
    }
}

async fn reply_fail_open(inner: Arc<Mutex<HubInner>>, via_remote: &str, id: String) {
    let (self_id, session) = {
        let guard = inner.lock().await;
        (
            guard.self_id.clone(),
            guard.by_remote.get(via_remote).cloned(),
        )
    };
    let Some(session) = session else {
        return;
    };
    let reply = SyncBusCommand::OpenTabsResult {
        id: new_id("open-r"),
        reply_to: id,
        from: self_id,
        ok: false,
        detail: Some(CLI_NO_BROWSER.into()),
        opened_urls: Vec::new(),
    };
    let _ = session.send_command(&reply).await;
}

async fn reply_fail_ops(inner: Arc<Mutex<HubInner>>, via_remote: &str, id: String) {
    let (self_id, session) = {
        let guard = inner.lock().await;
        (
            guard.self_id.clone(),
            guard.by_remote.get(via_remote).cloned(),
        )
    };
    let Some(session) = session else {
        return;
    };
    let reply = SyncBusCommand::TabsOpsResult {
        id: new_id("ops-r"),
        reply_to: id,
        from: self_id,
        ok: false,
        detail: Some(CLI_NO_BROWSER.into()),
    };
    let _ = session.send_command(&reply).await;
}

async fn reply_fail_bookmarks_import(inner: Arc<Mutex<HubInner>>, via_remote: &str, id: String) {
    let (self_id, session) = {
        let guard = inner.lock().await;
        (
            guard.self_id.clone(),
            guard.by_remote.get(via_remote).cloned(),
        )
    };
    let Some(session) = session else {
        return;
    };
    let reply = SyncBusCommand::BookmarksImportResult {
        id: new_id("bmimp-r"),
        reply_to: id,
        from: self_id,
        ok: false,
        detail: Some(CLI_NO_BROWSER.into()),
        created: 0,
    };
    let _ = session.send_command(&reply).await;
}

async fn reply_fail_bookmarks_ops(inner: Arc<Mutex<HubInner>>, via_remote: &str, id: String) {
    let (self_id, session) = {
        let guard = inner.lock().await;
        (
            guard.self_id.clone(),
            guard.by_remote.get(via_remote).cloned(),
        )
    };
    let Some(session) = session else {
        return;
    };
    let reply = SyncBusCommand::BookmarksOpsResult {
        id: new_id("bmops-r"),
        reply_to: id,
        from: self_id,
        ok: false,
        detail: Some(CLI_NO_BROWSER.into()),
    };
    let _ = session.send_command(&reply).await;
}

async fn reply_fail_search(inner: Arc<Mutex<HubInner>>, via_remote: &str, id: String) {
    let (self_id, session) = {
        let guard = inner.lock().await;
        (
            guard.self_id.clone(),
            guard.by_remote.get(via_remote).cloned(),
        )
    };
    let Some(session) = session else {
        return;
    };
    let reply = SyncBusCommand::SearchQueryResult {
        id: new_id("search-r"),
        reply_to: id,
        from: self_id,
        ok: false,
        detail: Some(CLI_NO_BROWSER.into()),
        hits: Vec::new(),
    };
    let _ = session.send_command(&reply).await;
}

fn busy_set(guard: &mut HubInner) -> HashSet<String> {
    let now = Instant::now();
    guard.offer_busy_until.retain(|_, until| *until > now);
    let mut set = guard.offer_busy_until.keys().cloned().collect::<HashSet<_>>();
    for id in &guard.connected {
        set.insert(id.clone());
    }
    // EN: Also treat sessions that exist but are still connecting as busy.
    for id in guard.by_remote.keys() {
        set.insert(id.clone());
    }
    set
}

async fn send_to(inner: &HubInner, remote_id: &str, cmd: &SyncBusCommand) -> bool {
    let Some(session) = inner.by_remote.get(remote_id) else {
        return false;
    };
    session.send_command(cmd).await.is_ok()
}

async fn announce_to_neighbor(inner: Arc<Mutex<HubInner>>, neighbor_id: &str) {
    let command = {
        let guard = inner.lock().await;
        let connected: Vec<String> = guard.connected.iter().cloned().collect();
        let mut peers = peers_to_announce(&guard.self_id, neighbor_id, &connected);
        peers.truncate(MAX_MESH_PEERS);
        let named: Vec<MeshPeerEntry> = peers
            .into_iter()
            .map(|p| {
                let display_name = guard
                    .display_by_remote
                    .get(&p.device_id)
                    .cloned()
                    .unwrap_or(p.display_name);
                MeshPeerEntry {
                    device_id: p.device_id,
                    display_name,
                }
            })
            .collect();
        SyncBusCommand::MeshPeers {
            id: new_id("mesh-peers"),
            from: guard.self_id.clone(),
            peers: named,
        }
    };
    let guard = inner.lock().await;
    let _ = send_to(&guard, neighbor_id, &command).await;
}

async fn on_connected_set_changed(inner: Arc<Mutex<HubInner>>) {
    let (newcomers, existing, key_changed) = {
        let mut guard = inner.lock().await;
        let mut connected: Vec<String> = guard.connected.iter().cloned().collect();
        connected.sort();
        let key = connected.join(",");
        if key == guard.last_connected_key {
            return;
        }
        let prev: HashSet<String> = if guard.last_connected_key.is_empty() {
            HashSet::new()
        } else {
            guard
                .last_connected_key
                .split(',')
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect()
        };
        guard.last_connected_key = key;
        let newcomers: Vec<String> = connected
            .iter()
            .filter(|id| !prev.contains(*id))
            .cloned()
            .collect();
        let existing: Vec<String> = connected
            .iter()
            .filter(|id| !newcomers.contains(id))
            .cloned()
            .collect();
        (newcomers, existing, true)
    };
    if !key_changed || newcomers.is_empty() {
        return;
    }
    crate::repl_log::line(&format!(
        "mesh: connected set changed; newcomers={}",
        newcomers.join(",")
    ));
    tokio::time::sleep(Duration::from_millis(150)).await;
    for newbie in &newcomers {
        announce_to_neighbor(Arc::clone(&inner), newbie).await;
    }
    for peer in &existing {
        announce_to_neighbor(Arc::clone(&inner), peer).await;
    }
}

async fn remember_peer(inner: &mut HubInner, device_id: &str, display_name: &str) {
    let name = if display_name.trim().is_empty() {
        device_id.to_string()
    } else {
        display_name.trim().to_string()
    };
    inner
        .display_by_remote
        .insert(device_id.to_string(), name);
}

async fn handle_mesh_peers(
    inner: Arc<Mutex<HubInner>>,
    introducer: &str,
    _from: String,
    peers: Vec<MeshPeerEntry>,
) {
    let announced: Vec<MeshPeerAnnounce> = peers
        .into_iter()
        .take(MAX_MESH_PEERS)
        .map(|p| MeshPeerAnnounce {
            device_id: p.device_id,
            display_name: p.display_name,
        })
        .collect();
    let targets = {
        let mut guard = inner.lock().await;
        for peer in &announced {
            if peer.device_id == guard.self_id {
                continue;
            }
            guard
                .relay_by_remote
                .insert(peer.device_id.clone(), introducer.to_string());
            remember_peer(&mut guard, &peer.device_id, &peer.display_name).await;
        }
        let busy = busy_set(&mut guard);
        peers_to_offer_mesh(&guard.self_id, &announced, &busy)
    };
    for target in targets {
        start_directed_offer(
            Arc::clone(&inner),
            target.device_id,
            target.display_name,
            introducer.to_string(),
        )
        .await;
    }
}

async fn start_directed_offer(
    inner: Arc<Mutex<HubInner>>,
    remote_device_id: String,
    remote_display_name: String,
    relay_device_id: String,
) {
    {
        let mut guard = inner.lock().await;
        if remote_device_id == guard.self_id {
            return;
        }
        if busy_set(&mut guard).contains(&remote_device_id) {
            return;
        }
        guard
            .offer_busy_until
            .insert(remote_device_id.clone(), Instant::now() + MESH_OFFER_BUSY_TTL);
        guard
            .relay_by_remote
            .insert(remote_device_id.clone(), relay_device_id.clone());
        remember_peer(&mut guard, &remote_device_id, &remote_display_name).await;
    }

    let (session, events) = match PeerSession::create(remote_device_id.clone(), None).await {
        Ok(pair) => pair,
        Err(err) => {
            eprintln!("mesh: create_offer session failed: {err}");
            let mut guard = inner.lock().await;
            guard.offer_busy_until.remove(&remote_device_id);
            return;
        }
    };
    let bundle = match session.create_offer().await {
        Ok(b) => b,
        Err(err) => {
            eprintln!("mesh: create_offer failed: {err}");
            let mut guard = inner.lock().await;
            guard.offer_busy_until.remove(&remote_device_id);
            return;
        }
    };

    let signal = {
        let mut guard = inner.lock().await;
        let session = Arc::new(session);
        guard
            .remote_by_session
            .insert(session.session_id.clone(), remote_device_id.clone());
        guard
            .by_remote
            .insert(remote_device_id.clone(), Arc::clone(&session));
        let event_tx = guard.event_tx.clone();
        spawn_forwarder(remote_device_id.clone(), events, event_tx);
        SyncBusCommand::MeshSignal {
            id: new_id("mesh-offer"),
            from: guard.self_id.clone(),
            target_device_id: remote_device_id.clone(),
            origin_device_id: guard.self_id.clone(),
            origin_display_name: guard.display_name.clone(),
            family_id: guard.family_id.clone(),
            role: "offer".into(),
            session_id: session.session_id.clone(),
            sdp: bundle.sdp,
            ice: bundle.ice,
        }
    };

    let sent = {
        let guard = inner.lock().await;
        send_to(&guard, &relay_device_id, &signal).await
    };
    if !sent {
        eprintln!("mesh: failed to send directed offer via {relay_device_id}");
        let mut guard = inner.lock().await;
        guard.offer_busy_until.remove(&remote_device_id);
        if let Some(session) = guard.by_remote.remove(&remote_device_id) {
            guard.remote_by_session.remove(&session.session_id);
            drop(guard);
            session.close().await;
        }
    } else {
        eprintln!("mesh: directed offer → {remote_device_id} via {relay_device_id}");
    }
}

async fn handle_mesh_signal(
    inner: Arc<Mutex<HubInner>>,
    via_remote: &str,
    command: SyncBusCommand,
) {
    let SyncBusCommand::MeshSignal {
        target_device_id,
        origin_device_id,
        origin_display_name,
        family_id,
        role,
        session_id,
        sdp,
        ice,
        ..
    } = command
    else {
        return;
    };

    if target_device_id.trim().len() < 8
        || origin_device_id.trim().len() < 8
        || session_id.len() < 8
        || session_id.len() > 64
        || sdp.is_empty()
        || ice.len() > 64
    {
        return;
    }
    if role != "offer" && role != "answer" {
        return;
    }

    let self_id = {
        let guard = inner.lock().await;
        if family_id != guard.family_id {
            return;
        }
        guard.self_id.clone()
    };

    // EN: One-hop forward if we are not the final target.
    if target_device_id != self_id {
        if target_device_id == via_remote {
            return;
        }
        let hop = SyncBusCommand::MeshSignal {
            id: new_id("mesh-hop"),
            from: self_id,
            target_device_id: target_device_id.clone(),
            origin_device_id: origin_device_id.clone(),
            origin_display_name: origin_display_name.clone(),
            family_id: family_id.clone(),
            role: role.clone(),
            session_id: session_id.clone(),
            sdp: sdp.clone(),
            ice: ice.clone(),
        };
        let guard = inner.lock().await;
        if !guard.connected.contains(&target_device_id) {
            return;
        }
        let _ = send_to(&guard, &target_device_id, &hop).await;
        return;
    }

    if role == "offer" {
        {
            let mut guard = inner.lock().await;
            if busy_set(&mut guard).contains(&origin_device_id)
                && guard.connected.contains(&origin_device_id)
            {
                return;
            }
            remember_peer(&mut guard, &origin_device_id, &origin_display_name).await;
            guard
                .relay_by_remote
                .insert(origin_device_id.clone(), via_remote.to_string());
        }

        let (session, events) =
            match PeerSession::create(origin_device_id.clone(), Some(session_id.clone())).await {
                Ok(pair) => pair,
                Err(err) => {
                    eprintln!("mesh: accept session failed: {err}");
                    return;
                }
            };
        let bundle = match session.accept_offer(&sdp, &ice).await {
            Ok(b) => b,
            Err(err) => {
                eprintln!("mesh: accept_offer failed: {err}");
                return;
            }
        };

        let answer = {
            let mut guard = inner.lock().await;
            let session = Arc::new(session);
            guard
                .remote_by_session
                .insert(session.session_id.clone(), origin_device_id.clone());
            guard
                .by_remote
                .insert(origin_device_id.clone(), Arc::clone(&session));
            let event_tx = guard.event_tx.clone();
            spawn_forwarder(origin_device_id.clone(), events, event_tx);
            SyncBusCommand::MeshSignal {
                id: new_id("mesh-answer"),
                from: guard.self_id.clone(),
                target_device_id: origin_device_id.clone(),
                origin_device_id: guard.self_id.clone(),
                origin_display_name: guard.display_name.clone(),
                family_id: guard.family_id.clone(),
                role: "answer".into(),
                session_id: session.session_id.clone(),
                sdp: bundle.sdp,
                ice: bundle.ice,
            }
        };
        let guard = inner.lock().await;
        let _ = send_to(&guard, via_remote, &answer).await;
        eprintln!("mesh: accepted offer from {origin_device_id}; answer via {via_remote}");
        return;
    }

    // answer
    let session = {
        let guard = inner.lock().await;
        let remote = guard
            .remote_by_session
            .get(&session_id)
            .cloned()
            .unwrap_or_else(|| origin_device_id.clone());
        guard.by_remote.get(&remote).cloned()
    };
    let Some(session) = session else {
        eprintln!("mesh: answer for unknown session {session_id}");
        let mut guard = inner.lock().await;
        guard.offer_busy_until.remove(&origin_device_id);
        return;
    };
    if let Err(err) = session.apply_answer(&sdp, &ice).await {
        eprintln!("mesh: apply_answer failed: {err}");
        let mut guard = inner.lock().await;
        guard.offer_busy_until.remove(&origin_device_id);
        return;
    }
    {
        let mut guard = inner.lock().await;
        guard.offer_busy_until.remove(&origin_device_id);
        remember_peer(&mut guard, &origin_device_id, &origin_display_name).await;
        guard
            .by_remote
            .insert(origin_device_id.clone(), Arc::clone(&session));
        guard
            .remote_by_session
            .insert(session.session_id.clone(), origin_device_id.clone());
    }
    eprintln!("mesh: applied answer from {origin_device_id}");
}

fn reply_to_of(cmd: &SyncBusCommand) -> Option<&str> {
    match cmd {
        SyncBusCommand::Ack { reply_to, .. }
        | SyncBusCommand::OpenTabsResult { reply_to, .. }
        | SyncBusCommand::TabsListResult { reply_to, .. }
        | SyncBusCommand::SearchQueryResult { reply_to, .. }
        | SyncBusCommand::SearchQueryChunk { reply_to, .. }
        | SyncBusCommand::TabsOpsResult { reply_to, .. }
        | SyncBusCommand::BookmarksImportResult { reply_to, .. }
        | SyncBusCommand::BookmarksOpsResult { reply_to, .. } => Some(reply_to),
        _ => None,
    }
}

fn new_id(prefix: &str) -> String {
    let mut bytes = [0u8; 8];
    rand::thread_rng().fill_bytes(&mut bytes);
    let suffix = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes);
    format!("{prefix}-{suffix}")
}
