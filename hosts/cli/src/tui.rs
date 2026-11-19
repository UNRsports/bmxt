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
 * JA: 対話一覧。Enter で activate（picker は開いたまま）。Esc/q で明示的に閉じる。
 */
pub fn run_tab_picker<F>(rows: &[PeerTabRow], mut on_activate: F) -> Result<()>
where
    F: FnMut(&PickerSelection) -> Result<()>,
{
    let entries: Vec<PickerEntry> = rows.iter().filter_map(PickerEntry::from_peer_row).collect();
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
        let mut status = String::from("↑↓ move · / filter · Enter activate · q/Esc close");

        loop {
            let filtered: Vec<usize> = entries
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
