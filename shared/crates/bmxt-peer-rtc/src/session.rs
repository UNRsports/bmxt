use std::sync::Arc;

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use bmxt_sync_wire::{SyncBusCommand, DATA_CHANNEL_LABEL, WIRE_SOFT_CAP_BYTES};
use rand::RngCore;
use serde_json::{json, Value};
use thiserror::Error;
use tokio::sync::{mpsc, Mutex};
use webrtc::api::interceptor_registry::register_default_interceptors;
use webrtc::api::media_engine::MediaEngine;
use webrtc::api::APIBuilder;
use webrtc::data_channel::data_channel_init::RTCDataChannelInit;
use webrtc::data_channel::data_channel_state::RTCDataChannelState;
use webrtc::data_channel::RTCDataChannel;
use webrtc::ice_transport::ice_candidate::RTCIceCandidateInit;
use webrtc::interceptor::registry::Registry;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use webrtc::peer_connection::RTCPeerConnection;
use webrtc::Error as WebrtcError;

pub type SessionId = String;

#[derive(Debug, Error)]
pub enum PeerRtcError {
    #[error("webrtc: {0}")]
    Webrtc(String),
    #[error("channel not open")]
    ChannelClosed,
    #[error("wire: {0}")]
    Wire(#[from] bmxt_sync_wire::WireError),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
}

impl From<WebrtcError> for PeerRtcError {
    fn from(value: WebrtcError) -> Self {
        PeerRtcError::Webrtc(value.to_string())
    }
}

#[derive(Debug, Clone)]
pub struct LocalDescriptionBundle {
    pub sdp: String,
    pub ice: Vec<String>,
}

#[derive(Debug, Clone)]
pub enum PeerSessionEvent {
    ConnectionState(String),
    IceConnectionState(String),
    DataChannelOpen,
    Command(SyncBusCommand),
}

pub struct PeerSession {
    pub session_id: SessionId,
    pub remote_device_id: String,
    pc: Arc<RTCPeerConnection>,
    channel: Arc<Mutex<Option<Arc<RTCDataChannel>>>>,
    collected_ice: Arc<Mutex<Vec<String>>>,
    events: mpsc::UnboundedSender<PeerSessionEvent>,
}

fn new_session_id() -> String {
    let mut bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

/** EN: Browser peers expect a non-empty sdpMid (usually `"0"` for the data m-line). */
fn normalize_ice_candidate_json(raw: &str) -> String {
    let Ok(mut value) = serde_json::from_str::<Value>(raw) else {
        return raw.to_string();
    };
    let Some(obj) = value.as_object_mut() else {
        return raw.to_string();
    };
    let mid_empty = match obj.get("sdpMid") {
        None => true,
        Some(Value::Null) => true,
        Some(Value::String(s)) => s.is_empty(),
        Some(_) => false,
    };
    if mid_empty {
        obj.insert("sdpMid".to_string(), json!("0"));
    }
    serde_json::to_string(&value).unwrap_or_else(|_| raw.to_string())
}

fn sdp_has_candidates(sdp: &str) -> bool {
    sdp.lines().any(|line| line.starts_with("a=candidate:"))
}

async fn build_peer_connection() -> Result<Arc<RTCPeerConnection>, PeerRtcError> {
    let mut media = MediaEngine::default();
    media.register_default_codecs()?;
    let mut registry = Registry::new();
    registry = register_default_interceptors(registry, &mut media)?;
    let api = APIBuilder::new()
        .with_media_engine(media)
        .with_interceptor_registry(registry)
        .build();
    // EN: Host ICE only — empty iceServers (matches extension RTC_CONFIG).
    let config = RTCConfiguration {
        ice_servers: vec![],
        ..Default::default()
    };
    let pc = api.new_peer_connection(config).await?;
    Ok(Arc::new(pc))
}

impl PeerSession {
    pub async fn create(
        remote_device_id: String,
        session_id: Option<String>,
    ) -> Result<(Self, mpsc::UnboundedReceiver<PeerSessionEvent>), PeerRtcError> {
        let (tx, rx) = mpsc::unbounded_channel();
        let pc = build_peer_connection().await?;
        let session_id = session_id.unwrap_or_else(new_session_id);
        let collected_ice = Arc::new(Mutex::new(Vec::new()));
        let channel = Arc::new(Mutex::new(None));

        {
            let ice_buf = Arc::clone(&collected_ice);
            pc.on_ice_candidate(Box::new(move |candidate| {
                let ice_buf = Arc::clone(&ice_buf);
                Box::pin(async move {
                    if let Some(c) = candidate {
                        if let Ok(json) = c.to_json() {
                            if let Ok(text) = serde_json::to_string(&json) {
                                let normalized = normalize_ice_candidate_json(&text);
                                ice_buf.lock().await.push(normalized);
                            }
                        }
                    }
                })
            }));
        }

        {
            let events = tx.clone();
            pc.on_peer_connection_state_change(Box::new(move |state| {
                let events = events.clone();
                Box::pin(async move {
                    let _ = events.send(PeerSessionEvent::ConnectionState(state.to_string()));
                })
            }));
        }

        {
            let events = tx.clone();
            pc.on_ice_connection_state_change(Box::new(move |state| {
                let events = events.clone();
                Box::pin(async move {
                    let _ = events.send(PeerSessionEvent::IceConnectionState(state.to_string()));
                })
            }));
        }

        {
            let channel_slot = Arc::clone(&channel);
            let events = tx.clone();
            pc.on_data_channel(Box::new(move |dc| {
                let channel_slot = Arc::clone(&channel_slot);
                let events = events.clone();
                Box::pin(async move {
                    bind_channel(dc, channel_slot, events).await;
                })
            }));
        }

        Ok((
            Self {
                session_id,
                remote_device_id,
                pc,
                channel,
                collected_ice,
                events: tx,
            },
            rx,
        ))
    }

    async fn local_bundle(&self) -> LocalDescriptionBundle {
        let sdp = self
            .pc
            .local_description()
            .await
            .map(|d| d.sdp)
            .unwrap_or_default();
        let ice = self.collected_ice.lock().await.clone();
        LocalDescriptionBundle { sdp, ice }
    }

    pub async fn create_offer(&self) -> Result<LocalDescriptionBundle, PeerRtcError> {
        let dc = self
            .pc
            .create_data_channel(
                DATA_CHANNEL_LABEL,
                Some(RTCDataChannelInit {
                    ordered: Some(true),
                    ..Default::default()
                }),
            )
            .await?;
        bind_channel(dc, Arc::clone(&self.channel), self.events.clone()).await;
        let offer = self.pc.create_offer(None).await?;
        self.pc.set_local_description(offer).await?;
        self.wait_ice_gathering().await?;
        Ok(self.local_bundle().await)
    }

    pub async fn accept_offer(
        &self,
        sdp: &str,
        remote_ice: &[String],
    ) -> Result<LocalDescriptionBundle, PeerRtcError> {
        let offer = RTCSessionDescription::offer(sdp.to_string())?;
        self.pc.set_remote_description(offer).await?;
        self.apply_remote_ice(sdp, remote_ice).await?;
        let answer = self.pc.create_answer(None).await?;
        self.pc.set_local_description(answer).await?;
        self.wait_ice_gathering().await?;
        Ok(self.local_bundle().await)
    }

    pub async fn apply_answer(&self, sdp: &str, remote_ice: &[String]) -> Result<(), PeerRtcError> {
        let answer = RTCSessionDescription::answer(sdp.to_string())?;
        self.pc.set_remote_description(answer).await?;
        self.apply_remote_ice(sdp, remote_ice).await?;
        Ok(())
    }

    async fn apply_remote_ice(&self, sdp: &str, remote_ice: &[String]) -> Result<(), PeerRtcError> {
        // EN: After ICE gathering, SDP already embeds a=candidate lines (non-trickle).
        //     Re-adding the same candidates via addIceCandidate can fail the native stack.
        if sdp_has_candidates(sdp) {
            return Ok(());
        }
        for candidate_json in remote_ice {
            let normalized = normalize_ice_candidate_json(candidate_json);
            if let Err(err) = self.add_ice_candidate(&normalized).await {
                eprintln!("warn: skip ICE candidate: {err}");
            }
        }
        Ok(())
    }

    async fn add_ice_candidate(&self, candidate_json: &str) -> Result<(), PeerRtcError> {
        let init: RTCIceCandidateInit = serde_json::from_str(candidate_json)?;
        self.pc.add_ice_candidate(init).await?;
        Ok(())
    }

    async fn wait_ice_gathering(&self) -> Result<(), PeerRtcError> {
        let mut rx = self.pc.gathering_complete_promise().await;
        let _ = rx.recv().await;
        Ok(())
    }

    pub async fn data_channel_is_open(&self) -> bool {
        let guard = self.channel.lock().await;
        match guard.as_ref() {
            Some(dc) => dc.ready_state() == RTCDataChannelState::Open,
            None => false,
        }
    }

    pub async fn send_command(&self, command: &SyncBusCommand) -> Result<(), PeerRtcError> {
        let text = command.to_text()?;
        if text.len() > WIRE_SOFT_CAP_BYTES {
            return Err(PeerRtcError::Wire(bmxt_sync_wire::WireError::TooLarge));
        }
        // EN: Brief wait — ICE can report connected before SCTP/DataChannel is open.
        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(10);
        loop {
            {
                let guard = self.channel.lock().await;
                if let Some(dc) = guard.as_ref() {
                    if dc.ready_state() == RTCDataChannelState::Open {
                        dc.send_text(text).await?;
                        return Ok(());
                    }
                }
            }
            if tokio::time::Instant::now() >= deadline {
                return Err(PeerRtcError::ChannelClosed);
            }
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        }
    }

    pub async fn close(&self) {
        let _ = self.pc.close().await;
    }
}

async fn bind_channel(
    dc: Arc<RTCDataChannel>,
    slot: Arc<Mutex<Option<Arc<RTCDataChannel>>>>,
    events: mpsc::UnboundedSender<PeerSessionEvent>,
) {
    {
        let mut guard = slot.lock().await;
        *guard = Some(Arc::clone(&dc));
    }
    {
        let events = events.clone();
        dc.on_open(Box::new(move || {
            let events = events.clone();
            Box::pin(async move {
                let _ = events.send(PeerSessionEvent::DataChannelOpen);
            })
        }));
    }
    // EN: If open already fired before on_open was registered, emit now.
    if dc.ready_state() == RTCDataChannelState::Open {
        let _ = events.send(PeerSessionEvent::DataChannelOpen);
    }
    dc.on_message(Box::new(move |msg| {
        let events = events.clone();
        Box::pin(async move {
            let text = if msg.is_string {
                String::from_utf8_lossy(&msg.data).to_string()
            } else {
                match String::from_utf8(msg.data.to_vec()) {
                    Ok(s) => s,
                    Err(_) => return,
                }
            };
            match SyncBusCommand::parse_text(&text) {
                Ok(cmd) => {
                    let _ = events.send(PeerSessionEvent::Command(cmd));
                }
                Err(_) => {
                    let _: Result<Value, _> = serde_json::from_str(&text);
                }
            }
        })
    }));
}
