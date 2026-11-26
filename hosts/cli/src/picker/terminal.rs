//! EN: Shared crossterm / ratatui alternate-screen enter/leave for CLI pickers.
//! JA: CLI picker 共通の alternate-screen 出入り。

use anyhow::Result;
use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use crossterm::ExecutableCommand;
use ratatui::backend::CrosstermBackend;
use ratatui::Terminal;
use std::io::stdout;

pub type PickerTerminal = Terminal<CrosstermBackend<std::io::Stdout>>;

/**
 * EN: Enter raw mode + alternate screen and build a terminal.
 * JA: raw mode + alternate screen に入り Terminal を作る。
 */
pub fn enter() -> Result<PickerTerminal> {
    enable_raw_mode()?;
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
