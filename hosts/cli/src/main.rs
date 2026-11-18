mod bus;
mod config;
mod handshake;
mod tui;

use std::io::{self, Write};
use std::path::PathBuf;

use anyhow::{anyhow, Context, Result};
use bmxt_peer_rtc::PeerSession;
use bmxt_sync_wire::SyncTabsOp;
use clap::{Parser, Subcommand};

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
    /// Interactive connect (offer or answer) then optional REPL
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
    /// Open TUI picker against a connected peer (sync-connect --tui)
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
            cfg.require_family()?;
            let (session, mut events) = PeerSession::create(to.clone(), None).await?;
            let (code, _) = handshake::make_offer_code(&cfg, &session).await?;
            println!("=== OFFER (paste into BMXt sync wizard) ===\n{code}\n");
            print!("Paste ANSWER code, then Enter:\n> ");
            io::stdout().flush()?;
            let mut answer = String::new();
            io::stdin().read_line(&mut answer)?;
            handshake::apply_answer_code(&cfg, &session, answer.trim()).await?;
            println!("Answer applied. Waiting for DataChannel…");
            wait_connected(&mut events).await?;
            println!("Connected to {to}. Starting bus REPL (ping / tabs / quit).");
            let mut client = BusClient::new(session, events);
            bus_repl(&cfg, &mut client).await?;
        }
        Commands::SyncAnswer { offer_code } => {
            cfg.require_family()?;
            let (session, mut events) =
                PeerSession::create("offer-origin".into(), None).await?;
            let answer = handshake::accept_offer_code(&cfg, &session, &offer_code).await?;
            println!("=== ANSWER (paste back into BMXt) ===\n{answer}\n");
            println!("Waiting for DataChannel…");
            wait_connected(&mut events).await?;
            println!("Connected. Starting bus REPL.");
            let mut client = BusClient::new(session, events);
            bus_repl(&cfg, &mut client).await?;
        }
        Commands::SyncConnect { offer, to } => {
            cfg.require_family()?;
            if offer {
                let (session, mut events) = PeerSession::create(to.clone(), None).await?;
                let (code, _) = handshake::make_offer_code(&cfg, &session).await?;
                println!("=== OFFER ===\n{code}\n");
                print!("Paste ANSWER:\n> ");
                io::stdout().flush()?;
                let mut answer = String::new();
                io::stdin().read_line(&mut answer)?;
                handshake::apply_answer_code(&cfg, &session, answer.trim()).await?;
                wait_connected(&mut events).await?;
                let mut client = BusClient::new(session, events);
                bus_repl(&cfg, &mut client).await?;
            } else {
                print!("Paste OFFER:\n> ");
                io::stdout().flush()?;
                let mut offer_code = String::new();
                io::stdin().read_line(&mut offer_code)?;
                let (session, mut events) =
                    PeerSession::create("offer-origin".into(), None).await?;
                let answer =
                    handshake::accept_offer_code(&cfg, &session, offer_code.trim()).await?;
                println!("=== ANSWER ===\n{answer}\n");
                wait_connected(&mut events).await?;
                let mut client = BusClient::new(session, events);
                bus_repl(&cfg, &mut client).await?;
            }
        }
        Commands::TabList { .. } => {
            return Err(anyhow!(
                "tab-list requires a live session — use: bmxt sync-connect --offer (or without --offer)"
            ));
        }
        Commands::Tui => {
            tui::run_demo_tui()?;
        }
    }
    Ok(())
}

async fn wait_connected(
    events: &mut tokio::sync::mpsc::UnboundedReceiver<bmxt_peer_rtc::PeerSessionEvent>,
) -> Result<()> {
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(60);
    while tokio::time::Instant::now() < deadline {
        match tokio::time::timeout(std::time::Duration::from_secs(1), events.recv()).await {
            Ok(Some(bmxt_peer_rtc::PeerSessionEvent::ConnectionState(state))) => {
                eprintln!("connection: {state}");
                if state == "connected" {
                    return Ok(());
                }
                if state == "failed" || state == "closed" {
                    return Err(anyhow!("connection {state}"));
                }
            }
            Ok(Some(bmxt_peer_rtc::PeerSessionEvent::Command(_))) => {
                // EN: Channel may deliver before state string settles.
                return Ok(());
            }
            Ok(None) => return Err(anyhow!("event channel closed")),
            Err(_) => continue,
        }
    }
    Err(anyhow!("timed out waiting for connected"))
}

async fn bus_repl(cfg: &CliConfig, client: &mut BusClient) -> Result<()> {
    println!("Commands: ping | tabs [--url] | open <url> | close <tabId> | activate <tabId> <windowId> | search <line> | tui | quit");
    loop {
        print!("bmxt> ");
        io::stdout().flush()?;
        let mut line = String::new();
        io::stdin().read_line(&mut line)?;
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if line == "quit" || line == "exit" {
            client.session.close().await;
            break;
        }
        if line == "ping" {
            let ack = client.ping(&cfg.device_id).await.context("ping")?;
            println!("ack: {ack:?}");
            continue;
        }
        if line == "tui" {
            let rows = client.tabs_list(&cfg.device_id, true).await?;
            tui::run_tab_picker(&rows)?;
            continue;
        }
        if line == "tabs" || line.starts_with("tabs ") {
            let show_url = line.contains("--url");
            let rows = client.tabs_list(&cfg.device_id, show_url).await?;
            for row in rows {
                println!("{}", format_row(&row, show_url));
            }
            continue;
        }
        if let Some(url) = line.strip_prefix("open ") {
            let opened = client
                .open_tabs(&cfg.device_id, vec![url.trim().to_string()], None)
                .await?;
            println!("opened: {opened:?}");
            continue;
        }
        if let Some(rest) = line.strip_prefix("close ") {
            let tab_id: i64 = rest.trim().parse().context("tab id")?;
            client
                .tabs_ops(
                    &cfg.device_id,
                    SyncTabsOp::CloseTabs {
                        tab_ids: vec![tab_id],
                    },
                )
                .await?;
            println!("ok");
            continue;
        }
        if let Some(rest) = line.strip_prefix("activate ") {
            let mut parts = rest.split_whitespace();
            let tab_id: i64 = parts.next().unwrap_or("").parse().context("tab id")?;
            let window_id: i64 = parts.next().unwrap_or("").parse().context("window id")?;
            client
                .tabs_ops(
                    &cfg.device_id,
                    SyncTabsOp::Activate { tab_id, window_id },
                )
                .await?;
            println!("ok");
            continue;
        }
        if let Some(rest) = line.strip_prefix("search ") {
            let hits = client
                .search_query(&cfg.device_id, rest.trim().to_string())
                .await?;
            for hit in hits.iter().take(50) {
                println!(
                    "[{}] {} — {}",
                    hit.source, hit.title, hit.url
                );
            }
            println!("({} hits)", hits.len());
            continue;
        }
        println!("unknown command");
    }
    Ok(())
}

fn format_row(row: &bmxt_sync_wire::SyncRemoteTabRow, show_url: bool) -> String {
    use bmxt_sync_wire::SyncRemoteTabRow::*;
    match row {
        Window {
            window_id,
            title,
            focused,
        } => format!("window {window_id} {} {title}", if *focused { "*" } else { " " }),
        Group {
            window_id,
            group_id,
            label,
            ..
        } => format!("  group {group_id:?} win={window_id} {label}"),
        Tab {
            tab_id,
            window_id,
            title,
            url,
            active,
            ..
        } => {
            if show_url {
                format!(
                    "    tab {tab_id} win={window_id} {} {title} {url}",
                    if *active { "*" } else { " " }
                )
            } else {
                format!(
                    "    tab {tab_id} win={window_id} {} {title}",
                    if *active { "*" } else { " " }
                )
            }
        }
    }
}
