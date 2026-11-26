//! EN: CLI-only `dom -list` / `dom -wizard` and `nav -enter` key-forward loop.
//! JA: CLI 専用の `dom -list` / `dom -wizard` と `nav -enter` キー転送。
//!
//! EN: These entry points stay in the CLI host — they are not shared bmxt-core grammar.
//! JA: 入口は CLI host に閉じる（共有 bmxt-core 文法には載せない）。

use anyhow::{anyhow, Result};
use bmxt_sync_wire::{SyncNavControlOp, SyncRemoteTabRow};
use crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use crossterm::terminal::{disable_raw_mode, enable_raw_mode};

use crate::bus::BusClient;
use crate::msgs::t_cli;
use crate::picker::{self, PeerTabRow};

const MAX_ID_LEN: usize = 64;

pub struct DomCapturePlan {
    pub remote_id: String,
    pub tab_id: i64,
    pub scope: String,
    pub flavor: String,
    pub show_tag: bool,
    pub pattern: String,
}

/**
 * EN: True when the line is CLI-owned `dom -wizard` (exact second token).
 * JA: CLI 専用 `dom -wizard`（第二トークン一致）かどうか。
 */
pub fn is_cli_dom_wizard_line(line: &str) -> bool {
    let parts: Vec<&str> = line.split_whitespace().collect();
    parts.len() == 2
        && parts[0].eq_ignore_ascii_case("dom")
        && parts[1].eq_ignore_ascii_case("-wizard")
}

/**
 * EN: True when the line is CLI-owned `dom -list` (peer capture; not extension picker grammar).
 * JA: CLI 専用 `dom -list`（peer 取得。拡張ピッカー文法ではない）かどうか。
 */
pub fn is_cli_dom_list_line(line: &str) -> bool {
    let parts: Vec<&str> = line.split_whitespace().collect();
    parts.len() >= 2
        && parts[0].eq_ignore_ascii_case("dom")
        && parts[1].eq_ignore_ascii_case("-list")
}

/**
 * EN: Parse CLI `dom -list --device <id> --tab <n> …` (host-local; not bmxt-core).
 * JA: CLI の `dom -list --device <id> --tab <n> …` を解釈（host 局所。bmxt-core ではない）。
 */
pub fn parse_cli_dom_list_line(line: &str) -> Result<DomCapturePlan> {
    let parts: Vec<String> = line
        .split_whitespace()
        .filter(|p| !p.is_empty())
        .map(|p| p.to_string())
        .collect();
    if parts.len() < 2
        || !parts[0].eq_ignore_ascii_case("dom")
        || !parts[1].eq_ignore_ascii_case("-list")
    {
        return Err(anyhow!(t_cli("cmd.cli.dom.needDeviceTabOrWizard", &[])));
    }

    let mut device_id = String::new();
    let mut tab_id = String::new();
    let mut scope = "document".to_string();
    let mut flavor = "--html".to_string();
    let mut show_tag = false;
    let mut pattern_parts: Vec<String> = Vec::new();
    let mut i = 2usize;
    while i < parts.len() {
        let token = parts[i].to_ascii_lowercase();
        if token == "--device" {
            let Some(raw) = parts.get(i + 1) else {
                return Err(anyhow!(t_cli("cmd.cli.dom.needDeviceTabOrWizard", &[])));
            };
            let id = sanitize_device_id(raw)
                .ok_or_else(|| anyhow!(t_cli("cmd.cli.dom.needDeviceTabOrWizard", &[])))?;
            device_id = id;
            i += 2;
            continue;
        }
        if token == "--tab" {
            let Some(raw) = parts.get(i + 1) else {
                return Err(anyhow!(t_cli("cmd.cli.dom.needDeviceTabOrWizard", &[])));
            };
            let id = sanitize_tab_id(raw)
                .ok_or_else(|| anyhow!(t_cli("cmd.cli.dom.needDeviceTabOrWizard", &[])))?;
            tab_id = id;
            i += 2;
            continue;
        }
        if token == "--document" {
            scope = "document".to_string();
            i += 1;
            continue;
        }
        if token == "--viewport" {
            scope = "viewport".to_string();
            i += 1;
            continue;
        }
        if token == "--html" || token == "--react" {
            flavor = token;
            i += 1;
            continue;
        }
        if token == "--tag" {
            show_tag = true;
            i += 1;
            continue;
        }
        if token == "--normal" || token == "--with" {
            // EN: Extension picker modes are ignored on CLI oneshot (stdout dump only).
            i += 1;
            continue;
        }
        if token.starts_with("--") {
            return Err(anyhow!(t_cli("cmd.cli.dom.needDeviceTabOrWizard", &[])));
        }
        pattern_parts.push(parts[i].clone());
        i += 1;
    }

    if device_id.is_empty() || tab_id.is_empty() {
        return Err(anyhow!(t_cli("cmd.cli.dom.needDeviceTabOrWizard", &[])));
    }
    let tab_id_n: i64 = tab_id
        .parse()
        .map_err(|_| anyhow!(t_cli("cmd.cli.dom.needDeviceTabOrWizard", &[])))?;

    Ok(DomCapturePlan {
        remote_id: device_id,
        tab_id: tab_id_n,
        scope,
        flavor,
        show_tag,
        pattern: pattern_parts.join(" "),
    })
}

fn sanitize_device_id(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_ID_LEN {
        return None;
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return None;
    }
    Some(trimmed.to_string())
}

fn sanitize_tab_id(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    let Ok(n) = trimmed.parse::<i64>() else {
        return None;
    };
    if n < 0 {
        return None;
    }
    Some(n.to_string())
}

fn peer_tab_rows_for(
    bundles: Vec<(String, String, Vec<SyncRemoteTabRow>)>,
    remote_id: &str,
) -> Vec<PeerTabRow> {
    let mut out = Vec::new();
    for (id, name, rows) in bundles {
        if id != remote_id {
            continue;
        }
        let peer_label = if name.is_empty() {
            id.clone()
        } else {
            name.clone()
        };
        out.push(PeerTabRow {
            peer_device_id: id.clone(),
            peer_display_name: peer_label.clone(),
            row: SyncRemoteTabRow::Window {
                window_id: -1,
                title: format!("── {peer_label} ──"),
                focused: false,
            },
        });
        for row in rows {
            out.push(PeerTabRow {
                peer_device_id: id.clone(),
                peer_display_name: peer_label.clone(),
                row,
            });
        }
    }
    out
}

/**
 * EN: Interactive 4-step source pick for `dom -wizard` (ratatui pickers).
 * JA: `dom -wizard` の 4 段選択（peer → tab → scope → flavor）。ratatui picker。
 */
pub async fn run_dom_wizard(client: &BusClient, self_device_id: &str) -> Result<DomCapturePlan> {
    let peers = client.list_connected().await;
    let remote_id = tokio::task::block_in_place(|| picker::pick_peer(&peers))?;

    let bundles = client.tabs_all(self_device_id, true).await?;
    let rows = peer_tab_rows_for(bundles, &remote_id);
    let tab = tokio::task::block_in_place(|| picker::pick_tab_once(rows))?;

    let scope = tokio::task::block_in_place(|| {
        picker::pick_labeled_once(
            &t_cli("cmd.cli.dom.pickScope", &[]),
            &[
                ("document".into(), t_cli("cmd.cli.dom.scopeDocument", &[])),
                ("viewport".into(), t_cli("cmd.cli.dom.scopeViewport", &[])),
            ],
        )
    })?;

    let flavor = tokio::task::block_in_place(|| {
        picker::pick_labeled_once(
            &t_cli("cmd.cli.dom.pickFlavor", &[]),
            &[
                ("--html".into(), "--html".into()),
                ("--react".into(), "--react".into()),
            ],
        )
    })?;

    Ok(DomCapturePlan {
        remote_id,
        tab_id: tab.tab_id,
        scope,
        flavor,
        show_tag: false,
        pattern: String::new(),
    })
}

/**
 * EN: CLI free-move steps (px). Plain arrows use pixel move — spatial step=1 feels stuck
 *     without the extension HUD. Shift+arrow is avoided: many terminals steal it for scrollback.
 * JA: CLI の自由移動 px。素の矢印はピクセル移動（空間 step=1 は CLI ではほぼ動かない）。
 *     Shift+矢印は端末のスクロール横取りが多いため使わない。
 */
const NAV_ARROW_STEP_PX: i64 = 24;
const NAV_ARROW_STEP_FAST_PX: i64 = 72;

/**
 * EN: Pick peer + tab via ratatui, start overlay, drive cursor with arrows until q/Esc.
 *     Does not focus the peer browser window — keys stay in this terminal (raw mode).
 * JA: peer+tab を ratatui で選択 → overlay start → 矢印でカーソル操作 → q/Esc。
 *     peer ブラウザへフォーカスしない（キーは本端末の raw mode で消費）。
 */
pub async fn run_nav_enter_session(client: &BusClient, self_device_id: &str) -> Result<()> {
    let peers = client.list_connected().await;
    let remote_id = tokio::task::block_in_place(|| picker::pick_peer(&peers))?;

    let bundles = client.tabs_all(self_device_id, true).await?;
    let rows = peer_tab_rows_for(bundles, &remote_id);
    let tab = tokio::task::block_in_place(|| picker::pick_tab_once(rows))?;
    let tab_id = tab.tab_id;

    client
        .nav_control_on(
            self_device_id,
            &remote_id,
            tab_id,
            SyncNavControlOp::Start { use_center: true },
        )
        .await?;
    eprintln!("{}", t_cli("cmd.cli.nav.sessionHelp", &[]));

    // EN: Collect last RPC error; never eprintln inside raw mode (corrupts the TTY).
    let (loop_result, last_err) = tokio::task::block_in_place(|| {
        let mut last_err: Option<String> = None;
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
                let Some(op) = key_to_nav_op(&key.code, key.modifiers) else {
                    // EN: Printable / other keys ignored until CLI typing mode exists.
                    continue;
                };
                let handle = tokio::runtime::Handle::current();
                if let Err(err) = handle.block_on(client.nav_control_on(
                    self_device_id,
                    &remote_id,
                    tab_id,
                    op,
                )) {
                    last_err = Some(format!("{err:#}"));
                }
            }
        })();
        disable_raw_mode()?;
        Ok::<_, anyhow::Error>((result, last_err))
    })?;

    let _ = client
        .nav_control_on(self_device_id, &remote_id, tab_id, SyncNavControlOp::Stop)
        .await;
    if let Some(detail) = last_err {
        eprintln!("nav: {detail}");
    }
    loop_result
}

/**
 * EN: Map CLI keys to overlay ops. Arrows = pixel free-move (not spatial step=1).
 *     Alt+arrow = larger step. Never use Shift (terminal scrollback). Never `Key`/`forwardKey`.
 * JA: 矢印=ピクセル自由移動（空間 step=1 ではない）。Alt+矢印=大ステップ。
 *     Shift は使わない（端末スクロール）。`Key`/`forwardKey` には送らない。
 */
fn key_to_nav_op(code: &KeyCode, modifiers: KeyModifiers) -> Option<SyncNavControlOp> {
    if matches!(code, KeyCode::Enter) {
        return Some(SyncNavControlOp::Click);
    }
    let step = if modifiers.contains(KeyModifiers::ALT) {
        NAV_ARROW_STEP_FAST_PX
    } else {
        NAV_ARROW_STEP_PX
    };
    let (dx, dy) = match code {
        KeyCode::Left => (-step, 0),
        KeyCode::Right => (step, 0),
        KeyCode::Up => (0, -step),
        KeyCode::Down => (0, step),
        _ => return None,
    };
    Some(SyncNavControlOp::Move {
        dx,
        dy,
        free_move: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn arrows_map_to_pixel_free_move() {
        let op = key_to_nav_op(&KeyCode::Left, KeyModifiers::NONE).expect("left");
        assert!(matches!(
            op,
            SyncNavControlOp::Move {
                dx: -24,
                dy: 0,
                free_move: true
            }
        ));
        let op = key_to_nav_op(&KeyCode::Up, KeyModifiers::ALT).expect("up");
        assert!(matches!(
            op,
            SyncNavControlOp::Move {
                dx: 0,
                dy: -72,
                free_move: true
            }
        ));
    }

    #[test]
    fn enter_maps_to_click() {
        let op = key_to_nav_op(&KeyCode::Enter, KeyModifiers::NONE).expect("enter");
        assert!(matches!(op, SyncNavControlOp::Click));
    }

    #[test]
    fn printable_ignored() {
        assert!(key_to_nav_op(&KeyCode::Char('a'), KeyModifiers::NONE).is_none());
    }
}
