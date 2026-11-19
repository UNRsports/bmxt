//! EN: First-peer WebRTC handshake → BusClient (offer / answer).
//! JA: 最初の peer の WebRTC 握手 → BusClient（offer / answer）。

use anyhow::{anyhow, Result};
use bmxt_peer_rtc::{PeerSession, PeerSessionEvent};

use crate::bus::BusClient;
use crate::config::CliConfig;
use crate::handshake;
use crate::paste;

pub async fn connect_as_offer(cfg: &mut CliConfig, to: String) -> Result<BusClient> {
    let (family_id, _) = cfg.require_family()?;
    let hub = BusClient::create_hub(
        cfg.device_id.clone(),
        cfg.display_name.clone(),
        family_id.to_string(),
    )
    .await;
    connect_as_offer_onto(cfg, &hub, to).await?;
    Ok(hub)
}

pub async fn connect_as_offer_onto(
    cfg: &mut CliConfig,
    hub: &BusClient,
    to: String,
) -> Result<()> {
    cfg.require_family()?;
    let (session, mut events) = PeerSession::create(to, None).await?;
    let (code, _) = handshake::make_offer_code(cfg, &session).await?;
    crate::handshake_delivery::deliver_outbound_code(cfg, "offer", &code)?;
    let answer = paste::read_handshake_paste(&crate::msgs::t_cli(
        "cmd.cli.handshake.pasteAnswerPrompt",
        &[],
    ))?;
    let applied = handshake::apply_answer_code(cfg, &session, &answer).await?;
    let early = wait_connected_brief(&session, &mut events, 60).await?;
    println!(
        "Connected to {} ({}).",
        applied.remote_display_name, applied.remote_device_id
    );
    hub.attach_peer(
        session,
        events,
        applied.remote_device_id,
        applied.remote_display_name,
        early,
    )
    .await;
    Ok(())
}

pub async fn connect_as_answer(cfg: &mut CliConfig, offer_code: &str) -> Result<BusClient> {
    let (family_id, _) = cfg.require_family()?;
    let hub = BusClient::create_hub(
        cfg.device_id.clone(),
        cfg.display_name.clone(),
        family_id.to_string(),
    )
    .await;
    connect_as_answer_onto(cfg, &hub, offer_code).await?;
    Ok(hub)
}

pub async fn connect_as_answer_onto(
    cfg: &mut CliConfig,
    hub: &BusClient,
    offer_code: &str,
) -> Result<()> {
    cfg.require_family()?;
    let (session, mut events) = PeerSession::create("offer-origin".into(), None).await?;
    let accepted = handshake::accept_offer_code(cfg, &session, offer_code).await?;
    crate::handshake_delivery::deliver_outbound_code(cfg, "answer", &accepted.answer_code)?;
    let early = wait_connected_brief(&session, &mut events, 60).await?;
    println!(
        "Connected to {} ({}).",
        accepted.remote_display_name, accepted.remote_device_id
    );
    hub.attach_peer(
        session,
        events,
        accepted.remote_device_id,
        accepted.remote_display_name,
        early,
    )
    .await;
    Ok(())
}

/** EN: Interactive answer role — paste / `:pick` offer, then connect. */
pub async fn connect_as_answer_interactive(cfg: &mut CliConfig) -> Result<BusClient> {
    let offer_code = paste::read_handshake_paste(&crate::msgs::t_cli(
        "cmd.cli.handshake.pasteOfferPrompt",
        &[],
    ))?;
    connect_as_answer(cfg, &offer_code).await
}

pub async fn connect_as_answer_interactive_onto(
    cfg: &mut CliConfig,
    hub: &BusClient,
) -> Result<()> {
    let offer_code = paste::read_handshake_paste(&crate::msgs::t_cli(
        "cmd.cli.handshake.pasteOfferPrompt",
        &[],
    ))?;
    connect_as_answer_onto(cfg, hub, &offer_code).await
}

/**
 * EN: Wait until the DataChannel opens (or fail). Skip ICE checking spam; log
 *     open/fail via `repl_log` so ExternalPrinter restores the BMXt> caret.
 * JA: DataChannel 確立待ち。ICE checking は省略し、open/fail のみ repl_log へ。
 */
pub async fn wait_connected_brief(
    session: &PeerSession,
    events: &mut tokio::sync::mpsc::UnboundedReceiver<PeerSessionEvent>,
    timeout_secs: u64,
) -> Result<Vec<PeerSessionEvent>> {
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(timeout_secs);
    let mut last_ice = String::from("unknown");
    let mut last_pc = String::from("unknown");
    let mut buffered: Vec<PeerSessionEvent> = Vec::new();
    while tokio::time::Instant::now() < deadline {
        if session.data_channel_is_open().await {
            crate::repl_log::line("datachannel: open");
            return Ok(buffered);
        }
        match tokio::time::timeout(std::time::Duration::from_millis(250), events.recv()).await {
            Ok(Some(PeerSessionEvent::ConnectionState(state))) => {
                last_pc = state.clone();
                if state == "failed" || state == "closed" {
                    return Err(anyhow!(
                        "connection {state} (ice={last_ice}). Keep the BMXt prompt window open; retry sync-connect."
                    ));
                }
                if state == "connected" {
                    crate::repl_log::line(&format!("connection: {state}"));
                }
                buffered.push(PeerSessionEvent::ConnectionState(state));
            }
            Ok(Some(PeerSessionEvent::IceConnectionState(state))) => {
                last_ice = state.clone();
                if state == "failed" {
                    return Err(anyhow!(
                        "ICE {state}. Same-PC host candidates should match; retry with a fresh offer/answer pair."
                    ));
                }
                buffered.push(PeerSessionEvent::IceConnectionState(state));
            }
            Ok(Some(PeerSessionEvent::DataChannelOpen)) => {
                crate::repl_log::line("datachannel: open");
                buffered.push(PeerSessionEvent::DataChannelOpen);
                return Ok(buffered);
            }
            Ok(Some(PeerSessionEvent::Command(cmd))) => {
                buffered.push(PeerSessionEvent::Command(cmd));
                if session.data_channel_is_open().await {
                    crate::repl_log::line("datachannel: open");
                    return Ok(buffered);
                }
            }
            Ok(None) => return Err(anyhow!("event channel closed")),
            Err(_) => continue,
        }
    }
    Err(anyhow!(
        "timed out waiting for DataChannel open (pc={last_pc}, ice={last_ice})"
    ))
}
