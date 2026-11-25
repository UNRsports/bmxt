//! EN: CliHostAdapter — apply bmxt-core DispatchBundle via Family DataChannel / local CLI.
//! JA: CliHostAdapter。bmxt-core の DispatchBundle を Family DC / ローカル CLI で実行する。

use anyhow::{anyhow, Result};
use bmxt_core::command_output::CommandOutput;
use bmxt_core::compound::{
    plan_compound_line, should_run_after_operator, CompoundPlanResult, ParseSegmentError,
    EXIT_FAILURE, EXIT_MISUSE, EXIT_SUCCESS,
};
use bmxt_core::ir::{DispatchBundle, HostEffect, UiAction};
use bmxt_core::pipe_consumer::{classify_pipe_consumer, PipeConsumerClass};
use bmxt_core::run_line;
use bmxt_sync_wire::{
    BookmarkImportItem, SyncBookmarksOp, SyncRemoteSearchHit, SyncRemoteTabRow, SyncTabsOp,
};

use bmxt_ui_settings::UiSettings;

use crate::bookmark_send_payload::parse_bookmark_send_payload;
use crate::bus::{BusClient, SearchProgress, SearchProgressPhase};
use crate::command_io::{CommandIo, InteractionMode};
use crate::config::CliConfig;
use crate::connect;
use crate::handshake;
use crate::msgs::{expand_msgs, t_cli};
use crate::open_payload::parse_open_payload;
use crate::progress;
use crate::tui;
use crate::ui_settings_host;

/** EN: Cap Interactive URL picker rows so ratatui does not freeze on huge history. */
const MAX_URL_PICKER_ROWS: usize = 200;

pub struct CliHostAdapter<'a> {
    pub cfg: &'a mut CliConfig,
    pub client: Option<&'a BusClient>,
    /// EN: Legacy draft slot (cleared on `-set` / `-save` / `-cancel`; no longer used for edits).
    pub setting_draft: &'a mut Option<UiSettings>,
    /// EN: Interactive REPL vs NonInteractive `bmxt exec`.
    pub mode: InteractionMode,
    /// EN: Aggregated stdout/stderr for this `run_line`.
    pub io: CommandIo,
}

pub struct RunOutcome {
    pub exit_status: i32,
    pub prompt_prefix: Option<String>,
    pub new_client: Option<BusClient>,
    pub output: CommandOutput,
}

impl RunOutcome {
    pub fn status(exit_status: i32) -> Self {
        Self {
            exit_status,
            prompt_prefix: None,
            new_client: None,
            output: CommandOutput {
                stdout: Vec::new(),
                stderr: Vec::new(),
                exit_status,
            },
        }
    }

    pub fn with_prefix(exit_status: i32, prefix: Option<String>) -> Self {
        Self {
            exit_status,
            prompt_prefix: prefix,
            new_client: None,
            output: CommandOutput {
                stdout: Vec::new(),
                stderr: Vec::new(),
                exit_status,
            },
        }
    }

    pub fn connected(client: BusClient) -> Self {
        Self {
            exit_status: EXIT_SUCCESS,
            prompt_prefix: None,
            new_client: Some(client),
            output: CommandOutput::success(Vec::new()),
        }
    }

    fn with_io(mut self, io: CommandIo) -> Self {
        self.output = io.into_output(self.exit_status);
        self
    }
}

impl<'a> CliHostAdapter<'a> {
    fn out(&mut self, line: impl Into<String>) {
        self.io.stdout_line(line);
    }

    fn err(&mut self, line: impl Into<String>) {
        self.io.stderr_line(line);
    }

    fn refuse_interactive(&mut self, detail_key: &str) -> RunOutcome {
        self.err(t_cli(detail_key, &[]));
        RunOutcome::status(EXIT_MISUSE)
    }

    fn require_client(&self) -> Result<&'a BusClient> {
        self.client.ok_or_else(|| {
            anyhow!(
                "not connected — run `sync -offer` or `sync -accept` (Enter/:pick), or start with `bmxt sync-connect`"
            )
        })
    }

    pub async fn run_line(&mut self, line: &str) -> Result<RunOutcome> {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            let outcome = RunOutcome::status(EXIT_SUCCESS).with_io(std::mem::take(&mut self.io));
            return Ok(outcome);
        }

        match plan_compound_line(trimmed) {
            CompoundPlanResult::Err { error, .. } => {
                self.err(format_parse_error(error));
                Ok(RunOutcome::status(EXIT_MISUSE).with_io(std::mem::take(&mut self.io)))
            }
            CompoundPlanResult::Ok(plan) => {
                let mut last_status = EXIT_SUCCESS;
                let mut prompt_prefix = None;
                let mut new_client = None;
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
                    if outcome.new_client.is_some() {
                        new_client = outcome.new_client;
                    }
                }
                let mut outcome = RunOutcome::with_prefix(last_status, prompt_prefix)
                    .with_io(std::mem::take(&mut self.io));
                outcome.new_client = new_client;
                if self.mode == InteractionMode::Interactive {
                    // EN: Flush aggregated command I/O to this process FDs (REPL).
                    emit_command_output_to_os(&outcome.output);
                }
                Ok(outcome)
            }
        }
    }

    async fn run_pipe(&mut self, segments: &[String]) -> Result<RunOutcome> {
        if segments.is_empty() {
            return Ok(RunOutcome::status(EXIT_MISUSE));
        }
        if segments.len() == 1 {
            return self.apply_bundle(run_line(&segments[0])).await;
        }

        let producer = &segments[0];
        let consumer_seg = segments[1..].join(" ");
        let Some(consumer) = classify_pipe_consumer(&consumer_seg) else {
            self.err(format!("error: unknown pipe consumer: {consumer_seg}"));
            return Ok(RunOutcome::status(EXIT_MISUSE));
        };

        let producer_bundle = run_line(producer);
        match consumer {
            PipeConsumerClass::Browse => {
                if !self.mode.allows_interactive_ui() {
                    return Ok(self.refuse_interactive("cmd.cli.exec.browseForbidden"));
                }
                if is_setting_list_bundle(&producer_bundle) {
                    self.err(t_cli("cmd.cli.setting.browseUnsupported", &[]));
                    return Ok(RunOutcome::status(EXIT_MISUSE));
                }
                if let Some(kind) = search_list_kind_from_bundle(&producer_bundle) {
                    let hits = self.fetch_search_hits(kind).await?;
                    return self.run_url_picker_and_open(hits).await;
                }
                let (scope, device_id, show_url) =
                    tabs_list_query_from_bundle(&producer_bundle)?;
                let rows = self
                    .fetch_tabs_scope(&scope, &device_id, show_url)
                    .await?;
                self.run_picker_and_maybe_activate(rows, &scope, &device_id, show_url)
                    .await
            }
            PipeConsumerClass::BookmarkSend {
                device_id,
                mode,
                parent_id,
                group_title,
            } => {
                let urls = self.materialize_urls_from_bundle(&producer_bundle).await?;
                if urls.is_empty() {
                    self.err("error: no urls in pipe list for bookmark -send");
                    return Ok(RunOutcome::status(EXIT_FAILURE));
                }
                let mut payload_parts: Vec<String> = Vec::new();
                if let Some(pid) = parent_id {
                    if !pid.is_empty() {
                        payload_parts.push("--parent".into());
                        payload_parts.push(pid);
                    }
                }
                if let Some(gt) = group_title {
                    if !gt.is_empty() {
                        payload_parts.push("--group".into());
                        payload_parts.push(gt);
                    }
                }
                payload_parts.extend(urls);
                self.apply_sync_bookmark_send(&device_id, &mode, &payload_parts.join(" "))
                    .await
            }
            PipeConsumerClass::BookmarkRemove => {
                let ids = self.materialize_bookmark_ids_from_bundle(&producer_bundle).await?;
                if ids.is_empty() {
                    self.err("error: no bookmark ids in pipe list for bookmark -remove");
                    return Ok(RunOutcome::status(EXIT_FAILURE));
                }
                self.apply_bookmarks_ops(SyncBookmarksOp::Remove { bookmark_ids: ids })
                    .await?;
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            PipeConsumerClass::BookmarkMove { parent_id, index } => {
                let ids = self.materialize_bookmark_ids_from_bundle(&producer_bundle).await?;
                if ids.is_empty() || parent_id.trim().is_empty() {
                    self.err("error: bad args for pipe bookmark -move");
                    return Ok(RunOutcome::status(EXIT_MISUSE));
                }
                self.apply_bookmarks_ops(SyncBookmarksOp::Move {
                    bookmark_ids: ids,
                    parent_id,
                    index: index.map(i64::from),
                })
                .await?;
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            PipeConsumerClass::BookmarkAdd { parent_id, .. } => {
                let urls = self.materialize_urls_from_bundle(&producer_bundle).await?;
                if urls.is_empty() {
                    self.err("error: no urls in pipe list for bookmark -add");
                    return Ok(RunOutcome::status(EXIT_FAILURE));
                }
                for url in urls {
                    self.apply_bookmarks_ops(SyncBookmarksOp::Create {
                        title: url.clone(),
                        url,
                        parent_id: parent_id.clone(),
                    })
                    .await?;
                }
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            PipeConsumerClass::HistoryDelete => {
                self.err(
                    "error: history delete is not supported on CLI (peer history delete is out of scope)",
                );
                Ok(RunOutcome::status(EXIT_MISUSE))
            }
            PipeConsumerClass::Close => {
                let rows = self.materialize_tab_rows(&producer_bundle).await?;
                let by_peer = tab_ids_by_peer(&rows);
                if by_peer.is_empty() {
                    self.err("error: no tab ids in pipe list for close");
                    return Ok(RunOutcome::status(EXIT_FAILURE));
                }
                let client = self.require_client()?;
                for (peer, tab_ids) in by_peer {
                    client
                        .tabs_ops_on(
                            &self.cfg.device_id,
                            &peer,
                            SyncTabsOp::CloseTabs { tab_ids },
                        )
                        .await?;
                }
                self.out("ok");
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            PipeConsumerClass::Open { .. } => {
                let rows = self.materialize_tab_rows(&producer_bundle).await?;
                let urls = urls_from_rows(&rows);
                if urls.is_empty() {
                    self.err("error: no urls in pipe list for open");
                    return Ok(RunOutcome::status(EXIT_FAILURE));
                }
                let opened = self
                    .require_client()?
                    .open_tabs(&self.cfg.device_id, urls, None)
                    .await?;
                self.out(format!("opened: {opened:?}"));
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            other => {
                self.err(format!("error: pipe consumer not supported on CLI yet: {other:?}"));
                Ok(RunOutcome::status(EXIT_MISUSE))
            }
        }
    }

    async fn apply_bundle(&mut self, bundle: DispatchBundle) -> Result<RunOutcome> {
        let exit_status = bundle.exit_status();
        match bundle {
            DispatchBundle::Lines { lines, .. } => {
                self.io.lines_for_exit(lines, exit_status);
                Ok(RunOutcome::status(exit_status))
            }
            DispatchBundle::Msgs {
                msgs,
                prompt_prefix,
                ..
            } => {
                self.io.lines_for_exit(expand_msgs(&msgs), exit_status);
                Ok(RunOutcome::with_prefix(exit_status, prompt_prefix))
            }
            DispatchBundle::Effects { effects, .. } => {
                for effect in effects {
                    self.apply_effect(effect).await?;
                }
                Ok(RunOutcome::status(exit_status))
            }
            DispatchBundle::Ui { action, .. } => self.apply_ui(action).await,
        }
    }

    async fn apply_effect(&mut self, effect: HostEffect) -> Result<()> {
        match effect {
            HostEffect::ClearLog => {
                self.out("--- clear ---");
                Ok(())
            }
            HostEffect::OpenUrlNewTab { url }
            | HostEffect::OpenUrlNewWindow { url }
            | HostEffect::OpenUrlIntoWindow { url, .. }
            | HostEffect::NavigateCurrentTab { url }
            | HostEffect::TabsMoveUrl { url }
            | HostEffect::OpenUrlIntoGroup { url, .. } => {
                let opened = self
                    .require_client()?
                    .open_tabs(&self.cfg.device_id, vec![url], None)
                    .await?;
                self.out(format!("opened: {opened:?}"));
                Ok(())
            }
            HostEffect::CloseTab { tab_id } => {
                self.require_client()?
                    .tabs_ops(
                        &self.cfg.device_id,
                        SyncTabsOp::CloseTabs {
                            tab_ids: vec![tab_id],
                        },
                    )
                    .await?;
                self.out("ok");
                Ok(())
            }
            HostEffect::CloseCurrentTab | HostEffect::CloseCurrentWindow => Err(anyhow!(
                "close current tab/window needs a browser host — use `tab -list | close` or `close <tabId>`"
            )),
            HostEffect::TabReload { tab_ids } => {
                self.require_client()?
                    .tabs_ops(&self.cfg.device_id, SyncTabsOp::Reload { tab_ids })
                    .await?;
                self.out("ok");
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
                print_peer_tab_rows(&mut self.io, &rows, show);
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
                let show_progress = self.mode.allows_interactive_ui();
                let hits = self
                    .require_client()?
                    .search_query_with_progress(&self.cfg.device_id, line, |p| {
                        if show_progress {
                            report_search_progress("search", &p);
                        }
                    })
                    .await?;
                self.print_search_hits(&hits);
                Ok(())
            }
            HostEffect::BookmarkList { .. } => {
                let hits = self.fetch_search_hits("bookmark").await?;
                self.print_search_hits(&hits);
                Ok(())
            }
            HostEffect::BookmarkCreate {
                url,
                title,
                parent_id,
                ..
            } => {
                self.apply_bookmarks_ops(SyncBookmarksOp::Create {
                    url,
                    title,
                    parent_id: nonempty_opt(parent_id),
                })
                .await
            }
            HostEffect::BookmarkCreateFolder { title, parent_id } => {
                self.apply_bookmarks_ops(SyncBookmarksOp::CreateFolder {
                    title,
                    parent_id: nonempty_opt(parent_id),
                })
                .await
            }
            HostEffect::BookmarkRemove { ids } => {
                let bookmark_ids = split_ids(&ids);
                if bookmark_ids.is_empty() {
                    return Err(anyhow!("bookmark -remove: no ids"));
                }
                self.apply_bookmarks_ops(SyncBookmarksOp::Remove { bookmark_ids })
                    .await
            }
            HostEffect::BookmarkMove {
                ids,
                parent_id,
                index,
            } => {
                let bookmark_ids = split_ids(&ids);
                if bookmark_ids.is_empty() || parent_id.trim().is_empty() {
                    return Err(anyhow!("bookmark -move: bad args"));
                }
                let index_val = index.trim().parse::<i64>().ok().filter(|n| *n >= 0);
                self.apply_bookmarks_ops(SyncBookmarksOp::Move {
                    bookmark_ids,
                    parent_id,
                    index: index_val,
                })
                .await
            }
            HostEffect::HistoryDeleteUrl { .. }
            | HostEffect::HistoryDeleteRange { .. } => Err(anyhow!(
                "history delete is not supported on CLI (peer history delete is out of scope)"
            )),
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

    async fn apply_ui(&mut self, action: UiAction) -> Result<RunOutcome> {
        match action {
            UiAction::ShowHelp => {
                // EN: Prefer msgs from `help` (avoid ShowHelp → help → ShowHelp loops).
                match run_line("help") {
                    DispatchBundle::Msgs { msgs, exit_status, .. } => {
                        self.io.lines_for_exit(expand_msgs(&msgs), exit_status);
                    }
                    other => {
                        let _ = other;
                        self.out("help");
                    }
                }
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::ContinuationPrompt { prefix } => Ok(RunOutcome::with_prefix(EXIT_SUCCESS, Some(prefix))),
            UiAction::OpenPlainList {
                list_id,
                show_url,
                device_scope,
                device_id,
                ..
            } => {
                if list_id == "setting" {
                    let committed = ui_settings_host::load_committed()?;
                    self.io.extend_stdout(ui_settings_host::format_setting_list_for_cli(
                        &committed, self.cfg,
                    ));
                    return Ok(RunOutcome::status(EXIT_SUCCESS));
                }
                if list_id == "bookmark" || list_id == "history" {
                    let hits = self.fetch_search_hits(&list_id).await?;
                    self.print_search_hits(&hits);
                    return Ok(RunOutcome::status(EXIT_SUCCESS));
                }
                if list_id != "tabs" {
                    self.err(t_cli(
                        "cmd.cli.error.listLimited",
                        &[("listId", &list_id)],
                    ));
                    return Ok(RunOutcome::status(EXIT_MISUSE));
                }
                let show = show_url == "true";
                let rows = self
                    .fetch_tabs_scope(&device_scope, &device_id, show)
                    .await?;
                print_peer_tab_rows(&mut self.io, &rows, show);
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::OpenPicker {
                list_id,
                show_url,
                device_scope,
                device_id,
                ..
            } => {
                if !self.mode.allows_interactive_ui() {
                    return Ok(self.refuse_interactive("cmd.cli.exec.browseForbidden"));
                }
                if list_id == "setting" {
                    self.err(t_cli("cmd.cli.setting.browseUnsupported", &[]));
                    return Ok(RunOutcome::status(EXIT_MISUSE));
                }
                if list_id == "bookmark" || list_id == "history" {
                    let hits = self.fetch_search_hits(&list_id).await?;
                    return self.run_url_picker_and_open(hits).await;
                }
                if list_id != "tabs" {
                    self.err(t_cli(
                        "cmd.cli.error.pickerLimited",
                        &[("listId", &list_id)],
                    ));
                    return Ok(RunOutcome::status(EXIT_MISUSE));
                }
                let show = show_url == "true";
                let rows = self
                    .fetch_tabs_scope(&device_scope, &device_id, show)
                    .await?;
                self.run_picker_and_maybe_activate(rows, &device_scope, &device_id, show)
                    .await
            }
            UiAction::SyncBookmarkSend {
                device_id,
                mode,
                payload,
            } => {
                self.apply_sync_bookmark_send(&device_id, &mode, &payload)
                    .await
            }
            UiAction::SettingSet { key, value } => {
                if let Some(lines) =
                    ui_settings_host::try_apply_cli_sync_setting(self.cfg, &key, &value)?
                {
                    self.io.extend_stdout(lines);
                    return Ok(RunOutcome::status(EXIT_SUCCESS));
                }
                let (ok, stdout, stderr) =
                    ui_settings_host::apply_set_and_save(self.setting_draft, &key, &value)?;
                self.io.extend_stdout(stdout);
                self.io.extend_stderr(stderr);
                Ok(RunOutcome::status(if ok {
                    EXIT_SUCCESS
                } else {
                    EXIT_MISUSE
                }))
            }
            UiAction::SettingSave => {
                // EN: Compat close alias — settings already persist on each `-set` / picker apply.
                *self.setting_draft = None;
                self.out(t_cli("setting.picker.closed", &[]));
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::SettingCancel => {
                *self.setting_draft = None;
                self.out(t_cli("setting.picker.closed", &[]));
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::SyncStatus => {
                self.out(format!("deviceId:    {}", self.cfg.device_id));
                self.out(format!("displayName: {}", self.cfg.display_name));
                self.out(format!(
                    "familyId:    {}",
                    self.cfg.family_id.as_deref().unwrap_or("(none)")
                ));
                match self.client {
                    None => {
                        self.out("peers:       (not connected — sync -offer / sync -accept)");
                    }
                    Some(client) => {
                        let peers = client.list_connected().await;
                        if peers.is_empty() {
                            self.out("peers:       (none connected)");
                        } else {
                            self.out("peers:");
                            for (id, name) in peers {
                                self.out(format!("  {name}\t{id}"));
                            }
                        }
                    }
                }
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::SyncMembers => {
                let Some(client) = self.client else {
                    self.out("(not connected)");
                    return Ok(RunOutcome::status(EXIT_SUCCESS));
                };
                let peers = client.list_connected().await;
                for (id, name) in peers {
                    self.out(format!("{name}\t{id}"));
                }
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::SyncPing { device_id } => {
                let client = self.require_client()?;
                let remote = client.resolve_remote_id(&device_id).await.map_err(|err| {
                    anyhow!("{err:#} — run `sync -status` / `sync -members`")
                })?;
                let ack = client.ping_one(&self.cfg.device_id, &remote).await?;
                self.out(format!("ack[{remote}]: {ack:?}"));
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::SyncOpen { device_id, payload } => {
                self.apply_sync_open(&device_id, &payload).await
            }
            UiAction::SyncSetup => {
                if !self.mode.allows_interactive_ui() {
                    return Ok(self.refuse_interactive("cmd.cli.exec.handshakeForbidden"));
                }
                self.cfg.ensure_family()?;
                let invite = handshake::print_invite(self.cfg)?;
                self.out(t_cli("cmd.cli.handshake.familyReady", &[]));
                crate::handshake_delivery::deliver_outbound_code(self.cfg, "invite", &invite)?;
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::SyncPair { invite } => {
                if invite.trim().is_empty() {
                    if !self.mode.allows_interactive_ui() {
                        return Ok(self.refuse_interactive("cmd.cli.exec.handshakeForbidden"));
                    }
                    return Ok(RunOutcome::with_prefix(
                        EXIT_SUCCESS,
                        Some("sync -pair ".to_string()),
                    ));
                }
                handshake::apply_invite(self.cfg, &invite)?;
                self.out(format!(
                    "Joined Family {}",
                    self.cfg.family_id.as_deref().unwrap_or("")
                ));
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::SyncConnect { device_id } => {
                if self.client.is_none() {
                    self.err("not connected yet — run `sync -offer` or `sync -accept` (no device id needed for first peer)");
                    return Ok(RunOutcome::status(EXIT_MISUSE));
                }
                let connected = self.require_client()?.list_connected().await;
                if connected.iter().any(|(id, _)| id == &device_id) {
                    self.out(format!("already connected to {device_id}"));
                    return Ok(RunOutcome::status(EXIT_SUCCESS));
                }
                self.err(format!(
                    "not connected to {device_id}. Additional Family peers join via mesh when online"
                ));
                Ok(RunOutcome::status(EXIT_MISUSE))
            }
            UiAction::SyncOffer => {
                if !self.mode.allows_interactive_ui() {
                    return Ok(self.refuse_interactive("cmd.cli.exec.handshakeForbidden"));
                }
                if let Some(client) = self.client {
                    if !client.list_connected().await.is_empty() {
                        self.err("already connected — additional Family peers join via mesh when online");
                        return Ok(RunOutcome::status(EXIT_MISUSE));
                    }
                    connect::connect_as_offer_onto(self.cfg, client, "pending-peer".into()).await?;
                    return Ok(RunOutcome::status(EXIT_SUCCESS));
                }
                let client = connect::connect_as_offer(self.cfg, "pending-peer".into()).await?;
                Ok(RunOutcome::connected(client))
            }
            UiAction::SyncAnswer { code } | UiAction::SyncAccept { code } => {
                if !self.mode.allows_interactive_ui() {
                    return Ok(self.refuse_interactive("cmd.cli.exec.handshakeForbidden"));
                }
                if let Some(client) = self.client {
                    if !client.list_connected().await.is_empty() {
                        self.err("already connected — additional Family peers join via mesh when online");
                        return Ok(RunOutcome::status(EXIT_MISUSE));
                    }
                    connect::connect_as_answer_onto(self.cfg, client, &code).await?;
                    return Ok(RunOutcome::status(EXIT_SUCCESS));
                }
                let client = connect::connect_as_answer(self.cfg, &code).await?;
                Ok(RunOutcome::connected(client))
            }
            UiAction::ClosePicker { slot, .. } => {
                if slot == "setting" {
                    *self.setting_draft = None;
                    self.out(t_cli("setting.picker.closed", &[]));
                }
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::PickerPass => Ok(RunOutcome::status(EXIT_SUCCESS)),
            other => {
                self.err(t_cli(
                    "cmd.cli.error.uiUnsupported",
                    &[("kind", ui_kind(&other))],
                ));
                Ok(RunOutcome::status(EXIT_MISUSE))
            }
        }
    }

    fn print_search_hits(&mut self, hits: &[SyncRemoteSearchHit]) {
        for hit in hits.iter().take(50) {
            let id_part = hit
                .bookmark_id
                .as_ref()
                .map(|id| format!(" id={id}"))
                .unwrap_or_default();
            self.out(format!(
                "[{}] {} — {}{}",
                hit.source, hit.title, hit.url, id_part
            ));
        }
        self.out(format!("({} hits)", hits.len()));
    }

    async fn fetch_search_hits(&self, kind: &str) -> Result<Vec<SyncRemoteSearchHit>> {
        let dispatch = match kind {
            "bookmark" => "search -list --bookmark",
            "history" => "search -list --history",
            other => {
                return Err(anyhow!("unsupported search list kind: {other}"));
            }
        };
        let show_progress = self.mode.allows_interactive_ui();
        let label = format!("search:{kind}");
        self.require_client()?
            .search_query_with_progress(&self.cfg.device_id, dispatch.to_string(), |p| {
                if !show_progress {
                    return;
                }
                report_search_progress(&label, &p);
            })
            .await
    }

    async fn apply_bookmarks_ops(&mut self, op: SyncBookmarksOp) -> Result<()> {
        self.require_client()?
            .bookmarks_ops(&self.cfg.device_id, op)
            .await?;
        self.out("ok");
        Ok(())
    }

    /**
     * EN: `bookmark -send` / SyncBookmarkSend — open_tabs and/or bookmarks_import.
     * JA: `bookmark -send` / SyncBookmarkSend。open_tabs および／または bookmarks_import。
     */
    async fn apply_sync_bookmark_send(
        &mut self,
        device_id: &str,
        mode: &str,
        payload: &str,
    ) -> Result<RunOutcome> {
        let parsed = parse_bookmark_send_payload(payload);
        if parsed.urls.is_empty() {
            self.err(t_cli("cmd.sync.open.noUrls", &[]));
            return Ok(RunOutcome::status(EXIT_MISUSE));
        }
        let client = self.require_client()?;
        let remote = match client.resolve_remote_id(device_id).await {
            Ok(id) => id,
            Err(err) => {
                let detail = format!("{err:#}");
                if detail.contains("ambiguous") {
                    self.err(format!("error: {detail}"));
                } else {
                    self.err(t_cli("cmd.sync.open.notConnected", &[]));
                }
                return Ok(RunOutcome::status(EXIT_FAILURE));
            }
        };
        let should_open = mode == "open" || mode == "both";
        let should_save = mode == "save" || mode == "both";
        if !should_open && !should_save {
            self.err(t_cli(
                "cmd.cli.error.uiUnsupported",
                &[("kind", "sync_bookmark_send")],
            ));
            return Ok(RunOutcome::status(EXIT_MISUSE));
        }
        let mut ok = true;
        if should_open {
            let url_count = parsed.urls.len();
            match client
                .open_tabs_on(
                    &self.cfg.device_id,
                    &remote,
                    parsed.urls.clone(),
                    parsed.group_title.clone(),
                    None,
                )
                .await
            {
                Ok((opened, detail)) => {
                    let detail_text = detail.unwrap_or_default();
                    self.out(t_cli(
                        "cmd.sync.open.done",
                        &[(
                            "detail",
                            &format!(
                                "ok=true;peer={remote};requested={url_count};opened={};detail={detail_text}",
                                opened.len()
                            ),
                        )],
                    ));
                }
                Err(err) => {
                    ok = false;
                    self.err(format!("error: open failed: {err:#}"));
                }
            }
        }
        if should_save {
            let items: Vec<BookmarkImportItem> = parsed
                .urls
                .iter()
                .map(|url| BookmarkImportItem {
                    url: url.clone(),
                    title: url.clone(),
                })
                .collect();
            match client
                .bookmarks_import_on(
                    &self.cfg.device_id,
                    &remote,
                    parsed.parent_id.clone(),
                    items,
                )
                .await
            {
                Ok(created) => {
                    self.out(format!(
                        "bookmarks_import: ok=true;peer={remote};created={created}"
                    ));
                }
                Err(err) => {
                    ok = false;
                    self.err(format!("error: bookmarks_import failed: {err:#}"));
                }
            }
        }
        Ok(RunOutcome::status(if ok {
            EXIT_SUCCESS
        } else {
            EXIT_FAILURE
        }))
    }

    async fn run_url_picker_and_open(
        &mut self,
        hits: Vec<SyncRemoteSearchHit>,
    ) -> Result<RunOutcome> {
        let client = self.require_client()?.clone();
        let self_device_id = self.cfg.device_id.clone();
        let peers = client.list_connected().await;
        if peers.is_empty() {
            return Err(anyhow!("no connected peers"));
        }
        let open_peers: Vec<tui::UrlOpenPeer> = peers
            .into_iter()
            .map(|(device_id, display_name)| tui::UrlOpenPeer {
                device_id,
                display_name,
            })
            .collect();
        let total = hits.len();
        let capped: Vec<SyncRemoteSearchHit> = hits.into_iter().take(MAX_URL_PICKER_ROWS).collect();
        if total > capped.len() {
            self.err(t_cli(
                "cmd.cli.search.pickerCapped",
                &[
                    ("shown", &capped.len().to_string()),
                    ("total", &total.to_string()),
                ],
            ));
        }
        let rows: Vec<tui::PeerUrlHit> = capped
            .into_iter()
            .map(|hit| tui::PeerUrlHit {
                source: hit.source,
                title: hit.title,
                url: hit.url,
                bookmark_id: hit.bookmark_id,
            })
            .collect();
        tokio::task::block_in_place(|| {
            let handle = tokio::runtime::Handle::current();
            tui::run_url_picker(rows, open_peers, |dest_peer_id, sels| {
                let urls: Vec<String> = sels.iter().map(|s| s.url.clone()).collect();
                if urls.is_empty() {
                    return Ok(());
                }
                handle.block_on(async {
                    client
                        .open_tabs_on(
                            &self_device_id,
                            dest_peer_id,
                            urls,
                            None,
                            None,
                        )
                        .await
                        .map(|_| ())
                })
            })
        })?;
        Ok(RunOutcome::status(EXIT_SUCCESS))
    }

    async fn materialize_urls_from_bundle(
        &self,
        bundle: &DispatchBundle,
    ) -> Result<Vec<String>> {
        if let Some(kind) = search_list_kind_from_bundle(bundle) {
            let hits = self.fetch_search_hits(kind).await?;
            return Ok(hits
                .into_iter()
                .map(|h| h.url)
                .filter(|u| !u.trim().is_empty())
                .collect());
        }
        let rows = self.materialize_tab_rows(bundle).await?;
        Ok(urls_from_rows(&rows))
    }

    async fn materialize_bookmark_ids_from_bundle(
        &self,
        bundle: &DispatchBundle,
    ) -> Result<Vec<String>> {
        let kind = search_list_kind_from_bundle(bundle).unwrap_or("bookmark");
        let hits = self.fetch_search_hits(kind).await?;
        Ok(hits
            .into_iter()
            .filter_map(|h| h.bookmark_id)
            .filter(|id| !id.trim().is_empty())
            .collect())
    }

    /**
     * EN: `tab -send` / SyncOpen — DataChannel open_tabs on the target peer.
     * JA: `tab -send` / SyncOpen。対象 peer へ DataChannel open_tabs。
     */
    async fn apply_sync_open(&mut self, device_id: &str, payload: &str) -> Result<RunOutcome> {
        let parsed = parse_open_payload(payload);
        if parsed.urls.is_empty() {
            self.err(t_cli("cmd.sync.open.noUrls", &[]));
            return Ok(RunOutcome::status(EXIT_MISUSE));
        }
        let client = self.require_client()?;
        let remote = match client.resolve_remote_id(device_id).await {
            Ok(id) => id,
            Err(err) => {
                let detail = format!("{err:#}");
                if detail.contains("ambiguous") {
                    self.err(format!("error: {detail}"));
                } else {
                    self.err(t_cli("cmd.sync.open.notConnected", &[]));
                }
                return Ok(RunOutcome::status(EXIT_FAILURE));
            }
        };
        let url_count = parsed.urls.len();
        let (opened, detail) = client
            .open_tabs_on(
                &self.cfg.device_id,
                &remote,
                parsed.urls,
                parsed.group_title,
                None,
            )
            .await?;
        let detail_text = detail.unwrap_or_default();
        self.out(t_cli(
            "cmd.sync.open.done",
            &[(
                "detail",
                &format!(
                    "ok=true;peer={remote};requested={url_count};opened={};detail={detail_text}",
                    opened.len()
                ),
            )],
        ));
        if parsed.close_after {
            // EN: CLI has no local browser tabs — --close cannot close sources here.
            // JA: CLI にローカルブラウザタブはないため --close で送信元を閉じられない。
            self.err(t_cli("cmd.cli.sync.open.closeSkipped", &[]));
        }
        Ok(RunOutcome::status(EXIT_SUCCESS))
    }

    async fn run_picker_and_maybe_activate(
        &self,
        rows: Vec<tui::PeerTabRow>,
        list_scope: &str,
        list_device_id: &str,
        show_url: bool,
    ) -> Result<RunOutcome> {
        let client = self.require_client()?.clone();
        let self_device_id = self.cfg.device_id.clone();
        let list_scope = list_scope.to_string();
        let list_device_id = list_device_id.to_string();
        let mut tabs_changed_rx = client.subscribe_tabs_changed();
        // EN: ratatui is sync; activate / refresh over the bus without leaving the picker.
        // JA: ratatui は同期。picker を閉じずにバス経由で activate / 再取得する。
        tokio::task::block_in_place(|| {
            let handle = tokio::runtime::Handle::current();
            tui::run_tab_picker(
                rows,
                |sel| {
                    handle.block_on(async {
                        client
                            .tabs_ops_on(
                                &self_device_id,
                                &sel.peer_device_id,
                                SyncTabsOp::Activate {
                                    tab_id: sel.tab_id,
                                    window_id: sel.window_id,
                                },
                            )
                            .await
                    })
                },
                || {
                    let mut saw_tab_signal = false;
                    loop {
                        match tabs_changed_rx.try_recv() {
                            Ok(notice) => {
                                if notice.targets_tab_picker() {
                                    saw_tab_signal = true;
                                }
                            }
                            Err(tokio::sync::broadcast::error::TryRecvError::Empty) => break,
                            Err(tokio::sync::broadcast::error::TryRecvError::Lagged(_)) => {
                                saw_tab_signal = true;
                            }
                            Err(tokio::sync::broadcast::error::TryRecvError::Closed) => break,
                        }
                    }
                    if !saw_tab_signal {
                        return tui::PickerRefresh::Idle;
                    }
                    match handle.block_on(async {
                        fetch_tabs_scope_for_client(
                            &client,
                            &self_device_id,
                            &list_scope,
                            &list_device_id,
                            show_url,
                        )
                        .await
                    }) {
                        Ok(new_rows) => tui::PickerRefresh::Updated(new_rows),
                        Err(err) => tui::PickerRefresh::Failed(format!("{err:#}")),
                    }
                },
            )
        })?;
        Ok(RunOutcome::status(EXIT_SUCCESS))
    }

    async fn materialize_tab_rows(
        &self,
        bundle: &DispatchBundle,
    ) -> Result<Vec<tui::PeerTabRow>> {
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
    ) -> Result<Vec<tui::PeerTabRow>> {
        fetch_tabs_scope_for_client(
            self.require_client()?,
            &self.cfg.device_id,
            device_scope,
            device_id,
            show_url,
        )
        .await
    }
}

/**
 * EN: Extract tabs list query (scope / device / showUrl) from a producer DispatchBundle.
 * JA: producer の DispatchBundle から tabs 一覧クエリ（scope / device / showUrl）を取り出す。
 */
fn report_search_progress(label: &str, p: &SearchProgress) {
    let peer_label = if p.peer_total <= 1 {
        p.peer_id.clone()
    } else {
        format!("{} ({}/{})", p.peer_id, p.peer_index + 1, p.peer_total)
    };
    match p.phase {
        SearchProgressPhase::Querying => {
            progress::report(
                label,
                None,
                &format!("peer={peer_label} querying…"),
            );
        }
        SearchProgressPhase::Receiving => {
            let fraction = parse_chunk_fraction(p.detail.as_deref());
            let chunk = p
                .chunk_seq
                .map(|s| format!("chunk={}", s + 1))
                .unwrap_or_else(|| "chunk=?".into());
            progress::report(
                label,
                fraction,
                &format!("peer={peer_label} {chunk} hits={}", p.hits_so_far),
            );
        }
        SearchProgressPhase::Done => {
            progress::done(
                label,
                &format!("peer={peer_label} hits={}", p.hits_so_far),
            );
        }
        SearchProgressPhase::Failed => {
            progress::report(
                label,
                Some(0.0),
                &format!(
                    "peer={peer_label} failed: {}",
                    p.detail.clone().unwrap_or_default()
                ),
            );
        }
    }
}

/** EN: Parse `chunk=3/10` from wire detail into 0..=1. */
fn parse_chunk_fraction(detail: Option<&str>) -> Option<f64> {
    let detail = detail?;
    for part in detail.split(';') {
        let part = part.trim();
        let Some(rest) = part.strip_prefix("chunk=") else {
            continue;
        };
        let mut it = rest.split('/');
        let cur: f64 = it.next()?.parse().ok()?;
        let total: f64 = it.next()?.parse().ok()?;
        if total > 0.0 {
            return Some((cur / total).clamp(0.0, 1.0));
        }
    }
    None
}

fn search_list_kind_from_bundle(bundle: &DispatchBundle) -> Option<&'static str> {
    match bundle {
        DispatchBundle::Ui {
            action:
                UiAction::OpenPlainList { list_id, .. } | UiAction::OpenPicker { list_id, .. },
            ..
        } if list_id == "bookmark" => Some("bookmark"),
        DispatchBundle::Ui {
            action:
                UiAction::OpenPlainList { list_id, .. } | UiAction::OpenPicker { list_id, .. },
            ..
        } if list_id == "history" => Some("history"),
        DispatchBundle::Effects { effects, .. } => {
            for effect in effects {
                if let HostEffect::SearchList {
                    dispatch_line,
                    peer_dispatch_line,
                    ..
                } = effect
                {
                    let line = if peer_dispatch_line.is_empty() {
                        dispatch_line.as_str()
                    } else {
                        peer_dispatch_line.as_str()
                    };
                    if line.contains("--bookmark") {
                        return Some("bookmark");
                    }
                    if line.contains("--history") {
                        return Some("history");
                    }
                }
                if let HostEffect::BookmarkList { .. } = effect {
                    return Some("bookmark");
                }
            }
            None
        }
        _ => None,
    }
}

fn split_ids(raw: &str) -> Vec<String> {
    raw.split_whitespace()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

fn nonempty_opt(raw: String) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn tabs_list_query_from_bundle(bundle: &DispatchBundle) -> Result<(String, String, bool)> {
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
        } if list_id == "tabs" => Ok((
            device_scope.clone(),
            device_id.clone(),
            show_url == "true",
        )),
        DispatchBundle::Effects { effects, .. } => {
            for effect in effects {
                if let HostEffect::TabsList {
                    device_id,
                    device_scope,
                    show_url,
                } = effect
                {
                    return Ok((
                        device_scope.clone(),
                        device_id.clone(),
                        show_url == "true",
                    ));
                }
            }
            Err(anyhow!("pipe producer did not yield a tabs list query"))
        }
        other => Err(anyhow!(
            "pipe producer must be a tabs list plan, got {:?}",
            std::mem::discriminant(other)
        )),
    }
}

async fn fetch_tabs_scope_for_client(
    client: &BusClient,
    self_device_id: &str,
    device_scope: &str,
    device_id: &str,
    show_url: bool,
) -> Result<Vec<tui::PeerTabRow>> {
    match device_scope {
        "device" if !device_id.is_empty() => {
            let bundles = client.tabs_all(self_device_id, show_url).await?;
            let mut out = Vec::new();
            for (id, name, rows) in bundles {
                if id == device_id {
                    push_peer_section(&mut out, &id, &name, rows);
                }
            }
            if out.is_empty() {
                return Err(anyhow!("not connected to device {device_id}"));
            }
            Ok(out)
        }
        "peers" | "" | "local" => {
            // EN: CLI has no local browser inventory — peers/local → all connected browsers.
            let bundles = client.tabs_all(self_device_id, show_url).await?;
            let mut out = Vec::new();
            for (id, name, rows) in bundles {
                push_peer_section(&mut out, &id, &name, rows);
            }
            Ok(out)
        }
        other => Err(anyhow!("unknown device_scope: {other}")),
    }
}

fn push_peer_section(
    out: &mut Vec<tui::PeerTabRow>,
    peer_id: &str,
    peer_name: &str,
    rows: Vec<SyncRemoteTabRow>,
) {
    out.push(tui::PeerTabRow {
        peer_device_id: peer_id.to_string(),
        peer_display_name: peer_name.to_string(),
        row: SyncRemoteTabRow::Window {
            window_id: -1,
            title: format!("── {peer_name} ──"),
            focused: false,
        },
    });
    for row in rows {
        out.push(tui::PeerTabRow {
            peer_device_id: peer_id.to_string(),
            peer_display_name: peer_name.to_string(),
            row,
        });
    }
}

fn format_parse_error(error: ParseSegmentError) -> String {
    match error {
        ParseSegmentError::UnclosedQuote => "error: unclosed quote".into(),
        ParseSegmentError::DanglingOperator => "error: dangling compound operator".into(),
        ParseSegmentError::EmptySegment => "error: empty command segment".into(),
    }
}

/** EN: Group tab ids by owning peer — tab ids are not globally unique across browsers. */
fn tab_ids_by_peer(rows: &[tui::PeerTabRow]) -> Vec<(String, Vec<i64>)> {
    let mut map: std::collections::BTreeMap<String, Vec<i64>> = std::collections::BTreeMap::new();
    for peer_row in rows {
        if let SyncRemoteTabRow::Tab { tab_id, .. } = &peer_row.row {
            map.entry(peer_row.peer_device_id.clone())
                .or_default()
                .push(*tab_id);
        }
    }
    map.into_iter().collect()
}

fn urls_from_rows(rows: &[tui::PeerTabRow]) -> Vec<String> {
    let mut urls = Vec::new();
    for peer_row in rows {
        if let SyncRemoteTabRow::Tab { url, .. } = &peer_row.row {
            if !url.is_empty() {
                urls.push(url.clone());
            }
        }
    }
    urls
}

fn print_peer_tab_rows(io: &mut CommandIo, rows: &[tui::PeerTabRow], show_url: bool) {
    for peer_row in rows {
        io.stdout_line(format_row(&peer_row.row, show_url));
    }
}

fn emit_command_output_to_os(output: &CommandOutput) {
    for line in &output.stdout {
        println!("{line}");
    }
    for line in &output.stderr {
        eprintln!("{line}");
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
        HostEffect::BookmarkCreate { .. } => "bookmark_create",
        HostEffect::BookmarkCreateFolder { .. } => "bookmark_create_folder",
        HostEffect::BookmarkList { .. } => "bookmark_list",
        HostEffect::BookmarkMove { .. } => "bookmark_move",
        HostEffect::BookmarkRemove { .. } => "bookmark_remove",
        HostEffect::HistoryDeleteRange { .. } => "history_delete_range",
        HostEffect::HistoryDeleteUrl { .. } => "history_delete_url",
        _ => "other_host_effect",
    }
}

fn is_setting_list_bundle(bundle: &DispatchBundle) -> bool {
    matches!(
        bundle,
        DispatchBundle::Ui {
            action: UiAction::OpenPlainList { list_id, .. }
                | UiAction::OpenPicker { list_id, .. },
            ..
        } if list_id == "setting"
    )
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
        UiAction::BookmarkBackup => "bookmark_backup",
        UiAction::BookmarkRestore { .. } => "bookmark_restore",
        UiAction::HistoryBackup => "history_backup",
        UiAction::HistoryRestore { .. } => "history_restore",
        UiAction::SyncBookmarkSend { .. } => "sync_bookmark_send",
        _ => "other_ui_action",
    }
}
