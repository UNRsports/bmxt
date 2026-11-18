//! EN: CliHostAdapter — apply bmxt-core DispatchBundle via Family DataChannel / local CLI.
//! JA: CliHostAdapter。bmxt-core の DispatchBundle を Family DC / ローカル CLI で実行する。

use anyhow::{anyhow, Result};
use bmxt_core::compound::{
    plan_compound_line, should_run_after_operator, CompoundPlanResult, ParseSegmentError,
    EXIT_FAILURE, EXIT_MISUSE, EXIT_SUCCESS,
};
use bmxt_core::ir::{DispatchBundle, HostEffect, UiAction};
use bmxt_core::pipe_consumer::{classify_pipe_consumer, PipeConsumerClass};
use bmxt_core::run_line;
use bmxt_sync_wire::{SyncRemoteTabRow, SyncTabsOp};

use crate::bus::BusClient;
use crate::config::CliConfig;
use crate::msgs::expand_msgs;
use crate::tui;

pub struct CliHostAdapter<'a> {
    pub cfg: &'a CliConfig,
    pub client: &'a BusClient,
}

pub struct RunOutcome {
    pub exit_status: i32,
    pub prompt_prefix: Option<String>,
}

impl<'a> CliHostAdapter<'a> {
    pub async fn run_line(&self, line: &str) -> Result<RunOutcome> {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return Ok(RunOutcome {
                exit_status: EXIT_SUCCESS,
                prompt_prefix: None,
            });
        }

        match plan_compound_line(trimmed) {
            CompoundPlanResult::Err { error, .. } => {
                eprintln!("{}", format_parse_error(error));
                Ok(RunOutcome {
                    exit_status: EXIT_MISUSE,
                    prompt_prefix: None,
                })
            }
            CompoundPlanResult::Ok(plan) => {
                let mut last_status = EXIT_SUCCESS;
                let mut prompt_prefix = None;
                for (index, pipe) in plan.pipes.iter().enumerate() {
                    if index > 0 {
                        let op = plan
                            .operators
                            .get(index - 1)
                            .map(String::as_str)
                            .unwrap_or(";");
                        if !should_run_after_operator(op, last_status) {
                            break;
                        }
                    }
                    let outcome = self.run_pipe(pipe).await?;
                    last_status = outcome.exit_status;
                    if outcome.prompt_prefix.is_some() {
                        prompt_prefix = outcome.prompt_prefix;
                    }
                }
                Ok(RunOutcome {
                    exit_status: last_status,
                    prompt_prefix,
                })
            }
        }
    }

    async fn run_pipe(&self, segments: &[String]) -> Result<RunOutcome> {
        if segments.is_empty() {
            return Ok(RunOutcome {
                exit_status: EXIT_MISUSE,
                prompt_prefix: None,
            });
        }
        if segments.len() == 1 {
            return self.apply_bundle(run_line(&segments[0])).await;
        }

        let producer = &segments[0];
        let consumer_seg = segments[1..].join(" ");
        let Some(consumer) = classify_pipe_consumer(&consumer_seg) else {
            eprintln!("error: unknown pipe consumer: {consumer_seg}");
            return Ok(RunOutcome {
                exit_status: EXIT_MISUSE,
                prompt_prefix: None,
            });
        };

        let producer_bundle = run_line(producer);
        match consumer {
            PipeConsumerClass::Browse => {
                let rows = self.materialize_tab_rows(&producer_bundle).await?;
                if rows.is_empty() {
                    println!("(empty list)");
                    return Ok(RunOutcome {
                        exit_status: EXIT_SUCCESS,
                        prompt_prefix: None,
                    });
                }
                tui::run_tab_picker(&rows)?;
                Ok(RunOutcome {
                    exit_status: EXIT_SUCCESS,
                    prompt_prefix: None,
                })
            }
            PipeConsumerClass::Close => {
                let rows = self.materialize_tab_rows(&producer_bundle).await?;
                let tab_ids = tab_ids_from_rows(&rows);
                if tab_ids.is_empty() {
                    eprintln!("error: no tab ids in pipe list for close");
                    return Ok(RunOutcome {
                        exit_status: EXIT_FAILURE,
                        prompt_prefix: None,
                    });
                }
                self.client
                    .tabs_ops(
                        &self.cfg.device_id,
                        SyncTabsOp::CloseTabs { tab_ids },
                    )
                    .await?;
                println!("ok");
                Ok(RunOutcome {
                    exit_status: EXIT_SUCCESS,
                    prompt_prefix: None,
                })
            }
            PipeConsumerClass::Open { .. } => {
                let rows = self.materialize_tab_rows(&producer_bundle).await?;
                let urls = urls_from_rows(&rows);
                if urls.is_empty() {
                    eprintln!("error: no urls in pipe list for open");
                    return Ok(RunOutcome {
                        exit_status: EXIT_FAILURE,
                        prompt_prefix: None,
                    });
                }
                let opened = self
                    .client
                    .open_tabs(&self.cfg.device_id, urls, None)
                    .await?;
                println!("opened: {opened:?}");
                Ok(RunOutcome {
                    exit_status: EXIT_SUCCESS,
                    prompt_prefix: None,
                })
            }
            other => {
                eprintln!("error: pipe consumer not supported on CLI yet: {other:?}");
                Ok(RunOutcome {
                    exit_status: EXIT_MISUSE,
                    prompt_prefix: None,
                })
            }
        }
    }

    async fn apply_bundle(&self, bundle: DispatchBundle) -> Result<RunOutcome> {
        let exit_status = bundle.exit_status();
        match bundle {
            DispatchBundle::Lines { lines, .. } => {
                for line in lines {
                    println!("{line}");
                }
                Ok(RunOutcome {
                    exit_status,
                    prompt_prefix: None,
                })
            }
            DispatchBundle::Msgs {
                msgs,
                prompt_prefix,
                ..
            } => {
                for line in expand_msgs(&msgs) {
                    println!("{line}");
                }
                Ok(RunOutcome {
                    exit_status,
                    prompt_prefix,
                })
            }
            DispatchBundle::Effects { effects, .. } => {
                for effect in effects {
                    self.apply_effect(effect).await?;
                }
                Ok(RunOutcome {
                    exit_status,
                    prompt_prefix: None,
                })
            }
            DispatchBundle::Ui { action, .. } => self.apply_ui(action).await,
        }
    }

    async fn apply_effect(&self, effect: HostEffect) -> Result<()> {
        match effect {
            HostEffect::ClearLog => {
                println!("--- clear ---");
                Ok(())
            }
            HostEffect::OpenUrlNewTab { url }
            | HostEffect::OpenUrlNewWindow { url }
            | HostEffect::OpenUrlIntoWindow { url, .. }
            | HostEffect::NavigateCurrentTab { url }
            | HostEffect::TabsMoveUrl { url }
            | HostEffect::OpenUrlIntoGroup { url, .. } => {
                let opened = self
                    .client
                    .open_tabs(&self.cfg.device_id, vec![url], None)
                    .await?;
                println!("opened: {opened:?}");
                Ok(())
            }
            HostEffect::CloseTab { tab_id } => {
                self.client
                    .tabs_ops(
                        &self.cfg.device_id,
                        SyncTabsOp::CloseTabs {
                            tab_ids: vec![tab_id],
                        },
                    )
                    .await?;
                println!("ok");
                Ok(())
            }
            HostEffect::CloseCurrentTab | HostEffect::CloseCurrentWindow => Err(anyhow!(
                "close current tab/window needs a browser host — use `tab -list | close` or `close <tabId>`"
            )),
            HostEffect::TabReload { tab_ids } => {
                self.client
                    .tabs_ops(&self.cfg.device_id, SyncTabsOp::Reload { tab_ids })
                    .await?;
                println!("ok");
                Ok(())
            }
            HostEffect::TabGoBack { .. } | HostEffect::TabGoForward { .. } => Err(anyhow!(
                "back/forward: use the BMXt prompt, or extend CLI pipe support later"
            )),
            HostEffect::TabsList {
                device_id,
                device_scope,
                show_url,
            } => {
                let show = show_url == "true";
                let rows = self
                    .fetch_tabs_scope(&device_scope, &device_id, show)
                    .await?;
                print_tab_rows(&rows, show);
                Ok(())
            }
            HostEffect::SearchList {
                dispatch_line,
                peer_dispatch_line,
                device_scope,
                ..
            } => {
                let line = if peer_dispatch_line.is_empty() {
                    dispatch_line
                } else if device_scope == "local" || device_scope.is_empty() {
                    peer_dispatch_line
                } else {
                    peer_dispatch_line
                };
                let hits = self.client.search_query(&self.cfg.device_id, line).await?;
                for hit in hits.iter().take(50) {
                    println!("[{}] {} — {}", hit.source, hit.title, hit.url);
                }
                println!("({} hits)", hits.len());
                Ok(())
            }
            HostEffect::ExitPane => Ok(()),
            HostEffect::OpenWelcomePage => Err(anyhow!(
                "welcome page is extension-only — open BMXt in the browser"
            )),
            other => Err(anyhow!(
                "host effect not supported on CLI: {}",
                effect_kind(&other)
            )),
        }
    }

    async fn apply_ui(&self, action: UiAction) -> Result<RunOutcome> {
        match action {
            UiAction::ShowHelp => {
                // EN: Prefer msgs from `help` (avoid ShowHelp → help → ShowHelp loops).
                match run_line("help") {
                    DispatchBundle::Msgs { msgs, .. } => {
                        for line in expand_msgs(&msgs) {
                            println!("{line}");
                        }
                    }
                    other => {
                        let _ = other;
                        println!("help");
                    }
                }
                Ok(RunOutcome {
                    exit_status: EXIT_SUCCESS,
                    prompt_prefix: None,
                })
            }
            UiAction::ContinuationPrompt { prefix } => Ok(RunOutcome {
                exit_status: EXIT_SUCCESS,
                prompt_prefix: Some(prefix),
            }),
            UiAction::OpenPlainList {
                list_id,
                show_url,
                device_scope,
                device_id,
                ..
            } => {
                if list_id != "tabs" {
                    eprintln!(
                        "error: list `{list_id}` on CLI is limited to tabs for now"
                    );
                    return Ok(RunOutcome {
                        exit_status: EXIT_MISUSE,
                        prompt_prefix: None,
                    });
                }
                let show = show_url == "true";
                let rows = self
                    .fetch_tabs_scope(&device_scope, &device_id, show)
                    .await?;
                print_tab_rows(&rows, show);
                Ok(RunOutcome {
                    exit_status: EXIT_SUCCESS,
                    prompt_prefix: None,
                })
            }
            UiAction::OpenPicker {
                list_id,
                show_url,
                device_scope,
                device_id,
                ..
            } => {
                if list_id != "tabs" {
                    eprintln!(
                        "error: picker `{list_id}` on CLI is limited to tabs for now"
                    );
                    return Ok(RunOutcome {
                        exit_status: EXIT_MISUSE,
                        prompt_prefix: None,
                    });
                }
                let show = show_url == "true";
                let rows = self
                    .fetch_tabs_scope(&device_scope, &device_id, show)
                    .await?;
                tui::run_tab_picker(&rows)?;
                Ok(RunOutcome {
                    exit_status: EXIT_SUCCESS,
                    prompt_prefix: None,
                })
            }
            UiAction::SyncStatus => {
                let peers = self.client.list_connected().await;
                println!("deviceId:    {}", self.cfg.device_id);
                println!("displayName: {}", self.cfg.display_name);
                println!(
                    "familyId:    {}",
                    self.cfg.family_id.as_deref().unwrap_or("(none)")
                );
                if peers.is_empty() {
                    println!("peers:       (none connected)");
                } else {
                    println!("peers:");
                    for (id, name) in peers {
                        println!("  {name}\t{id}");
                    }
                }
                Ok(RunOutcome {
                    exit_status: EXIT_SUCCESS,
                    prompt_prefix: None,
                })
            }
            UiAction::SyncMembers => {
                let peers = self.client.list_connected().await;
                for (id, name) in peers {
                    println!("{name}\t{id}");
                }
                Ok(RunOutcome {
                    exit_status: EXIT_SUCCESS,
                    prompt_prefix: None,
                })
            }
            UiAction::SyncPing { device_id } => {
                let connected = self.client.list_connected().await;
                if !connected.iter().any(|(id, _)| id == &device_id) {
                    return Err(anyhow!(
                        "not connected to {device_id} — run `sync -status` / `sync -members`"
                    ));
                }
                let ack = self
                    .client
                    .ping_one(&self.cfg.device_id, &device_id)
                    .await?;
                println!("ack[{device_id}]: {ack:?}");
                Ok(RunOutcome {
                    exit_status: EXIT_SUCCESS,
                    prompt_prefix: None,
                })
            }
            UiAction::SyncSetup | UiAction::SyncPair { .. } => {
                eprintln!(
                    "use outside REPL: `bmxt sync-setup` / `bmxt sync-pair '<invite>'` (Family join)"
                );
                Ok(RunOutcome {
                    exit_status: EXIT_MISUSE,
                    prompt_prefix: None,
                })
            }
            UiAction::SyncOffer
            | UiAction::SyncAnswer { .. }
            | UiAction::SyncAccept { .. }
            | UiAction::SyncConnect { .. } => {
                eprintln!(
                    "handshake stays on `bmxt sync-connect` (or wizard in the BMXt prompt window)"
                );
                Ok(RunOutcome {
                    exit_status: EXIT_MISUSE,
                    prompt_prefix: None,
                })
            }
            UiAction::ClosePicker { .. } | UiAction::PickerPass => Ok(RunOutcome {
                exit_status: EXIT_SUCCESS,
                prompt_prefix: None,
            }),
            other => {
                eprintln!(
                    "error: ui action not supported on CLI: {}",
                    ui_kind(&other)
                );
                Ok(RunOutcome {
                    exit_status: EXIT_MISUSE,
                    prompt_prefix: None,
                })
            }
        }
    }

    async fn materialize_tab_rows(
        &self,
        bundle: &DispatchBundle,
    ) -> Result<Vec<SyncRemoteTabRow>> {
        match bundle {
            DispatchBundle::Ui {
                action:
                    UiAction::OpenPlainList {
                        list_id,
                        show_url,
                        device_scope,
                        device_id,
                        ..
                    }
                    | UiAction::OpenPicker {
                        list_id,
                        show_url,
                        device_scope,
                        device_id,
                        ..
                    },
                ..
            } if list_id == "tabs" => {
                self.fetch_tabs_scope(device_scope, device_id, show_url == "true")
                    .await
            }
            DispatchBundle::Effects { effects, .. } => {
                for effect in effects {
                    if let HostEffect::TabsList {
                        device_id,
                        device_scope,
                        show_url,
                    } = effect
                    {
                        return self
                            .fetch_tabs_scope(device_scope, device_id, show_url == "true")
                            .await;
                    }
                }
                Err(anyhow!("pipe producer did not yield a tabs list"))
            }
            other => Err(anyhow!(
                "pipe producer must be a tabs list plan, got {:?}",
                std::mem::discriminant(other)
            )),
        }
    }

    async fn fetch_tabs_scope(
        &self,
        device_scope: &str,
        device_id: &str,
        show_url: bool,
    ) -> Result<Vec<SyncRemoteTabRow>> {
        match device_scope {
            "device" if !device_id.is_empty() => {
                let bundles = self.client.tabs_all(&self.cfg.device_id, show_url).await?;
                let mut out = Vec::new();
                for (id, name, rows) in bundles {
                    if id == device_id {
                        out.push(SyncRemoteTabRow::Window {
                            window_id: -1,
                            title: format!("── {name} ──"),
                            focused: false,
                        });
                        out.extend(rows);
                    }
                }
                if out.is_empty() {
                    return Err(anyhow!("not connected to device {device_id}"));
                }
                Ok(out)
            }
            "peers" | "" | "local" => {
                // EN: CLI has no local browser inventory — peers/local → all connected browsers.
                let bundles = self.client.tabs_all(&self.cfg.device_id, show_url).await?;
                let mut out = Vec::new();
                for (_id, name, rows) in bundles {
                    out.push(SyncRemoteTabRow::Window {
                        window_id: -1,
                        title: format!("── {name} ──"),
                        focused: false,
                    });
                    out.extend(rows);
                }
                Ok(out)
            }
            other => Err(anyhow!("unknown device_scope: {other}")),
        }
    }
}

fn format_parse_error(error: ParseSegmentError) -> String {
    match error {
        ParseSegmentError::UnclosedQuote => "error: unclosed quote".into(),
        ParseSegmentError::DanglingOperator => "error: dangling compound operator".into(),
        ParseSegmentError::EmptySegment => "error: empty command segment".into(),
    }
}

fn tab_ids_from_rows(rows: &[SyncRemoteTabRow]) -> Vec<i64> {
    let mut ids = Vec::new();
    for row in rows {
        if let SyncRemoteTabRow::Tab { tab_id, .. } = row {
            ids.push(*tab_id);
        }
    }
    ids
}

fn urls_from_rows(rows: &[SyncRemoteTabRow]) -> Vec<String> {
    let mut urls = Vec::new();
    for row in rows {
        if let SyncRemoteTabRow::Tab { url, .. } = row {
            if !url.is_empty() {
                urls.push(url.clone());
            }
        }
    }
    urls
}

fn print_tab_rows(rows: &[SyncRemoteTabRow], show_url: bool) {
    for row in rows {
        println!("{}", format_row(row, show_url));
    }
}

fn format_row(row: &SyncRemoteTabRow, show_url: bool) -> String {
    match row {
        SyncRemoteTabRow::Window {
            window_id,
            title,
            focused,
        } => format!(
            "window {window_id} {} {title}",
            if *focused { "*" } else { " " }
        ),
        SyncRemoteTabRow::Group {
            window_id,
            group_id,
            label,
            ..
        } => format!("  group {group_id:?} win={window_id} {label}"),
        SyncRemoteTabRow::Tab {
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

fn effect_kind(effect: &HostEffect) -> &'static str {
    match effect {
        HostEffect::ClearLog => "clear_log",
        HostEffect::CloseCurrentTab => "close_current_tab",
        HostEffect::CloseCurrentWindow => "close_current_window",
        HostEffect::CloseTab { .. } => "close_tab",
        HostEffect::DomList { .. } => "dom_list",
        HostEffect::ExitPane => "exit_pane",
        HostEffect::GroupAdd { .. } => "group_add",
        HostEffect::GroupNew { .. } => "group_new",
        HostEffect::NavigateCurrentTab { .. } => "navigate_current_tab",
        HostEffect::OpenUrlIntoGroup { .. } => "open_url_into_group",
        HostEffect::OpenUrlIntoWindow { .. } => "open_url_into_window",
        HostEffect::OpenUrlNewTab { .. } => "open_url_new_tab",
        HostEffect::OpenUrlNewWindow { .. } => "open_url_new_window",
        HostEffect::OpenWelcomePage => "open_welcome_page",
        HostEffect::SearchBookmark { .. } => "search_bookmark",
        HostEffect::SearchHistory { .. } => "search_history",
        HostEffect::SearchList { .. } => "search_list",
        HostEffect::SearchPage { .. } => "search_page",
        HostEffect::SearchSnapshot { .. } => "search_snapshot",
        HostEffect::SessionNew { .. } => "session_new",
        HostEffect::SessionNext => "session_next",
        HostEffect::SessionPrev => "session_prev",
        HostEffect::TabGoBack { .. } => "tab_go_back",
        HostEffect::TabGoForward { .. } => "tab_go_forward",
        HostEffect::TabReload { .. } => "tab_reload",
        HostEffect::TabsList { .. } => "tabs_list",
        HostEffect::TabsMove { .. } => "tabs_move",
        HostEffect::TabsMoveUrl { .. } => "tabs_move_url",
        HostEffect::TabsNewWindow { .. } => "tabs_new_window",
        HostEffect::TabsNu => "tabs_nu",
    }
}

fn ui_kind(action: &UiAction) -> &'static str {
    match action {
        UiAction::ClosePicker { .. } => "close_picker",
        UiAction::ContinuationPrompt { .. } => "continuation_prompt",
        UiAction::GroupNewFromSelection => "group_new_from_selection",
        UiAction::JumpTarget { .. } => "jump_target",
        UiAction::NavArm => "nav_arm",
        UiAction::NavConfirmClose { .. } => "nav_confirm_close",
        UiAction::NavDisarm => "nav_disarm",
        UiAction::OpenPicker { .. } => "open_picker",
        UiAction::OpenPlainList { .. } => "open_plain_list",
        UiAction::PickerPass => "picker_pass",
        UiAction::SessionSettingName { .. } => "session_setting_name",
        UiAction::SessionSwitch { .. } => "session_switch",
        UiAction::SetMode { .. } => "set_mode",
        UiAction::SettingCancel => "setting_cancel",
        UiAction::SettingSave => "setting_save",
        UiAction::SettingSet { .. } => "setting_set",
        UiAction::ShowHelp => "show_help",
        UiAction::SnapshotSave { .. } => "snapshot_save",
        UiAction::SyncAccept { .. } => "sync_accept",
        UiAction::SyncAnswer { .. } => "sync_answer",
        UiAction::SyncConnect { .. } => "sync_connect",
        UiAction::SyncMembers => "sync_members",
        UiAction::SyncOffer => "sync_offer",
        UiAction::SyncOpen { .. } => "sync_open",
        UiAction::SyncPair { .. } => "sync_pair",
        UiAction::SyncPing { .. } => "sync_ping",
        UiAction::SyncSetup => "sync_setup",
        UiAction::SyncStatus => "sync_status",
    }
}
