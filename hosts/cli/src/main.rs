mod adapter;
mod bus;
mod command_io;
mod config;
mod connect;
mod door;
mod exec_client;
mod handshake;
mod handshake_delivery;
mod mesh_plan;
mod msgs;
mod paste;
#[cfg(test)]
mod posix_io_tests;
mod repl_log;
mod shell;
mod tui;
mod ui_settings_host;

use std::path::PathBuf;
use std::process::ExitCode;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use clap::{Parser, Subcommand};

use crate::adapter::CliHostAdapter;
use crate::bus::BusClient;
use crate::command_io::{CommandIo, InteractionMode};
use crate::config::CliConfig;
use crate::msgs::t_cli;
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
    /// One-shot grammar line against a resident `bmxt` / `bmxt repl` (todo §14)
    Exec {
        /// EN: Grammar tokens after `--` (joined with spaces). If empty, read one stdin line.
        #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
        line: Vec<String>,
    },
}

#[tokio::main]
async fn main() -> Result<ExitCode> {
    let cli = Cli::parse();
    let mut cfg = CliConfig::load_or_create()?;
    if let Err(err) = ui_settings_host::bootstrap_locale() {
        eprintln!("warn: ui settings locale bootstrap failed ({err:#})");
        msgs::set_runtime_locale(&msgs::locale_from_env());
    }
    match cli.command {
        None | Some(Commands::Repl) => {
            command_repl(&mut cfg, None).await?;
            Ok(ExitCode::SUCCESS)
        }
        Some(Commands::Status) => {
            println!("deviceId:    {}", cfg.device_id);
            println!("displayName: {}", cfg.display_name);
            println!(
                "familyId:    {}",
                cfg.family_id.as_deref().unwrap_or("(none)")
            );
            println!("config:      {}", CliConfig::config_path()?.display());
            if let Ok(path) = ui_settings_host::settings_json_path() {
                println!("uiSettings:  {}", path.display());
            }
            println!("locale:      {}", msgs::cli_locale());
            println!(
                "handshake:   delivery={} ticketDir={}",
                cfg.handshake_delivery.as_deref().unwrap_or("ask"),
                cfg.handshake_ticket_dir
                    .as_deref()
                    .unwrap_or("(default ~/.config/bmxt)")
            );
            println!("transport:   WebRTC DataChannel (host ICE, bmxt-rtc1.)");
            println!(
                "localhost:   http://127.0.0.1:{}/ (Family-authenticated listener; when Family joined)",
                door::DOOR_PORT
            );
            Ok(ExitCode::SUCCESS)
        }
        Some(Commands::SyncSetup) => {
            cfg.ensure_family()?;
            let invite = handshake::print_invite(&cfg)?;
            println!("{}", msgs::t_cli("cmd.cli.handshake.familyReady", &[]));
            handshake_delivery::deliver_outbound_code(&mut cfg, "invite", &invite)?;
            Ok(ExitCode::SUCCESS)
        }
        Some(Commands::SyncPair { invite }) => {
            handshake::apply_invite(&mut cfg, &invite)?;
            println!("Joined Family {}", cfg.family_id.as_deref().unwrap_or(""));
            Ok(ExitCode::SUCCESS)
        }
        Some(Commands::SyncOffer { to }) => {
            let client = connect::connect_as_offer(&mut cfg, to).await?;
            command_repl(&mut cfg, Some(Arc::new(client))).await?;
            Ok(ExitCode::SUCCESS)
        }
        Some(Commands::SyncAnswer { offer_code }) => {
            let client = connect::connect_as_answer(&mut cfg, &offer_code).await?;
            command_repl(&mut cfg, Some(Arc::new(client))).await?;
            Ok(ExitCode::SUCCESS)
        }
        Some(Commands::SyncConnect { offer, to }) => {
            cfg.require_family()?;
            let client = if offer {
                connect::connect_as_offer(&mut cfg, to).await?
            } else {
                connect::connect_as_answer_interactive(&mut cfg).await?
            };
            command_repl(&mut cfg, Some(Arc::new(client))).await?;
            Ok(ExitCode::SUCCESS)
        }
        Some(Commands::TabList { .. }) => {
            Err(anyhow!(
                "tab-list requires a live session — use: bmxt sync-connect --offer, then `tab -list`"
            ))
        }
        Some(Commands::Tui) => {
            tui::run_demo_tui()?;
            Ok(ExitCode::SUCCESS)
        }
        Some(Commands::Exec { line }) => {
            let grammar = exec_client::resolve_exec_line(&line)?;
            exec_client::run_exec(&grammar).await
        }
    }
}

async fn ensure_hub(cfg: &CliConfig, seed: Option<Arc<BusClient>>) -> Result<Option<Arc<BusClient>>> {
    if let Some(hub) = seed {
        if cfg.family_id.is_some() && cfg.seed_b64.is_some() {
            if let Err(err) = door::spawn_door(cfg.clone(), Arc::clone(&hub)).await {
                eprintln!("localhost listener: {err:#}");
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
        eprintln!("localhost listener: {err:#}");
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
        println!("{}", t_cli("cmd.cli.banner.connected", &[]));
        println!("{}", t_cli("cmd.cli.banner.connectedHint", &[]));
    } else if hub.is_some() {
        println!(
            "{}",
            t_cli(
                "cmd.cli.banner.familyReady",
                &[("port", &door::DOOR_PORT.to_string())]
            )
        );
        println!("{}", t_cli("cmd.cli.banner.familyReadyHint", &[]));
        println!("{}", t_cli("cmd.cli.banner.editing", &[]));
    } else {
        println!("{}", t_cli("cmd.cli.banner.noFamily", &[]));
        println!("{}", t_cli("cmd.cli.banner.noFamilyHint", &[]));
        println!("{}", t_cli("cmd.cli.banner.noFamilyNext", &[]));
        println!("{}", t_cli("cmd.cli.banner.editing", &[]));
    }
    let mut shell = PromptShell::open()?;
    // EN: Async bus/listener logs use ExternalPrinter so BMXt> + caret redraw after each line.
    if let Err(err) = shell.install_repl_log_printer() {
        eprintln!("warn: external printer unavailable ({err:#}); using stderr logs");
    }
    let mut setting_draft: Option<bmxt_ui_settings::UiSettings> = None;
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
                repl_log::uninstall();
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
            repl_log::uninstall();
            if let Some(h) = hub.take() {
                h.close_all().await;
            }
            break;
        }

        // EN: After sync-setup / sync-pair, stand up the localhost listener hub if missing.
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
                    eprintln!("error: no connected peers (waiting for browser localhost connect?)");
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
            setting_draft: &mut setting_draft,
            mode: InteractionMode::Interactive,
            io: CommandIo::new(),
        };
        match adapter.run_line(&line).await {
            Ok(outcome) => {
                if let Some(c) = outcome.new_client {
                    // EN: Adapter may still return a fresh hub from older paths — prefer shared.
                    if hub.is_none() {
                        let arc = Arc::new(c);
                        if let Err(err) = door::spawn_door(cfg.clone(), Arc::clone(&arc)).await {
                            eprintln!("localhost listener: {err:#}");
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
                                "localhost listener listening on http://127.0.0.1:{}/",
                                door::DOOR_PORT
                            );
                        }
                        Ok(None) => {}
                        Err(err) => eprintln!("localhost listener: {err:#}"),
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
