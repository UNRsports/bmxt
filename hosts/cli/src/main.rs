mod adapter;
mod bus;
mod config;
mod handshake;
mod mesh_plan;
mod msgs;
mod paste;
mod tui;

use std::io::{self, Write};
use std::path::PathBuf;

use anyhow::{anyhow, Result};
use bmxt_peer_rtc::PeerSession;
use clap::{Parser, Subcommand};

use crate::adapter::CliHostAdapter;
use crate::bus::BusClient;
use crate::config::CliConfig;

#[derive(Debug, Parser)]
#[command(name = "bmxt", about = "BMXt terminal peer (Family WebRTC command bus)")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Show device / Family / config path
    Status,
    /// Create local Family membership (if missing) and print invite code
    #[command(name = "sync-setup")]
    SyncSetup,
    /// Join Family from bmxt1. invite code
    #[command(name = "sync-pair")]
    SyncPair { invite: String },
    /// Offer role: print bmxt-rtc1. offer, then paste answer
    #[command(name = "sync-offer")]
    SyncOffer {
        #[arg(long, default_value = "pending-peer")]
        to: String,
    },
    /// Answer role: paste offer code, print answer
    #[command(name = "sync-answer")]
    SyncAnswer { offer_code: String },
    /// Interactive connect (offer or answer) then command REPL (same grammar as extension)
    #[command(name = "sync-connect")]
    SyncConnect {
        #[arg(long)]
        offer: bool,
        #[arg(long, default_value = "pending-peer")]
        to: String,
    },
    /// After a live session file… (use sync-connect for MVP)
    #[command(name = "tab-list")]
    TabList {
        #[arg(long)]
        show_url: bool,
        #[arg(long)]
        session: Option<PathBuf>,
    },
    /// Open TUI demo without a live session
    Tui,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    let mut cfg = CliConfig::load_or_create()?;
    match cli.command {
        Commands::Status => {
            println!("deviceId:    {}", cfg.device_id);
            println!("displayName: {}", cfg.display_name);
            println!(
                "familyId:    {}",
                cfg.family_id.as_deref().unwrap_or("(none)")
            );
            println!("config:      {}", CliConfig::config_path()?.display());
            println!("transport:   WebRTC DataChannel (host ICE, bmxt-rtc1.)");
        }
        Commands::SyncSetup => {
            cfg.ensure_family()?;
            let invite = handshake::print_invite(&cfg)?;
            println!("Family ready.");
            println!("Invite (give to browser BMXt / peer):\n{invite}");
        }
        Commands::SyncPair { invite } => {
            handshake::apply_invite(&mut cfg, &invite)?;
            println!("Joined Family {}", cfg.family_id.as_deref().unwrap_or(""));
        }
        Commands::SyncOffer { to } => {
            let client = connect_as_offer(&cfg, to).await?;
            command_repl(&cfg, &client).await?;
        }
        Commands::SyncAnswer { offer_code } => {
            let client = connect_as_answer(&cfg, &offer_code).await?;
            command_repl(&cfg, &client).await?;
        }
        Commands::SyncConnect { offer, to } => {
            cfg.require_family()?;
            let client = if offer {
                connect_as_offer(&cfg, to).await?
            } else {
                let offer_code = paste::read_handshake_paste(
                    "OFFER path (recommended): @/path/to/bmxt-*-offer.json\n> ",
                )?;
                connect_as_answer(&cfg, &offer_code).await?
            };
            command_repl(&cfg, &client).await?;
        }
        Commands::TabList { .. } => {
            return Err(anyhow!(
                "tab-list requires a live session — use: bmxt sync-connect --offer, then `tab -list`"
            ));
        }
        Commands::Tui => {
            tui::run_demo_tui()?;
        }
    }
    Ok(())
}

async fn connect_as_offer(cfg: &CliConfig, to: String) -> Result<BusClient> {
    cfg.require_family()?;
    let (family_id, _) = cfg.require_family()?;
    let (session, mut events) = PeerSession::create(to, None).await?;
    let (code, _) = handshake::make_offer_code(cfg, &session).await?;
    let offer_path = paste::write_handshake_ticket("offer", &code)?;
    println!("=== OFFER (file — prefer this over pasting) ===");
    println!("{}", offer_path.display());
    println!("Open this file in the BMXt wizard (ファイルで渡す / Open), or paste bare code.\n");
    println!("{code}\n");
    let answer = paste::read_handshake_paste(
        "ANSWER path (recommended): @/path/to/bmxt-*-answer.json\n> ",
    )?;
    let applied = handshake::apply_answer_code(cfg, &session, &answer).await?;
    let early = wait_connected(&session, &mut events).await?;
    println!(
        "Connected to {} ({}). Command REPL (extension grammar)…",
        applied.remote_display_name, applied.remote_device_id
    );
    Ok(BusClient::start(
        cfg.device_id.clone(),
        cfg.display_name.clone(),
        family_id.to_string(),
        session,
        events,
        applied.remote_device_id,
        applied.remote_display_name,
        early,
    )
    .await)
}

async fn connect_as_answer(cfg: &CliConfig, offer_code: &str) -> Result<BusClient> {
    cfg.require_family()?;
    let (family_id, _) = cfg.require_family()?;
    let (session, mut events) = PeerSession::create("offer-origin".into(), None).await?;
    let accepted = handshake::accept_offer_code(cfg, &session, offer_code).await?;
    let answer_path = paste::write_handshake_ticket("answer", &accepted.answer_code)?;
    println!("=== ANSWER (file) ===");
    println!("{}", answer_path.display());
    println!("{}\n", accepted.answer_code);
    let early = wait_connected(&session, &mut events).await?;
    println!(
        "Connected to {} ({}). Command REPL (extension grammar)…",
        accepted.remote_display_name, accepted.remote_device_id
    );
    Ok(BusClient::start(
        cfg.device_id.clone(),
        cfg.display_name.clone(),
        family_id.to_string(),
        session,
        events,
        accepted.remote_device_id,
        accepted.remote_display_name,
        early,
    )
    .await)
}

async fn wait_connected(
    session: &bmxt_peer_rtc::PeerSession,
    events: &mut tokio::sync::mpsc::UnboundedReceiver<bmxt_peer_rtc::PeerSessionEvent>,
) -> Result<Vec<bmxt_peer_rtc::PeerSessionEvent>> {
    use bmxt_peer_rtc::PeerSessionEvent;
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(60);
    let mut last_ice = String::from("unknown");
    let mut last_pc = String::from("unknown");
    let mut buffered: Vec<PeerSessionEvent> = Vec::new();
    while tokio::time::Instant::now() < deadline {
        if session.data_channel_is_open().await {
            eprintln!("datachannel: open");
            return Ok(buffered);
        }
        match tokio::time::timeout(std::time::Duration::from_millis(250), events.recv()).await {
            Ok(Some(PeerSessionEvent::ConnectionState(state))) => {
                eprintln!("connection: {state}");
                last_pc = state.clone();
                if state == "failed" || state == "closed" {
                    return Err(anyhow!(
                        "connection {state} (ice={last_ice}). Keep the BMXt prompt window open; retry sync-connect."
                    ));
                }
                buffered.push(PeerSessionEvent::ConnectionState(state));
            }
            Ok(Some(PeerSessionEvent::IceConnectionState(state))) => {
                eprintln!("ice: {state}");
                last_ice = state.clone();
                if state == "failed" {
                    return Err(anyhow!(
                        "ICE {state}. Same-PC host candidates should match; retry with a fresh offer/answer pair."
                    ));
                }
                buffered.push(PeerSessionEvent::IceConnectionState(state));
            }
            Ok(Some(PeerSessionEvent::DataChannelOpen)) => {
                eprintln!("datachannel: open");
                buffered.push(PeerSessionEvent::DataChannelOpen);
                return Ok(buffered);
            }
            Ok(Some(PeerSessionEvent::Command(cmd))) => {
                buffered.push(PeerSessionEvent::Command(cmd));
                if session.data_channel_is_open().await {
                    eprintln!("datachannel: open (with early bus traffic)");
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

async fn command_repl(cfg: &CliConfig, client: &BusClient) -> Result<()> {
    println!("BMXt CLI — same command grammar as the extension prompt.");
    println!("Examples: tab -list --peers | browse · sync -status · sync -ping <deviceId> · help · quit");
    let adapter = CliHostAdapter { cfg, client };
    let mut continuation: Option<String> = None;
    loop {
        let prompt = match &continuation {
            Some(prefix) => format!("{prefix}"),
            None => "bmxt> ".to_string(),
        };
        print!("{prompt}");
        io::stdout().flush()?;
        let mut line = String::new();
        io::stdin().read_line(&mut line)?;
        let typed = line.trim_end_matches(['\r', '\n']).to_string();
        let full = match &continuation {
            Some(prefix) => format!("{prefix}{typed}"),
            None => typed,
        };
        let trimmed = full.trim();
        if trimmed.is_empty() {
            continuation = None;
            continue;
        }
        if trimmed == "quit" || trimmed == "exit" {
            client.close_all().await;
            break;
        }
        // EN: Tiny aliases that map to extension grammar (muscle memory from early CLI).
        let line = match trimmed {
            "ping" => {
                let peers = client.list_connected().await;
                if let Some((id, _)) = peers.first() {
                    format!("sync -ping {id}")
                } else {
                    eprintln!("error: no connected peers");
                    continuation = None;
                    continue;
                }
            }
            other => other.to_string(),
        };
        match adapter.run_line(&line).await {
            Ok(outcome) => {
                continuation = outcome.prompt_prefix;
            }
            Err(err) => {
                eprintln!("error: {err:#}");
                continuation = None;
            }
        }
    }
    Ok(())
}
