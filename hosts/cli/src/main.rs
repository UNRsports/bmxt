mod adapter;
mod bus;
mod config;
mod connect;
mod handshake;
mod mesh_plan;
mod msgs;
mod paste;
mod shell;
mod tui;

use std::path::PathBuf;

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
            command_repl(&mut cfg, Some(client)).await?;
        }
        Some(Commands::SyncAnswer { offer_code }) => {
            let client = connect::connect_as_answer(&cfg, &offer_code).await?;
            command_repl(&mut cfg, Some(client)).await?;
        }
        Some(Commands::SyncConnect { offer, to }) => {
            cfg.require_family()?;
            let client = if offer {
                connect::connect_as_offer(&cfg, to).await?
            } else {
                connect::connect_as_answer_interactive(&cfg).await?
            };
            command_repl(&mut cfg, Some(client)).await?;
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

async fn command_repl(cfg: &mut CliConfig, mut client: Option<BusClient>) -> Result<()> {
    if client.is_some() {
        println!("BMXt CLI — connected. Extension command grammar + line editor.");
        println!(
            "↑↓ history · grey hint · Tab apply · Enter run · e.g. tab -list --peers | browse · help · quit"
        );
    } else {
        println!("BMXt CLI — direct start (not connected yet).");
        println!(
            "Local: sync -setup · sync -pair · sync -status · help · quit"
        );
        println!(
            "Connect: sync -offer  |  sync -accept (Enter/:pick for offer file)  |  or relaunch `bmxt sync-connect`"
        );
        println!("Editing: grey remainder hint · Tab applies · Enter runs");
    }
    let mut shell = PromptShell::open()?;
    let mut continuation: Option<String> = None;
    loop {
        let prompt = match &continuation {
            Some(prefix) => prefix.clone(),
            None => {
                if client.is_some() {
                    "bmxt> ".to_string()
                } else {
                    "bmxt*> ".to_string()
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
                if let Some(c) = client.take() {
                    c.close_all().await;
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
            if let Some(c) = client.take() {
                c.close_all().await;
            }
            break;
        }

        // EN: Offline shortcuts — accept/answer/connect without rtc code → interactive paste/:pick.
        if client.is_none() {
            let offline_connect = match trimmed {
                "sync -accept" | "sync -answer" | "sync -connect" => {
                    Some(connect::connect_as_answer_interactive(&*cfg).await)
                }
                other if other == "sync -offer" || other.starts_with("sync -offer ") => {
                    Some(connect::connect_as_offer(cfg, "pending-peer".into()).await)
                }
                _ => None,
            };
            if let Some(result) = offline_connect {
                shell.remember(trimmed);
                match result {
                    Ok(c) => {
                        client = Some(c);
                        continuation = None;
                        println!("Connected. Prompt is now bmxt> — try `sync -status` / `tab -list`.");
                    }
                    Err(err) => {
                        eprintln!("error: {err:#}");
                        continuation = None;
                    }
                }
                continue;
            }
        }

        let line = match trimmed {
            "ping" => {
                let Some(c) = client.as_ref() else {
                    eprintln!("error: not connected — run `sync -offer` or `sync -accept`");
                    continuation = None;
                    continue;
                };
                let peers = c.list_connected().await;
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
        shell.remember(&line);

        let mut adapter = CliHostAdapter {
            cfg: &mut *cfg,
            client: client.as_ref(),
        };
        match adapter.run_line(&line).await {
            Ok(outcome) => {
                if let Some(c) = outcome.new_client {
                    client = Some(c);
                    println!("Connected. Prompt is now bmxt> — try `sync -status` / `tab -list`.");
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
