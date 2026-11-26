//! EN: Flat URL picker (bookmark/history browse) with destination peer multi-mark.
//! JA: bookmark/history 用 flat URL picker（送信先ピア複数マーク）。

use anyhow::Result;
use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, List, ListItem, ListState, Paragraph};

use crate::msgs::t_cli;
use crate::picker::terminal;

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

    let mut terminal = terminal::enter()?;
    let result = (|| -> Result<()> {
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

    terminal::leave();
    result
}

