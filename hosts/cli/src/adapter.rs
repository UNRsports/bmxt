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
use bmxt_sync_wire::{SyncRemoteTabRow, SyncTabsOp};

use bmxt_ui_settings::UiSettings;

use crate::bus::BusClient;
use crate::command_io::{CommandIo, InteractionMode};
use crate::config::CliConfig;
use crate::connect;
use crate::handshake;
use crate::msgs::{expand_msgs, t_cli};
use crate::open_payload::parse_open_payload;
use crate::tui;
use crate::ui_settings_host;

pub struct CliHostAdapter<'a> {
    pub cfg: &'a mut CliConfig,
    pub client: Option<&'a BusClient>,
    /// EN: In-memory `setting -set` draft until `-save` / `-cancel`.
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
                let rows = self.materialize_tab_rows(&producer_bundle).await?;
                self.run_picker_and_maybe_activate(&rows).await
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
                let hits = self.require_client()?.search_query(&self.cfg.device_id, line).await?;
                for hit in hits.iter().take(50) {
                    self.out(format!("[{}] {} — {}", hit.source, hit.title, hit.url));
                }
                self.out(format!("({} hits)", hits.len()));
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
                    let view = self
                        .setting_draft
                        .as_ref()
                        .unwrap_or(&committed);
                    self.io.extend_stdout(ui_settings_host::format_setting_list_for_cli(
                        view, self.cfg,
                    ));
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
                self.run_picker_and_maybe_activate(&rows).await
            }
            UiAction::SettingSet { key, value } => {
                if let Some(lines) =
                    ui_settings_host::try_apply_cli_sync_setting(self.cfg, &key, &value)?
                {
                    self.io.extend_stdout(lines);
                    return Ok(RunOutcome::status(EXIT_SUCCESS));
                }
                let committed = ui_settings_host::load_committed()?;
                let (ok, stdout, stderr) = ui_settings_host::apply_set_to_draft(
                    self.setting_draft,
                    &committed,
                    &key,
                    &value,
                )?;
                self.io.extend_stdout(stdout);
                self.io.extend_stderr(stderr);
                Ok(RunOutcome::status(if ok {
                    EXIT_SUCCESS
                } else {
                    EXIT_MISUSE
                }))
            }
            UiAction::SettingSave => {
                let Some(draft) = self.setting_draft.take() else {
                    self.err(t_cli("cmd.cli.setting.noDraft", &[]));
                    return Ok(RunOutcome::status(EXIT_MISUSE));
                };
                ui_settings_host::save_committed(&draft)?;
                self.out(t_cli("setting.picker.saved", &[]));
                Ok(RunOutcome::status(EXIT_SUCCESS))
            }
            UiAction::SettingCancel => {
                *self.setting_draft = None;
                self.out(t_cli("setting.picker.cancelled", &[]));
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
        rows: &[tui::PeerTabRow],
    ) -> Result<RunOutcome> {
        let client = self.require_client()?.clone();
        let device_id = self.cfg.device_id.clone();
        // EN: ratatui is sync; activate over the bus without leaving the picker open.
        // JA: ratatui は同期。picker を閉じずにバス経由で activate する。
        tokio::task::block_in_place(|| {
            let handle = tokio::runtime::Handle::current();
            tui::run_tab_picker(rows, |sel| {
                handle.block_on(async {
                    client
                        .tabs_ops_on(
                            &device_id,
                            &sel.peer_device_id,
                            SyncTabsOp::Activate {
                                tab_id: sel.tab_id,
                                window_id: sel.window_id,
                            },
                        )
                        .await
                })
            })
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
        match device_scope {
            "device" if !device_id.is_empty() => {
                let bundles = self.require_client()?.tabs_all(&self.cfg.device_id, show_url).await?;
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
                let bundles = self.require_client()?.tabs_all(&self.cfg.device_id, show_url).await?;
                let mut out = Vec::new();
                for (id, name, rows) in bundles {
                    push_peer_section(&mut out, &id, &name, rows);
                }
                Ok(out)
            }
            other => Err(anyhow!("unknown device_scope: {other}")),
        }
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
    }
}
