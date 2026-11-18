use std::time::Duration;

use anyhow::{anyhow, Result};
use bmxt_peer_rtc::{PeerSession, PeerSessionEvent};
use bmxt_sync_wire::{SyncBusCommand, SyncRemoteTabRow, SyncTabsOp, SYNC_REMOTE_QUERY_TIMEOUT_MS};
use tokio::sync::mpsc;
use tokio::time::timeout;

pub struct BusClient {
    pub session: PeerSession,
    events: mpsc::UnboundedReceiver<PeerSessionEvent>,
}

impl BusClient {
    pub fn new(session: PeerSession, events: mpsc::UnboundedReceiver<PeerSessionEvent>) -> Self {
        Self { session, events }
    }

    async fn request(&mut self, cmd: SyncBusCommand) -> Result<SyncBusCommand> {
        let id = cmd.id().to_string();
        self.session.send_command(&cmd).await?;
        let wait = timeout(Duration::from_millis(SYNC_REMOTE_QUERY_TIMEOUT_MS), async {
            loop {
                match self.events.recv().await {
                    Some(PeerSessionEvent::Command(incoming)) => {
                        if let Some(reply_to) = reply_to_of(&incoming) {
                            if reply_to == id {
                                return Ok::<SyncBusCommand, anyhow::Error>(incoming);
                            }
                        }
                    }
                    Some(PeerSessionEvent::ConnectionState(state)) => {
                        if state == "failed" || state == "closed" {
                            return Err(anyhow!("peer connection {state}"));
                        }
                    }
                    None => return Err(anyhow!("event channel closed")),
                }
            }
        })
        .await;
        match wait {
            Ok(Ok(cmd)) => Ok(cmd),
            Ok(Err(e)) => Err(e),
            Err(_) => Err(anyhow!("RPC timeout waiting for {id}")),
        }
    }

    pub async fn ping(&mut self, from: &str) -> Result<SyncBusCommand> {
        let id = new_id("ping");
        let at = chrono::Utc::now().timestamp_millis();
        self.request(SyncBusCommand::Ping {
            id,
            from: from.to_string(),
            at,
        })
        .await
    }

    pub async fn tabs_list(&mut self, from: &str, show_url: bool) -> Result<Vec<SyncRemoteTabRow>> {
        let id = new_id("tabs");
        let resp = self
            .request(SyncBusCommand::TabsList {
                id,
                from: from.to_string(),
                show_url,
            })
            .await?;
        match resp {
            SyncBusCommand::TabsListResult { ok, detail, rows, .. } => {
                if !ok {
                    return Err(anyhow!(detail.unwrap_or_else(|| "tabs_list failed".into())));
                }
                Ok(rows)
            }
            other => Err(anyhow!("unexpected reply: {other:?}")),
        }
    }

    pub async fn tabs_ops(&mut self, from: &str, op: SyncTabsOp) -> Result<()> {
        let id = new_id("ops");
        let resp = self
            .request(SyncBusCommand::TabsOps {
                id,
                from: from.to_string(),
                op,
            })
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

    pub async fn open_tabs(
        &mut self,
        from: &str,
        urls: Vec<String>,
        window_id: Option<i64>,
    ) -> Result<Vec<String>> {
        let id = new_id("open");
        let resp = self
            .request(SyncBusCommand::OpenTabs {
                id,
                from: from.to_string(),
                urls,
                group_title: None,
                group_color: None,
                window_id,
            })
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
                Ok(opened_urls)
            }
            other => Err(anyhow!("unexpected reply: {other:?}")),
        }
    }

    pub async fn search_query(
        &mut self,
        from: &str,
        dispatch_line: String,
    ) -> Result<Vec<bmxt_sync_wire::SyncRemoteSearchHit>> {
        let id = new_id("search");
        let mut hits = Vec::new();
        let first = self
            .request(SyncBusCommand::SearchQuery {
                id: id.clone(),
                from: from.to_string(),
                dispatch_line,
            })
            .await?;
        match first {
            SyncBusCommand::SearchQueryResult {
                ok,
                detail,
                hits: h,
                ..
            } => {
                if !ok {
                    return Err(anyhow!(
                        detail.unwrap_or_else(|| "search_query failed".into())
                    ));
                }
                return Ok(h);
            }
            SyncBusCommand::SearchQueryChunk {
                ok,
                detail,
                eof,
                hits: h,
                ..
            } => {
                if !ok {
                    return Err(anyhow!(
                        detail.unwrap_or_else(|| "search_query failed".into())
                    ));
                }
                hits.extend(h);
                if eof {
                    return Ok(hits);
                }
            }
            other => return Err(anyhow!("unexpected search reply: {other:?}")),
        }
        // EN: Collect remaining chunks keyed by replyTo == request id.
        let deadline = tokio::time::Instant::now()
            + Duration::from_millis(SYNC_REMOTE_QUERY_TIMEOUT_MS);
        while tokio::time::Instant::now() < deadline {
            match timeout(Duration::from_millis(2_000), self.events.recv()).await {
                Ok(Some(PeerSessionEvent::Command(SyncBusCommand::SearchQueryChunk {
                    reply_to,
                    ok,
                    detail,
                    eof,
                    hits: h,
                    ..
                }))) if reply_to == id => {
                    if !ok {
                        return Err(anyhow!(
                            detail.unwrap_or_else(|| "search chunk failed".into())
                        ));
                    }
                    hits.extend(h);
                    if eof {
                        return Ok(hits);
                    }
                }
                Ok(Some(_)) => continue,
                Ok(None) => break,
                Err(_) => break,
            }
        }
        Ok(hits)
    }
}

fn reply_to_of(cmd: &SyncBusCommand) -> Option<&str> {
    match cmd {
        SyncBusCommand::Ack { reply_to, .. }
        | SyncBusCommand::OpenTabsResult { reply_to, .. }
        | SyncBusCommand::TabsListResult { reply_to, .. }
        | SyncBusCommand::SearchQueryResult { reply_to, .. }
        | SyncBusCommand::SearchQueryChunk { reply_to, .. }
        | SyncBusCommand::TabsOpsResult { reply_to, .. } => Some(reply_to),
        _ => None,
    }
}

fn new_id(prefix: &str) -> String {
    let mut bytes = [0u8; 8];
    rand::thread_rng().fill_bytes(&mut bytes);
    let suffix = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes);
    format!("{prefix}-{suffix}")
}

use base64::Engine;
use rand::RngCore;
