//! EN: Shared crossterm / ratatui alternate-screen enter/leave for CLI pickers.
//! JA: CLI picker 共通の alternate-screen 出入り。

use anyhow::Result;
use crossterm::event::{self, Event};
use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use crossterm::ExecutableCommand;
use ratatui::backend::CrosstermBackend;
use ratatui::Terminal;
use std::io::stdout;
use std::time::Duration;

pub type PickerTerminal = Terminal<CrosstermBackend<std::io::Stdout>>;

/**
 * EN: Drop queued key events so the previous picker's Enter/arrows do not
 *     instantly confirm the next one-shot list.
 * JA: 前段 picker の Enter / 矢印が次の一覧を即確定しないよう、滞留キーを捨てる。
 */
pub fn drain_pending_keys() {
    while event::poll(Duration::from_millis(0)).unwrap_or(false) {
        match event::read() {
            Ok(Event::Key(_)) => {}
            Ok(_) => {}
            Err(_) => break,
        }
    }
}

/**
 * EN: Enter raw mode + alternate screen and build a terminal.
 * JA: raw mode + alternate screen に入り Terminal を作る。
 */
pub fn enter() -> Result<PickerTerminal> {
    enable_raw_mode()?;
    drain_pending_keys();
    stdout().execute(EnterAlternateScreen)?;
    Ok(Terminal::new(CrosstermBackend::new(stdout()))?)
}

/**
 * EN: Always leave raw mode / alternate screen (best-effort after errors).
 * JA: raw mode / alternate screen を必ず解除（エラー後もベストエフォート）。
 */
pub fn leave() {
    let _ = disable_raw_mode();
    let _ = stdout().execute(LeaveAlternateScreen);
}
