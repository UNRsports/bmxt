//! EN: Interactive `dom -wizard` and `nav -enter` key-forward loop.
//! JA: `dom -wizard` 対話と `nav -enter` キー転送ループ。

use std::io::{self, Write};

use anyhow::{anyhow, Result};
use bmxt_sync_wire::SyncNavControlOp;
use crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use crossterm::terminal::{disable_raw_mode, enable_raw_mode};

use crate::bus::BusClient;
use crate::msgs::t_cli;
use crate::tui;

pub struct DomCapturePlan {
    pub remote_id: String,
    pub tab_id: i64,
    pub scope: String,
    pub flavor: String,
}

/**
 * EN: Interactive 4-step source pick for `dom -wizard`.
 * JA: `dom -wizard` の 4 段選択（peer → tab → scope → flavor）。
 */
pub async fn run_dom_wizard(client: &BusClient, self_device_id: &str) -> Result<DomCapturePlan> {
    let peers = client.list_connected().await;
    let remote_id = tokio::task::block_in_place(|| tui::pick_peer_by_number(&peers))?;

    let bundles = client.tabs_all(self_device_id, true).await?;
    let mut tab_choices: Vec<(i64, String)> = Vec::new();
    for (id, name, rows) in bundles {
        if id != remote_id {
            continue;
        }
        let peer_label = if name.is_empty() {
            id.as_str()
        } else {
            name.as_str()
        };
        for row in rows {
            if let bmxt_sync_wire::SyncRemoteTabRow::Tab {
                tab_id,
                title,
                url,
                ..
            } = row
            {
                tab_choices.push((
                    tab_id,
                    format!("[{peer_label}] {title} — {url}"),
                ));
            }
        }
    }
    if tab_choices.is_empty() {
        return Err(anyhow!(t_cli("cmd.cli.dom.noTabs", &[])));
    }
    let tab_id = tokio::task::block_in_place(|| pick_numbered_choice(
        &t_cli("cmd.cli.dom.pickTab", &[]),
        &tab_choices
            .iter()
            .map(|(id, label)| (id.to_string(), label.clone()))
            .collect::<Vec<_>>(),
    ))?
    .parse::<i64>()
    .map_err(|_| anyhow!(t_cli("cmd.cli.device.invalidNumber", &[])))?;

    let scope = tokio::task::block_in_place(|| {
        pick_numbered_choice(
            &t_cli("cmd.cli.dom.pickScope", &[]),
            &[
                ("document".into(), t_cli("cmd.cli.dom.scopeDocument", &[])),
                ("viewport".into(), t_cli("cmd.cli.dom.scopeViewport", &[])),
            ],
        )
    })?;

    let flavor = tokio::task::block_in_place(|| {
        pick_numbered_choice(
            &t_cli("cmd.cli.dom.pickFlavor", &[]),
            &[
                ("--html".into(), "--html".into()),
                ("--react".into(), "--react".into()),
            ],
        )
    })?;

    Ok(DomCapturePlan {
        remote_id,
        tab_id,
        scope,
        flavor,
    })
}

fn pick_numbered_choice(prompt: &str, choices: &[(String, String)]) -> Result<String> {
    if choices.is_empty() {
        return Err(anyhow!("empty choices"));
    }
    if choices.len() == 1 {
        eprintln!("{}", t_cli("cmd.cli.device.autoSelected", &[("peer", &choices[0].1)]));
        return Ok(choices[0].0.clone());
    }
    eprintln!("{prompt}");
    for (i, (_, label)) in choices.iter().enumerate() {
        eprintln!("  {}. {label}", i + 1);
    }
    eprint!(
        "{}",
        t_cli(
            "cmd.cli.device.pickNumber",
            &[("max", &choices.len().to_string())]
        )
    );
    let _ = io::stderr().flush();
    let mut line = String::new();
    io::stdin().read_line(&mut line)?;
    let trimmed = line.trim();
    let Ok(n) = trimmed.parse::<usize>() else {
        return Err(anyhow!(t_cli("cmd.cli.device.invalidNumber", &[])));
    };
    if n == 0 || n > choices.len() {
        return Err(anyhow!(t_cli("cmd.cli.device.invalidNumber", &[])));
    }
    Ok(choices[n - 1].0.clone())
}

/**
 * EN: Pick peer + tab, start overlay, forward keys until q/Esc.
 * JA: peer+tab 選択 → overlay start → q/Esc までキー転送。
 */
pub async fn run_nav_enter_session(client: &BusClient, self_device_id: &str) -> Result<()> {
    let peers = client.list_connected().await;
    let remote_id = tokio::task::block_in_place(|| tui::pick_peer_by_number(&peers))?;

    let bundles = client.tabs_all(self_device_id, true).await?;
    let mut tab_choices: Vec<(i64, String)> = Vec::new();
    for (id, name, rows) in bundles {
        if id != remote_id {
            continue;
        }
        let peer_label = if name.is_empty() {
            id.as_str()
        } else {
            name.as_str()
        };
        for row in rows {
            if let bmxt_sync_wire::SyncRemoteTabRow::Tab {
                tab_id,
                title,
                url,
                active,
                ..
            } = row
            {
                let mark = if active { "*" } else { " " };
                tab_choices.push((
                    tab_id,
                    format!("{mark} [{peer_label}] {title} — {url}"),
                ));
            }
        }
    }
    if tab_choices.is_empty() {
        return Err(anyhow!(t_cli("cmd.cli.dom.noTabs", &[])));
    }
    // Prefer active tab when present.
    let default_idx = tab_choices
        .iter()
        .position(|(_, label)| label.starts_with('*'))
        .unwrap_or(0);
    let tab_id = if tab_choices.len() == 1 {
        tab_choices[0].0
    } else {
        tokio::task::block_in_place(|| {
            pick_numbered_choice(
                &t_cli("cmd.cli.nav.pickTab", &[]),
                &tab_choices
                    .iter()
                    .map(|(id, label)| (id.to_string(), label.clone()))
                    .collect::<Vec<_>>(),
            )
        })?
        .parse::<i64>()
        .unwrap_or(tab_choices[default_idx].0)
    };

    client
        .nav_control_on(
            self_device_id,
            &remote_id,
            tab_id,
            SyncNavControlOp::Start { use_center: true },
        )
        .await?;
    eprintln!("{}", t_cli("cmd.cli.nav.sessionHelp", &[]));

    let loop_result = tokio::task::block_in_place(|| -> Result<()> {
        enable_raw_mode()?;
        let result = (|| -> Result<()> {
            loop {
                if !event::poll(std::time::Duration::from_millis(200))? {
                    continue;
                }
                let Event::Key(key) = event::read()? else {
                    continue;
                };
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                if key.code == KeyCode::Char('q')
                    || (key.code == KeyCode::Esc && key.modifiers.is_empty())
                {
                    return Ok(());
                }
                let (key_s, code_s) = key_to_wire(&key.code);
                // Fire-and-forget is awkward in sync block — collect and send outside.
                // Store last op in thread-local via return? Simpler: use Handle::block_on per key.
                let op = SyncNavControlOp::Key {
                    key: key_s,
                    code: code_s,
                    ctrl_key: key.modifiers.contains(KeyModifiers::CONTROL),
                    shift_key: key.modifiers.contains(KeyModifiers::SHIFT),
                    alt_key: key.modifiers.contains(KeyModifiers::ALT),
                    meta_key: key.modifiers.contains(KeyModifiers::META),
                };
                let handle = tokio::runtime::Handle::current();
                if let Err(err) = handle.block_on(client.nav_control_on(
                    self_device_id,
                    &remote_id,
                    tab_id,
                    op,
                )) {
                    eprintln!("nav: {err:#}");
                }
            }
        })();
        disable_raw_mode()?;
        result
    });

    let _ = client
        .nav_control_on(self_device_id, &remote_id, tab_id, SyncNavControlOp::Stop)
        .await;
    loop_result
}

fn key_to_wire(code: &KeyCode) -> (String, String) {
    match code {
        KeyCode::Char(c) => {
            let s = c.to_string();
            (s.clone(), format!("Key{}", c.to_ascii_uppercase()))
        }
        KeyCode::Enter => ("Enter".into(), "Enter".into()),
        KeyCode::Tab => ("Tab".into(), "Tab".into()),
        KeyCode::Backspace => ("Backspace".into(), "Backspace".into()),
        KeyCode::Delete => ("Delete".into(), "Delete".into()),
        KeyCode::Left => ("ArrowLeft".into(), "ArrowLeft".into()),
        KeyCode::Right => ("ArrowRight".into(), "ArrowRight".into()),
        KeyCode::Up => ("ArrowUp".into(), "ArrowUp".into()),
        KeyCode::Down => ("ArrowDown".into(), "ArrowDown".into()),
        KeyCode::Home => ("Home".into(), "Home".into()),
        KeyCode::End => ("End".into(), "End".into()),
        KeyCode::PageUp => ("PageUp".into(), "PageUp".into()),
        KeyCode::PageDown => ("PageDown".into(), "PageDown".into()),
        KeyCode::Esc => ("Escape".into(), "Escape".into()),
        other => (format!("{other:?}"), format!("{other:?}")),
    }
}
