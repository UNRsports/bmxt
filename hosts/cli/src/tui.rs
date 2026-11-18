use anyhow::Result;
use bmxt_sync_wire::SyncRemoteTabRow;
use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use crossterm::terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen};
use crossterm::ExecutableCommand;
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, List, ListItem, ListState, Paragraph};
use std::io::stdout;

pub fn run_demo_tui() -> Result<()> {
    println!("Open a live session with `bmxt sync-connect`, then type `tui` in the REPL.");
    Ok(())
}

pub fn run_tab_picker(rows: &[SyncRemoteTabRow]) -> Result<()> {
    let lines: Vec<String> = rows
        .iter()
        .map(|r| match r {
            SyncRemoteTabRow::Window {
                window_id, title, ..
            } => format!("W {window_id} {title}"),
            SyncRemoteTabRow::Group {
                label, group_id, ..
            } => format!("  G {group_id:?} {label}"),
            SyncRemoteTabRow::Tab {
                tab_id,
                title,
                url,
                ..
            } => format!("    T {tab_id} {title}  {url}"),
        })
        .collect();

    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout()))?;
    let mut state = ListState::default();
    if !lines.is_empty() {
        state.select(Some(0));
    }
    let mut filter = String::new();
    let mut searching = false;

    loop {
        let filtered: Vec<(usize, &String)> = lines
            .iter()
            .enumerate()
            .filter(|(_, line)| {
                if filter.is_empty() {
                    true
                } else {
                    line.to_lowercase().contains(&filter.to_lowercase())
                }
            })
            .collect();

        terminal.draw(|frame| {
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([Constraint::Min(3), Constraint::Length(3)])
                .split(frame.area());
            let items: Vec<ListItem> = filtered
                .iter()
                .map(|(_, line)| ListItem::new(line.as_str()))
                .collect();
            let list = List::new(items)
                .block(Block::default().borders(Borders::ALL).title("tab picker (/ search, Enter/q)"))
                .highlight_symbol("▶ ");
            frame.render_stateful_widget(list, chunks[0], &mut state);
            let footer = if searching {
                format!("/{filter}")
            } else {
                "↑↓ move · / filter · Enter select · q/Esc quit".into()
            };
            frame.render_widget(
                Paragraph::new(footer).block(Block::default().borders(Borders::ALL)),
                chunks[1],
            );
        })?;

        if event::poll(std::time::Duration::from_millis(200))? {
            if let Event::Key(key) = event::read()? {
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
                    KeyCode::Char('q') | KeyCode::Esc => break,
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
                        if let Some(i) = state.selected() {
                            if let Some((_, line)) = filtered.get(i) {
                                eprintln!("selected: {line}");
                            }
                        }
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;
    Ok(())
}
