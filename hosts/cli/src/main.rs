mod adapter;
mod bus;
mod config;
mod connect;
mod door;
mod handshake;
mod mesh_plan;
mod msgs;
mod paste;
mod shell;
mod tui;

use std::path::PathBuf;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use clap::{Parser, Subcommand};

use crate::adapter::CliHostAdapter;
use crate::bus::BusClient;
use crate::config::CliConfig;
use crate::shell::{PromptShell, ReadOutcome};

#[derive(Debug, Parser)]
#[command(
    name = "bmxt",
    about = "BMXt terminal peer (Family WebRTC command bus)",
    subcommand_required = false
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Start the command REPL without a prior handshake (connect later via sync -offer / -accept)
    Repl,
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
        None | Some(Commands::Repl) => {
            command_repl(&mut cfg, None).await?;
        }
        Some(Commands::Status) => {
            println!("deviceId:    {}", cfg.device_id);
            println!("displayName: {}", cfg.display_name);
            println!(
                "familyId:    {}",
                cfg.family_id.as_deref().unwrap_or("(none)")
            );
            println!("config:      {}", CliConfig::config_path()?.display());
            println!("transport:   WebRTC DataChannel (host ICE, bmxt-rtc1.)");
            println!(
                "localhost:   http://127.0.0.1:{}/ (Family-sealed door; when Family joined)",
                door::DOOR_PORT
            );
        }
        Some(Commands::SyncSetup) => {
            cfg.ensure_family()?;
            let invite = handshake::print_invite(&cfg)?;
            println!("Family ready.");
            println!("Invite (give to browser BMXt / peer):\n{invite}");
        }
        Some(Commands::SyncPair { invite }) => {
            handshake::apply_invite(&mut cfg, &invite)?;
            println!("Joined Family {}", cfg.family_id.as_deref().unwrap_or(""));
        }
        Some(Commands::SyncOffer { to }) => {
            let client = connect::connect_as_offer(&cfg, to).await?;
            command_repl(&mut cfg, Some(Arc::new(client))).await?;
        }
        Some(Commands::SyncAnswer { offer_code }) => {
            let client = connect::connect_as_answer(&cfg, &offer_code).await?;
            command_repl(&mut cfg, Some(Arc::new(client))).await?;
        }
        Some(Commands::SyncConnect { offer, to }) => {
            cfg.require_family()?;
            let client = if offer {
                connect::connect_as_offer(&cfg, to).await?
            } else {
                connect::connect_as_answer_interactive(&cfg).await?
            };
            command_repl(&mut cfg, Some(Arc::new(client))).await?;
        }
        Some(Commands::TabList { .. }) => {
            return Err(anyhow!(
                "tab-list requires a live session — use: bmxt sync-connect --offer, then `tab -list`"
            ));
        }
        Some(Commands::Tui) => {
            tui::run_demo_tui()?;
        }
    }
    Ok(())
}

async fn ensure_hub(cfg: &CliConfig, seed: Option<Arc<BusClient>>) -> Result<Option<Arc<BusClient>>> {
    if let Some(hub) = seed {
        if cfg.family_id.is_some() && cfg.seed_b64.is_some() {
            if let Err(err) = door::spawn_door(cfg.clone(), Arc::clone(&hub)).await {
                eprintln!("localhost door: {err:#}");
            }
        }
        return Ok(Some(hub));
    }
    if cfg.family_id.is_none() || cfg.seed_b64.is_none() {
        return Ok(None);
    }
    let (family_id, _) = cfg.require_family()?;
    let hub = Arc::new(
        BusClient::create_hub(
            cfg.device_id.clone(),
            cfg.display_name.clone(),
            family_id.to_string(),
        )
        .await,
    );
    if let Err(err) = door::spawn_door(cfg.clone(), Arc::clone(&hub)).await {
        eprintln!("localhost door: {err:#}");
    }
    Ok(Some(hub))
}

async fn command_repl(cfg: &mut CliConfig, seed: Option<Arc<BusClient>>) -> Result<()> {
    let mut hub = ensure_hub(cfg, seed).await?;
    let has_peers = match &hub {
        Some(h) => !h.list_connected().await.is_empty(),
        None => false,
    };
    if has_peers {
        println!("BMXt CLI — connected. Extension command grammar + line editor.");
        println!(
            "↑↓ history · grey hint · Tab apply · Enter run · e.g. tab -list --peers | browse · help · quit"
        );
    } else if hub.is_some() {
        println!("BMXt CLI — Family ready · localhost door on :{}.", door::DOOR_PORT);
        println!(
            "Browsers: open BMXt prompt for sealed auto-connect. Fallback: sync -offer / sync -accept"
        );
        println!("Editing: grey remainder hint · Tab applies · Enter runs · help · quit");
    } else {
        println!("BMXt CLI — direct start (not in a Family yet).");
        println!("Local: sync -setup · sync -pair · sync -status · help · quit");
        println!(
            "Then: browsers auto-connect via localhost door, or sync -offer / sync -accept"
        );
        println!("Editing: grey remainder hint · Tab applies · Enter runs");
    }
    let mut shell = PromptShell::open()?;
    let mut continuation: Option<String> = None;
    loop {
        // EN: `BMXt>` = accepting commands (Family ready and/or peers linked).
        //     `BMXt*>` = not in a Family yet (local setup only).
        // JA: `BMXt>` = コマンド受付中（Family 準備済み／peer 接続）。`BMXt*>` = 未参加。
        let prompt = match &continuation {
            Some(prefix) => prefix.clone(),
            None => {
                if hub.is_some() {
                    "BMXt> ".to_string()
                } else {
                    "BMXt*> ".to_string()
                }
            }
        };
        // EN: rustyline is sync; multi-thread runtime allows blocking here.
        let outcome = tokio::task::block_in_place(|| shell.read_line(&prompt))?;
        let typed = match outcome {
            ReadOutcome::Line(s) => s,
            ReadOutcome::Interrupt => {
                continuation = None;
                println!("^C");
                continue;
            }
            ReadOutcome::Eof => {
                if let Some(h) = hub.take() {
                    h.close_all().await;
                }
                break;
            }
        };
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
            shell.remember(trimmed);
            if let Some(h) = hub.take() {
                h.close_all().await;
            }
            break;
        }

        // EN: After sync-setup / sync-pair, stand up the door hub if missing.
        if hub.is_none() && (trimmed.starts_with("sync -setup") || trimmed.starts_with("sync -pair"))
        {
            // fall through to adapter first, then refresh hub below
        }

        // EN: Manual handshake fallback onto the shared hub (or create hub).
        if trimmed == "sync -accept"
            || trimmed == "sync -answer"
            || trimmed == "sync -connect"
            || trimmed == "sync -offer"
            || trimmed.starts_with("sync -offer ")
        {
            shell.remember(trimmed);
            if hub.is_none() {
                match ensure_hub(cfg, None).await {
                    Ok(Some(h)) => hub = Some(h),
                    Ok(None) => {
                        eprintln!("error: join a Family first (sync -setup / sync -pair)");
                        continuation = None;
                        continue;
                    }
                    Err(err) => {
                        eprintln!("error: {err:#}");
                        continuation = None;
                        continue;
                    }
                }
            }
            let Some(h) = hub.as_ref() else {
                continuation = None;
                continue;
            };
            let result = if trimmed == "sync -offer" || trimmed.starts_with("sync -offer ") {
                connect::connect_as_offer_onto(cfg, h.as_ref(), "pending-peer".into()).await
            } else {
                connect::connect_as_answer_interactive_onto(cfg, h.as_ref()).await
            };
            match result {
                Ok(()) => {
                    continuation = None;
                    println!("Connected. Prompt is BMXt> — try `sync -status` / `tab -list`.");
                }
                Err(err) => {
                    eprintln!("error: {err:#}");
                    continuation = None;
                }
            }
            continue;
        }

        let line = match trimmed {
            "ping" => {
                let Some(h) = hub.as_ref() else {
                    eprintln!("error: not connected — open BMXt in a browser, or sync -offer / sync -accept");
                    continuation = None;
                    continue;
                };
                let peers = h.list_connected().await;
                if let Some((id, _)) = peers.first() {
                    format!("sync -ping {id}")
                } else {
                    eprintln!("error: no connected peers (waiting for browser door connect?)");
                    continuation = None;
                    continue;
                }
            }
            other => other.to_string(),
        };
        shell.remember(&line);

        let mut adapter = CliHostAdapter {
            cfg: &mut *cfg,
            client: hub.as_ref().map(|h| h.as_ref()),
        };
        match adapter.run_line(&line).await {
            Ok(outcome) => {
                if let Some(c) = outcome.new_client {
                    // EN: Adapter may still return a fresh hub from older paths — prefer shared.
                    if hub.is_none() {
                        let arc = Arc::new(c);
                        if let Err(err) = door::spawn_door(cfg.clone(), Arc::clone(&arc)).await {
                            eprintln!("localhost door: {err:#}");
                        }
                        hub = Some(arc);
                    }
                    println!("Connected. Prompt is BMXt> — try `sync -status` / `tab -list`.");
                }
                // EN: Family may have been created by sync -setup / -pair in this line.
                if hub.is_none() && cfg.family_id.is_some() && cfg.seed_b64.is_some() {
                    match ensure_hub(cfg, None).await {
                        Ok(Some(h)) => {
                            hub = Some(h);
                            println!(
                                "localhost door listening on http://127.0.0.1:{}/",
                                door::DOOR_PORT
                            );
                        }
                        Ok(None) => {}
                        Err(err) => eprintln!("localhost door: {err:#}"),
                    }
                }
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
