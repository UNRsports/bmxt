//! EN: One-shot labeled list picker — Enter selects and closes; q/Esc cancels.
//! JA: ワンショット一覧。Enter で確定して閉じる。q/Esc でキャンセル。

use anyhow::{anyhow, Result};
use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, List, ListItem, ListState, Paragraph};

use crate::msgs::t_cli;
use crate::picker::terminal;

/**
 * EN: Pick one `(id, label)` with ratatui. One choice → auto-select.
 *     Cancel (q/Esc) → error. Empty → error.
 * JA: `(id, label)` を1つ選ぶ。1件なら自動確定。キャンセルはエラー。
 */
pub fn pick_labeled_once(
    title: &str,
    choices: &[(String, String)],
) -> Result<String> {
    if choices.is_empty() {
        return Err(anyhow!("empty choices"));
    }
    if choices.len() == 1 {
        let label = choices[0].1.as_str();
        eprintln!(
            "{}",
            t_cli("cmd.cli.device.autoSelected", &[("peer", label)])
        );
        return Ok(choices[0].0.clone());
    }

    let mut terminal = terminal::enter()?;
    let result = (|| -> Result<String> {
        let mut state = ListState::default();
        state.select(Some(0));
        let mut filter = String::new();
        let mut searching = false;
        let mut status = t_cli("cmd.cli.picker.oneshotHelp", &[]);

        loop {
            let filtered = filtered_indices(choices, &filter);
            clamp_selection(&mut state, filtered.len());

            terminal.draw(|frame| {
                let chunks = Layout::default()
                    .direction(Direction::Vertical)
                    .constraints([Constraint::Min(3), Constraint::Length(3)])
                    .split(frame.area());
                let items: Vec<ListItem> = filtered
                    .iter()
                    .map(|idx| ListItem::new(choices[*idx].1.as_str()))
                    .collect();
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
                KeyCode::Char('q') | KeyCode::Esc => {
                    return Err(anyhow!(t_cli("cmd.cli.picker.cancelled", &[])));
                }
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
                            return Ok(choices[*entry_idx].0.clone());
                        }
                    }
                    status = t_cli("cmd.cli.picker.oneshotHelp", &[]);
                }
                _ => {}
            }
        }
    })();
    terminal::leave();
    result
}

fn filtered_indices(choices: &[(String, String)], filter: &str) -> Vec<usize> {
    choices
        .iter()
        .enumerate()
        .filter(|(_, (_, label))| {
            if filter.is_empty() {
                true
            } else {
                label.to_lowercase().contains(&filter.to_lowercase())
            }
        })
        .map(|(i, _)| i)
        .collect()
}

fn clamp_selection(state: &mut ListState, filtered_len: usize) {
    if let Some(sel) = state.selected() {
        if filtered_len == 0 {
            state.select(None);
        } else if sel >= filtered_len {
            state.select(Some(filtered_len - 1));
        }
    } else if filtered_len > 0 {
        state.select(Some(0));
    }
}
