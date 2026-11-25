//! EN: Terminal tab picker (ratatui) — ↑↓ / filter, Enter activates, q/Esc closes.
//! JA: 端末タブ picker。↑↓・/ フィルタ、Enter で activate、q/Esc で閉じる。

use anyhow::Result;
use bmxt_sync_wire::SyncRemoteTabRow;
use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use crossterm::ExecutableCommand;
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, List, ListItem, ListState, Paragraph};
use std::io::stdout;

use crate::msgs::t_cli;

/** EN: Tab list row tagged with the Family peer that owns the Chrome/Firefox inventory. */
#[derive(Debug, Clone)]
pub struct PeerTabRow {
    pub peer_device_id: String,
    pub peer_display_name: String,
    pub row: SyncRemoteTabRow,
}

#[derive(Debug, Clone)]
pub struct PickerSelection {
    /** EN: Family device that owns this tab (required for tabs_ops routing). */
    pub peer_device_id: String,
    pub tab_id: i64,
    pub window_id: i64,
    pub title: String,
    pub url: String,
}

pub fn run_demo_tui() -> Result<()> {
    println!("Open a live session with `bmxt sync-connect`, then `tab -list --peers | browse`.");
    Ok(())
}

/**
 * EN: Interactive list. Enter activates via `on_activate` but keeps the picker open.
 *     Esc/q closes explicitly (`Ok(())`). Window/group rows are not selectable.
 *     `on_maybe_refresh` may return a new row snapshot (Family `tabs_changed`).
 * JA: 対話一覧。Enter で activate（picker は開いたまま）。Esc/q で明示的に閉じる。
 *     `on_maybe_refresh` は Family `tabs_changed` 時に新しい行スナップショットを返す。
 */
#[derive(Debug)]
pub enum PickerRefresh {
    Idle,
    Updated(Vec<PeerTabRow>),
    Failed(String),
}

pub fn run_tab_picker<F, R>(
    initial_rows: Vec<PeerTabRow>,
    mut on_activate: F,
    mut on_maybe_refresh: R,
) -> Result<()>
where
    F: FnMut(&PickerSelection) -> Result<()>,
    R: FnMut() -> PickerRefresh,
{
    let mut entries: Vec<PickerEntry> = initial_rows
        .iter()
        .filter_map(PickerEntry::from_peer_row)
        .collect();
    if entries.is_empty() {
        println!("(empty list)");
        return Ok(());
    }

    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;
    let result = (|| -> Result<()> {
        let mut terminal = Terminal::new(CrosstermBackend::new(stdout()))?;
        let mut state = ListState::default();
        state.select(Some(0));
        let mut filter = String::new();
        let mut searching = false;
        let mut status = t_cli("cmd.cli.picker.help", &[]);

        loop {
            match on_maybe_refresh() {
                PickerRefresh::Idle => {}
                PickerRefresh::Updated(new_rows) => {
                    let keep = selected_tab_key(&entries, &state, &filter);
                    entries = new_rows
                        .iter()
                        .filter_map(PickerEntry::from_peer_row)
                        .collect();
                    restore_selection(&mut state, &entries, &filter, keep.as_ref());
                    status = t_cli("cmd.cli.picker.refreshed", &[]);
                }
                PickerRefresh::Failed(detail) => {
                    status = format!("refresh error: {detail} · q/Esc close");
                }
            }

            let filtered = filtered_indices(&entries, &filter);

            if let Some(sel) = state.selected() {
                if filtered.is_empty() {
                    state.select(None);
                } else if sel >= filtered.len() {
                    state.select(Some(filtered.len() - 1));
                }
            } else if !filtered.is_empty() {
                state.select(Some(0));
            }

            terminal.draw(|frame| {
                let chunks = Layout::default()
                    .direction(Direction::Vertical)
                    .constraints([Constraint::Min(3), Constraint::Length(3)])
                    .split(frame.area());
                let items: Vec<ListItem> = filtered
                    .iter()
                    .map(|idx| ListItem::new(entries[*idx].label.as_str()))
                    .collect();
                let list = List::new(items)
                    .block(
                        Block::default()
                            .borders(Borders::ALL)
                            .title("BMXt tab picker"),
                    )
                    .highlight_symbol("▶ ");
                frame.render_stateful_widget(list, chunks[0], &mut state);
                let footer = if searching {
                    format!("/{filter}_")
                } else {
                    status.clone()
                };
                frame.render_widget(
                    Paragraph::new(footer).block(Block::default().borders(Borders::ALL)),
                    chunks[1],
                );
            })?;

            if !event::poll(std::time::Duration::from_millis(200))? {
                continue;
            }
            let Event::Key(key) = event::read()? else {
                continue;
            };
            if key.kind != KeyEventKind::Press {
                continue;
            }
            if searching {
                match key.code {
                    KeyCode::Esc => {
                        searching = false;
                        filter.clear();
                    }
                    KeyCode::Enter => searching = false,
                    KeyCode::Backspace => {
                        filter.pop();
                    }
                    KeyCode::Char(c) => filter.push(c),
                    _ => {}
                }
                continue;
            }
            match key.code {
                KeyCode::Char('q') | KeyCode::Esc => return Ok(()),
                KeyCode::Char('/') => {
                    searching = true;
                    filter.clear();
                }
                KeyCode::Down | KeyCode::Char('j') => {
                    let i = state.selected().unwrap_or(0);
                    if i + 1 < filtered.len() {
                        state.select(Some(i + 1));
                    }
                }
                KeyCode::Up | KeyCode::Char('k') => {
                    let i = state.selected().unwrap_or(0);
                    if i > 0 {
                        state.select(Some(i - 1));
                    }
                }
                KeyCode::Enter => {
                    if let Some(fi) = state.selected() {
                        if let Some(entry_idx) = filtered.get(fi) {
                            if let Some(tab) = &entries[*entry_idx].tab {
                                match on_activate(tab) {
                                    Ok(()) => {
                                        status = if tab.url.is_empty() {
                                            format!(
                                                "activated {} — {} · q/Esc close",
                                                tab.tab_id, tab.title
                                            )
                                        } else {
                                            format!(
                                                "activated {} — {} {} · q/Esc close",
                                                tab.tab_id, tab.title, tab.url
                                            )
                                        };
                                    }
                                    Err(err) => {
                                        status = format!("error: {err} · q/Esc close");
                                    }
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    })();

    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;
    result
}

fn filtered_indices(entries: &[PickerEntry], filter: &str) -> Vec<usize> {
    entries
        .iter()
        .enumerate()
        .filter(|(_, e)| {
            if filter.is_empty() {
                true
            } else {
                e.label.to_lowercase().contains(&filter.to_lowercase())
            }
        })
        .map(|(i, _)| i)
        .collect()
}

fn selected_tab_key(
    entries: &[PickerEntry],
    state: &ListState,
    filter: &str,
) -> Option<(String, i64)> {
    let filtered = filtered_indices(entries, filter);
    let fi = state.selected()?;
    let entry_idx = *filtered.get(fi)?;
    let tab = entries.get(entry_idx)?.tab.as_ref()?;
    Some((tab.peer_device_id.clone(), tab.tab_id))
}

fn restore_selection(
    state: &mut ListState,
    entries: &[PickerEntry],
    filter: &str,
    keep: Option<&(String, i64)>,
) {
    let filtered = filtered_indices(entries, filter);
    if filtered.is_empty() {
        state.select(None);
        return;
    }
    if let Some((peer, tab_id)) = keep {
        for (fi, entry_idx) in filtered.iter().enumerate() {
            if let Some(tab) = &entries[*entry_idx].tab {
                if &tab.peer_device_id == peer && tab.tab_id == *tab_id {
                    state.select(Some(fi));
                    return;
                }
            }
        }
    }
    state.select(Some(0));
}

struct PickerEntry {
    label: String,
    tab: Option<PickerSelection>,
}

impl PickerEntry {
    fn from_peer_row(peer_row: &PeerTabRow) -> Option<Self> {
        let peer = peer_row.peer_device_id.as_str();
        match &peer_row.row {
            SyncRemoteTabRow::Window {
                window_id,
                title,
                focused,
            } => Some(Self {
                label: format!(
                    "W {window_id} {} {title}",
                    if *focused { "*" } else { " " }
                ),
                tab: None,
            }),
            SyncRemoteTabRow::Group {
                window_id,
                group_id,
                label,
                ..
            } => Some(Self {
                label: format!("  G {group_id:?} win={window_id} {label}"),
                tab: None,
            }),
            SyncRemoteTabRow::Tab {
                tab_id,
                window_id,
                title,
                url,
                active,
                ..
            } => Some(Self {
                label: format!(
                    "    T {tab_id} {} [{}] {title}  {url}",
                    if *active { "*" } else { " " },
                    peer_row.peer_display_name
                ),
                tab: Some(PickerSelection {
                    peer_device_id: peer.to_string(),
                    tab_id: *tab_id,
                    window_id: *window_id,
                    title: title.clone(),
                    url: url.clone(),
                }),
            }),
        }
    }
}

/** EN: Flat URL hit for bookmark/history CLI browse (open via open_tabs). */
#[derive(Debug, Clone)]
pub struct PeerUrlHit {
    pub source: String,
    pub title: String,
    pub url: String,
    pub bookmark_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct UrlPickerSelection {
    #[allow(dead_code)] // EN: Kept for status / future labels.
    pub title: String,
    pub url: String,
}

/** EN: Connected peer offered as open destination. */
#[derive(Debug, Clone)]
pub struct UrlOpenPeer {
    pub device_id: String,
    pub display_name: String,
}

enum UrlPickerMode {
    Browse,
    PickPeer,
}

/**
 * EN: Interactive flat URL list.
 *     Browse: Space marks URLs; Enter opens (then destination peer list).
 *     Dest peers: Tab marks peers; Enter opens on all marked (or highlight if none).
 * JA: flat URL 一覧。
 *     一覧: Space で URL マーク → Enter で送信先ピア一覧へ。
 *     送信先: Tab でピア複数選択 → Enter で開く。
 */
pub fn run_url_picker<F>(
    hits: Vec<PeerUrlHit>,
    open_peers: Vec<UrlOpenPeer>,
    mut on_open: F,
) -> Result<()>
where
    F: FnMut(&[String], &[UrlPickerSelection]) -> Result<()>,
{
    let entries: Vec<(String, UrlPickerSelection)> = hits
        .into_iter()
        .filter(|h| !h.url.trim().is_empty())
        .map(|h| {
            let id_part = h
                .bookmark_id
                .as_ref()
                .map(|id| format!(" id={id}"))
                .unwrap_or_default();
            let label = format!("[{}] {} — {}{}", h.source, h.title, h.url, id_part);
            (
                label,
                UrlPickerSelection {
                    title: h.title,
                    url: h.url,
                },
            )
        })
        .collect();
    if entries.is_empty() {
        println!("(empty list)");
        return Ok(());
    }
    if open_peers.is_empty() {
        return Err(anyhow::anyhow!("no connected peers for open destination"));
    }

    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;
    let result = (|| -> Result<()> {
        let mut terminal = Terminal::new(CrosstermBackend::new(stdout()))?;
        let mut state = ListState::default();
        state.select(Some(0));
        let mut filter = String::new();
        let mut searching = false;
        let mut marked: std::collections::HashSet<usize> = std::collections::HashSet::new();
        let mut mode = UrlPickerMode::Browse;
        let mut pending_open: Vec<UrlPickerSelection> = Vec::new();
        let mut peer_state = ListState::default();
        peer_state.select(Some(0));
        let mut peer_marked: std::collections::HashSet<usize> =
            std::collections::HashSet::new();
        let mut status = t_cli("cmd.cli.urlPicker.help", &[]);

        loop {
            match mode {
                UrlPickerMode::Browse => {
                    let filtered: Vec<usize> = entries
                        .iter()
                        .enumerate()
                        .filter(|(_, (label, _))| {
                            if filter.is_empty() {
                                true
                            } else {
                                label.to_lowercase().contains(&filter.to_lowercase())
                            }
                        })
                        .map(|(i, _)| i)
                        .collect();

                    if let Some(sel) = state.selected() {
                        if filtered.is_empty() {
                            state.select(None);
                        } else if sel >= filtered.len() {
                            state.select(Some(filtered.len() - 1));
                        }
                    } else if !filtered.is_empty() {
                        state.select(Some(0));
                    }

                    terminal.draw(|frame| {
                        let chunks = Layout::default()
                            .direction(Direction::Vertical)
                            .constraints([Constraint::Min(3), Constraint::Length(3)])
                            .split(frame.area());
                        let items: Vec<ListItem> = filtered
                            .iter()
                            .map(|idx| {
                                let mark = if marked.contains(idx) { "[x] " } else { "[ ] " };
                                ListItem::new(format!("{mark}{}", entries[*idx].0))
                            })
                            .collect();
                        let title = format!(
                            "BMXt URL picker · marked {}",
                            marked.len()
                        );
                        let list = List::new(items)
                            .block(Block::default().borders(Borders::ALL).title(title))
                            .highlight_symbol("▶ ");
                        frame.render_stateful_widget(list, chunks[0], &mut state);
                        let footer = if searching {
                            format!("/{filter}_")
                        } else {
                            status.clone()
                        };
                        frame.render_widget(
                            Paragraph::new(footer).block(Block::default().borders(Borders::ALL)),
                            chunks[1],
                        );
                    })?;

                    if !event::poll(std::time::Duration::from_millis(200))? {
                        continue;
                    }
                    let Event::Key(key) = event::read()? else {
                        continue;
                    };
                    if key.kind != KeyEventKind::Press {
                        continue;
                    }
                    if searching {
                        match key.code {
                            KeyCode::Esc => {
                                searching = false;
                                filter.clear();
                            }
                            KeyCode::Enter => searching = false,
                            KeyCode::Backspace => {
                                filter.pop();
                            }
                            KeyCode::Char(c) => filter.push(c),
                            _ => {}
                        }
                        continue;
                    }
                    match key.code {
                        KeyCode::Char('q') | KeyCode::Esc => return Ok(()),
                        KeyCode::Char('/') => {
                            searching = true;
                            filter.clear();
                        }
                        KeyCode::Down | KeyCode::Char('j') => {
                            let i = state.selected().unwrap_or(0);
                            if i + 1 < filtered.len() {
                                state.select(Some(i + 1));
                            }
                        }
                        KeyCode::Up | KeyCode::Char('k') => {
                            let i = state.selected().unwrap_or(0);
                            if i > 0 {
                                state.select(Some(i - 1));
                            }
                        }
                        KeyCode::Char(' ') => {
                            if let Some(fi) = state.selected() {
                                if let Some(entry_idx) = filtered.get(fi).copied() {
                                    if !marked.remove(&entry_idx) {
                                        marked.insert(entry_idx);
                                    }
                                    status = t_cli(
                                        "cmd.cli.urlPicker.marked",
                                        &[("count", &marked.len().to_string())],
                                    );
                                }
                            }
                        }
                        KeyCode::Enter => {
                            let targets: Vec<UrlPickerSelection> = if marked.is_empty() {
                                if let Some(fi) = state.selected() {
                                    filtered
                                        .get(fi)
                                        .map(|idx| entries[*idx].1.clone())
                                        .into_iter()
                                        .collect()
                                } else {
                                    Vec::new()
                                }
                            } else {
                                let mut idxs: Vec<usize> = marked.iter().copied().collect();
                                idxs.sort_unstable();
                                idxs.into_iter()
                                    .filter_map(|idx| entries.get(idx).map(|e| e.1.clone()))
                                    .collect()
                            };
                            if targets.is_empty() {
                                status = t_cli("cmd.cli.urlPicker.noneSelected", &[]);
                                continue;
                            }
                            pending_open = targets;
                            peer_marked.clear();
                            if open_peers.len() == 1 {
                                peer_marked.insert(0);
                            }
                            mode = UrlPickerMode::PickPeer;
                            peer_state.select(Some(0));
                            status = t_cli(
                                "cmd.cli.urlPicker.pickPeer",
                                &[("count", &pending_open.len().to_string())],
                            );
                        }
                        _ => {}
                    }
                }
                UrlPickerMode::PickPeer => {
                    terminal.draw(|frame| {
                        let chunks = Layout::default()
                            .direction(Direction::Vertical)
                            .constraints([Constraint::Min(3), Constraint::Length(3)])
                            .split(frame.area());
                        let items: Vec<ListItem> = open_peers
                            .iter()
                            .enumerate()
                            .map(|(i, p)| {
                                let name = if p.display_name.is_empty() {
                                    p.device_id.as_str()
                                } else {
                                    p.display_name.as_str()
                                };
                                let mark = if peer_marked.contains(&i) {
                                    "[x] "
                                } else {
                                    "[ ] "
                                };
                                ListItem::new(format!("{mark}{name}  ({})", p.device_id))
                            })
                            .collect();
                        let title = format!(
                            "Open on peer · selected {}",
                            peer_marked.len()
                        );
                        let list = List::new(items)
                            .block(Block::default().borders(Borders::ALL).title(title))
                            .highlight_symbol("▶ ");
                        frame.render_stateful_widget(list, chunks[0], &mut peer_state);
                        frame.render_widget(
                            Paragraph::new(status.clone())
                                .block(Block::default().borders(Borders::ALL)),
                            chunks[1],
                        );
                    })?;

                    if !event::poll(std::time::Duration::from_millis(200))? {
                        continue;
                    }
                    let Event::Key(key) = event::read()? else {
                        continue;
                    };
                    if key.kind != KeyEventKind::Press {
                        continue;
                    }
                    match key.code {
                        KeyCode::Char('q') => return Ok(()),
                        KeyCode::Esc => {
                            pending_open.clear();
                            peer_marked.clear();
                            mode = UrlPickerMode::Browse;
                            status = t_cli("cmd.cli.urlPicker.help", &[]);
                        }
                        KeyCode::Down | KeyCode::Char('j') => {
                            let i = peer_state.selected().unwrap_or(0);
                            if i + 1 < open_peers.len() {
                                peer_state.select(Some(i + 1));
                            }
                        }
                        KeyCode::Up | KeyCode::Char('k') => {
                            let i = peer_state.selected().unwrap_or(0);
                            if i > 0 {
                                peer_state.select(Some(i - 1));
                            }
                        }
                        KeyCode::Tab => {
                            if let Some(i) = peer_state.selected() {
                                if i < open_peers.len() {
                                    if !peer_marked.remove(&i) {
                                        peer_marked.insert(i);
                                    }
                                    status = t_cli(
                                        "cmd.cli.urlPicker.peersMarked",
                                        &[("count", &peer_marked.len().to_string())],
                                    );
                                }
                            }
                        }
                        KeyCode::Enter => {
                            let dest_idxs: Vec<usize> = if peer_marked.is_empty() {
                                peer_state.selected().into_iter().collect()
                            } else {
                                let mut idxs: Vec<usize> = peer_marked.iter().copied().collect();
                                idxs.sort_unstable();
                                idxs
                            };
                            let dest_ids: Vec<String> = dest_idxs
                                .iter()
                                .filter_map(|i| open_peers.get(*i).map(|p| p.device_id.clone()))
                                .collect();
                            let dest_names: Vec<String> = dest_idxs
                                .iter()
                                .filter_map(|i| {
                                    open_peers.get(*i).map(|p| {
                                        if p.display_name.is_empty() {
                                            p.device_id.clone()
                                        } else {
                                            p.display_name.clone()
                                        }
                                    })
                                })
                                .collect();
                            if dest_ids.is_empty() {
                                status = t_cli("cmd.cli.urlPicker.noPeerSelected", &[]);
                                continue;
                            }
                            let targets = pending_open.clone();
                            match on_open(&dest_ids, &targets) {
                                Ok(()) => {
                                    status = t_cli(
                                        "cmd.cli.urlPicker.opened",
                                        &[
                                            ("count", &targets.len().to_string()),
                                            ("peer", &dest_names.join(", ")),
                                        ],
                                    );
                                    marked.clear();
                                    peer_marked.clear();
                                    pending_open.clear();
                                    mode = UrlPickerMode::Browse;
                                }
                                Err(err) => {
                                    status = format!("error: {err} · Esc back");
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    })();

    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;
    result
}
