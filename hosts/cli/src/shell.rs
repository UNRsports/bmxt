//! EN: Interactive prompt — one base command line + Tab candidate overlay (extension-like).
//!     The typed line always stays on a single `BMXt>` row; candidates never become a second prompt.
//! JA: 対話プロンプト。ベースコマンド行は常に1行の `BMXt>`。候補は独立オーバーレイ（第二プロンプトにしない）。

use std::io::{stdout, Write};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use anyhow::{Context, Result};
use bmxt_core::{all_completion_tokens, complete_line, is_pipe_continuation_token};
use crossterm::cursor::{self, MoveTo};
use crossterm::event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use crossterm::style::{Attribute, Color, Print, ResetColor, SetAttribute, SetForegroundColor};
use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, Clear, ClearType, ScrollUp,
};
use crossterm::{execute, queue};
use unicode_width::UnicodeWidthStr;

/** EN: Same modes as extension `CandidateMatchMode` (ime-token-match.ts). */
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CandidateMatchMode {
    Prefix,
    Contains,
}

pub enum ReadOutcome {
    Line(String),
    Interrupt,
    Eof,
}

/**
 * EN: Inline hint — grey remainder after the typed prefix; same text is inserted on apply.
 * JA: インラインヒント。入力済み接頭辞の後ろに灰色の残りを表示し、適用時も同じ残りを挿入。
 */
#[derive(Debug, Clone, PartialEq, Eq)]
struct BmxtHint {
    display: String,
    completion: String,
}

/** EN: Open candidate menu state (Tab-triggered; mirrors extension IME list). */
struct CandidateMenu {
    token_start: usize,
    token_end: usize,
    candidates: Vec<String>,
    highlight: usize,
}

/** EN: Mutable line-edit + menu state for one `read_line` call. */
struct LineEditState {
    line: String,
    cursor_byte: usize,
    menu: Option<CandidateMenu>,
    suppressed_until_tab: bool,
    hist_index: Option<usize>,
    hist_stash: Option<String>,
}

impl LineEditState {
    fn new() -> Self {
        Self {
            line: String::new(),
            cursor_byte: 0,
            menu: None,
            suppressed_until_tab: false,
            hist_index: None,
            hist_stash: None,
        }
    }

    fn clear_hist_browse(&mut self) {
        self.hist_index = None;
        self.hist_stash = None;
    }
}

/** EN: Prefer shortest non-pipe; if only pipe, prefer `| browse` then shortest. */
fn pick_primary_candidate(candidates: &[String]) -> Option<&str> {
    let non_pipe: Vec<&String> = candidates
        .iter()
        .filter(|c| !is_pipe_continuation_token(c))
        .collect();
    let pool: Vec<&String> = if !non_pipe.is_empty() {
        non_pipe
    } else if let Some(browse) = candidates
        .iter()
        .find(|c| c.eq_ignore_ascii_case("| browse"))
    {
        return Some(browse.as_str());
    } else {
        candidates.iter().collect()
    };
    pool.into_iter()
        .min_by(|a, b| {
            a.len()
                .cmp(&b.len())
                .then_with(|| a.to_ascii_lowercase().cmp(&b.to_ascii_lowercase()))
        })
        .map(String::as_str)
}

/**
 * EN: EOL / empty-span append — insert a leading space when the char before
 *     `token_start` is non-whitespace (extension append-at-end policy).
 *     Examples: `nav` + `-exit` → ` -exit`; `tab -list` + `| browse` → ` | browse`.
 * JA: 行末への追記で、直前が非空白なら候補先頭に空白を入れる（拡張の append と同方針）。
 */
fn completion_replacement(line: &str, token_start: usize, candidate: &str) -> String {
    let needs_space = token_start > 0
        && !line[..token_start]
            .chars()
            .next_back()
            .is_some_and(|c| c.is_ascii_whitespace());
    if needs_space {
        format!(" {candidate}")
    } else {
        candidate.to_string()
    }
}

/**
 * EN: Apply one candidate into the line (Enter on menu). Trailing space at EOL
 *     matches extension commit; mid-line replace keeps no trailing space.
 * JA: メニュー Enter で候補を行へ確定。行末では拡張と同様に末尾空白を付ける。
 */
fn apply_candidate(
    line: &str,
    token_start: usize,
    token_end: usize,
    candidate: &str,
) -> (String, usize) {
    let token_start = token_start.min(line.len());
    let token_end = token_end.min(line.len()).max(token_start);
    let replacement = completion_replacement(line, token_start, candidate);
    let at_eol = token_end >= line.len();
    let body = if at_eol {
        format!("{replacement} ")
    } else {
        replacement
    };
    let mut next = String::with_capacity(line.len() + body.len());
    next.push_str(&line[..token_start]);
    next.push_str(&body);
    next.push_str(&line[token_end..]);
    let next_pos = token_start + body.len();
    (next, next_pos)
}

/**
 * EN: Build grey remainder hint from `complete_line` when the cursor is at EOL.
 *     Example: line `sync -se` → display/completion `tup` (shown grey after typed text).
 *     Example: line `nav` → display/completion ` -exit` (leading space for grammar).
 * JA: カーソルが行末のとき `complete_line` から灰色の残りヒントを作る。
 */
fn completion_remainder_hint(line: &str, pos: usize) -> Option<BmxtHint> {
    if line.is_empty() || pos < line.len() {
        return None;
    }
    let hit = complete_line(line, pos)?;
    let candidate = pick_primary_candidate(&hit.candidates)?;
    let replacement = completion_replacement(line, hit.token_start, candidate);
    let typed = &line[hit.token_start..pos];
    let typed_lower = typed.to_ascii_lowercase();
    let repl_lower = replacement.to_ascii_lowercase();
    if !repl_lower.starts_with(&typed_lower) {
        // EN: Empty typed span with leading-space replacement — show full replacement.
        if typed.is_empty() && !replacement.is_empty() {
            return Some(BmxtHint {
                display: replacement.clone(),
                completion: replacement,
            });
        }
        return None;
    }
    let typed_chars = typed.chars().count();
    let remainder: String = replacement.chars().skip(typed_chars).collect();
    if remainder.is_empty() {
        return None;
    }
    Some(BmxtHint {
        display: remainder.clone(),
        completion: remainder,
    })
}

/** EN: Sort candidates like the previous Completer (pipes keep order). */
fn sort_candidates(mut candidates: Vec<String>) -> Vec<String> {
    let has_pipe = candidates.iter().any(|c| is_pipe_continuation_token(c));
    if !has_pipe {
        candidates.sort_by(|a, b| {
            a.len()
                .cmp(&b.len())
                .then_with(|| a.to_ascii_lowercase().cmp(&b.to_ascii_lowercase()))
        });
    }
    candidates
}

/** EN: Strip leading `-` runs — same as extension `optionTokenBody`. */
fn option_token_body(token: &str) -> &str {
    token.trim_start_matches('-')
}

/**
 * EN: Filter candidates (prefix on open / contains while open). Mirrors
 *     `matchCandidates` in `ime-token-match.ts` so `en` matches `-enter`.
 * JA: 拡張と同じ prefix / contains。`en` が `-enter` に当たる。
 */
fn match_candidates(
    candidates: &[String],
    prefix: &str,
    mode: CandidateMatchMode,
) -> Vec<String> {
    if prefix.is_empty() {
        return candidates.to_vec();
    }
    let p = prefix.to_ascii_lowercase();
    let p_body = option_token_body(&p);
    match mode {
        CandidateMatchMode::Contains => candidates
            .iter()
            .filter(|c| {
                let cl = c.to_ascii_lowercase();
                let body = option_token_body(&cl);
                if p.starts_with('-') {
                    return cl.starts_with(&p)
                        || cl.contains(&p)
                        || (!p_body.is_empty() && body.starts_with(p_body));
                }
                if body.starts_with(p_body) {
                    return true;
                }
                // EN: Substring only for 2+ chars (avoid `p` matching `--snapshot`).
                p_body.len() >= 2 && (body.contains(p_body) || cl.contains(&p))
            })
            .cloned()
            .collect(),
        CandidateMatchMode::Prefix => candidates
            .iter()
            .filter(|c| {
                let cl = c.to_ascii_lowercase();
                if cl.starts_with(&p) {
                    return true;
                }
                !p_body.is_empty() && option_token_body(&cl).starts_with(p_body)
            })
            .cloned()
            .collect(),
    }
}

/** EN: Whitespace-delimited token bounds under `pos` (same policy as bmxt-core). */
fn word_bounds(line: &str, pos: usize) -> (usize, usize) {
    let bytes = line.as_bytes();
    let mut pos = pos.min(line.len());
    while pos > 0 && !line.is_char_boundary(pos) {
        pos -= 1;
    }
    let mut l = pos;
    while l > 0 && !bytes[l - 1].is_ascii_whitespace() {
        l -= 1;
    }
    let mut r = pos;
    while r < bytes.len() && !bytes[r].is_ascii_whitespace() {
        r += 1;
    }
    (l, r)
}

/**
 * EN: Full tier candidate list for the token under `cursor`.
 *     Mirrors extension Tab + `emptyFirstPrefixShowsAll`: empty / first-token
 *     slot uses `all_completion_tokens` when core returns None for empty prefix.
 * JA: 拡張の Tab（空 prefix で第一コマンド全件）に合わせた全候補取得。
 */
fn complete_full_slot(
    line: &str,
    cursor: usize,
) -> Option<(usize, usize, String, Vec<String>)> {
    if let Some(hit) = complete_line(line, cursor) {
        let token_start = hit.token_start.min(line.len());
        let token_end = hit.token_end.min(line.len()).max(token_start);
        let typed_end = if cursor >= token_start {
            cursor.min(line.len())
        } else {
            token_start
        };
        let typed = line.get(token_start..typed_end)?.to_string();
        let mut emptied = String::with_capacity(line.len());
        emptied.push_str(line.get(..token_start)?);
        emptied.push_str(line.get(token_end..)?);
        let full = if let Some(full_hit) = complete_line(&emptied, token_start) {
            sort_candidates(full_hit.candidates)
        } else if hit.tier == "first" {
            sort_candidates(all_completion_tokens())
        } else {
            sort_candidates(hit.candidates)
        };
        if full.is_empty() {
            return None;
        }
        return Some((token_start, token_end, typed, full));
    }

    // EN: core None — first-tier empty prefix (Tab on blank) or body needle (`nav en`).
    let (token_start, token_end) = word_bounds(line, cursor);
    let left = line.get(..token_start)?;
    let tokens_before: Vec<&str> = if left.trim().is_empty() {
        Vec::new()
    } else {
        left.trim().split_whitespace().collect()
    };
    let typed_end = if cursor >= token_start {
        cursor.min(line.len())
    } else {
        token_start
    };
    let typed = line.get(token_start..typed_end)?.to_string();

    if tokens_before.is_empty() {
        let full = sort_candidates(all_completion_tokens());
        if full.is_empty() {
            return None;
        }
        return Some((token_start, token_end, typed, full));
    }

    let mut emptied = String::with_capacity(line.len());
    emptied.push_str(line.get(..token_start)?);
    emptied.push_str(line.get(token_end..)?);
    let full_hit = complete_line(&emptied, token_start)?;
    let full = sort_candidates(full_hit.candidates);
    if full.is_empty() {
        return None;
    }
    Some((token_start, token_end, typed, full))
}

fn display_width(s: &str) -> usize {
    UnicodeWidthStr::width(s)
}

fn prev_char_boundary(s: &str, pos: usize) -> usize {
    if pos == 0 {
        return 0;
    }
    let mut p = pos - 1;
    while p > 0 && !s.is_char_boundary(p) {
        p -= 1;
    }
    p
}

fn next_char_boundary(s: &str, pos: usize) -> usize {
    if pos >= s.len() {
        return s.len();
    }
    let mut p = pos + 1;
    while p < s.len() && !s.is_char_boundary(p) {
        p += 1;
    }
    p
}

const MENU_MAX_ROWS: usize = 8;

pub struct PromptShell {
    history: Vec<String>,
    history_path: PathBuf,
    pending_logs: Arc<Mutex<Vec<String>>>,
}

impl PromptShell {
    pub fn open() -> Result<Self> {
        let dir = crate::config::CliConfig::config_dir()?;
        std::fs::create_dir_all(&dir)?;
        let history_path = dir.join("history");
        let mut history = Vec::new();
        if history_path.is_file() {
            let text = std::fs::read_to_string(&history_path).unwrap_or_default();
            for line in text.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    history.push(trimmed.to_string());
                }
            }
        }
        Ok(Self {
            history,
            history_path,
            pending_logs: Arc::new(Mutex::new(Vec::new())),
        })
    }

    /**
     * EN: Queue async bus/door logs; drained while the prompt owns the TTY so
     *     `BMXt>` and the candidate menu redraw after each line.
     */
    pub fn install_repl_log_printer(&mut self) -> Result<()> {
        let pending = Arc::clone(&self.pending_logs);
        crate::repl_log::install(move |msg: String| {
            let mut guard = pending.lock().unwrap_or_else(|e| e.into_inner());
            guard.push(msg);
        });
        Ok(())
    }

    pub fn remember(&mut self, line: &str) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return;
        }
        if self.history.last().map(String::as_str) == Some(trimmed) {
            return;
        }
        self.history.push(trimmed.to_string());
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.history_path)
            .and_then(|mut f| writeln!(f, "{trimmed}"));
    }

    pub fn read_line(&mut self, prompt: &str) -> Result<ReadOutcome> {
        enable_raw_mode().context("enable raw mode")?;
        let result = self.read_line_raw(prompt);
        let _ = disable_raw_mode();
        // EN: Ensure the next println starts on a fresh row after raw-mode editing.
        let _ = execute!(stdout(), Print("\r\n"));
        result
    }

    fn read_line_raw(&mut self, prompt: &str) -> Result<ReadOutcome> {
        let mut out = stdout();
        let (_col, mut prompt_row) = cursor::position().context("cursor position")?;
        let mut state = LineEditState::new();

        self.draw(&mut out, prompt, &state, &mut prompt_row)?;

        loop {
            self.drain_logs(&mut out, prompt, &state, &mut prompt_row)?;

            if !event::poll(Duration::from_millis(100)).context("event poll")? {
                continue;
            }
            let Event::Key(key) = event::read().context("event read")? else {
                continue;
            };
            if key.kind != KeyEventKind::Press {
                continue;
            }

            match self.handle_key(key, &mut state)? {
                KeyAction::Continue => {
                    self.draw(&mut out, prompt, &state, &mut prompt_row)?;
                }
                KeyAction::Submit => {
                    // EN: Keep the base command line in scrollback; only clear the menu overlay.
                    self.clear_menu_overlay(&mut out, prompt_row)?;
                    return Ok(ReadOutcome::Line(state.line));
                }
                KeyAction::Interrupt => {
                    self.clear_menu_overlay(&mut out, prompt_row)?;
                    return Ok(ReadOutcome::Interrupt);
                }
                KeyAction::Eof => {
                    self.clear_menu_overlay(&mut out, prompt_row)?;
                    return Ok(ReadOutcome::Eof);
                }
            }
        }
    }

    fn drain_logs(
        &self,
        out: &mut impl Write,
        prompt: &str,
        state: &LineEditState,
        prompt_row: &mut u16,
    ) -> Result<()> {
        let messages: Vec<String> = {
            let mut guard = self
                .pending_logs
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            if guard.is_empty() {
                return Ok(());
            }
            guard.drain(..).collect()
        };
        self.erase_from_prompt(out, *prompt_row)?;
        for msg in messages {
            let text = msg.trim_end_matches('\n');
            queue!(out, Print(text), Print("\r\n"))?;
        }
        out.flush()?;
        let (_c, row) = cursor::position().context("cursor after logs")?;
        *prompt_row = row;
        self.draw(out, prompt, state, prompt_row)?;
        Ok(())
    }

    fn erase_from_prompt(&self, out: &mut impl Write, prompt_row: u16) -> Result<()> {
        queue!(
            out,
            MoveTo(0, prompt_row),
            Clear(ClearType::FromCursorDown)
        )?;
        out.flush()?;
        Ok(())
    }

    /**
     * EN: Clear only rows below the base prompt (candidate overlay), leave the line.
     * JA: 候補オーバーレイだけ消し、ベースのコマンド行は残す。
     */
    fn clear_menu_overlay(&self, out: &mut impl Write, prompt_row: u16) -> Result<()> {
        let (_cols, rows) = crossterm::terminal::size().unwrap_or((80, 24));
        if prompt_row.saturating_add(1) < rows {
            queue!(
                out,
                MoveTo(0, prompt_row.saturating_add(1)),
                Clear(ClearType::FromCursorDown)
            )?;
            out.flush()?;
        }
        Ok(())
    }

    /**
     * EN: If the prompt sits too low for `menu_rows`, scroll the screen up and
     *     move `prompt_row` with it so the base line never duplicates.
     * JA: メニュー行数が足りなければ ScrollUp し、prompt_row を追従させて二重 BMXt> を防ぐ。
     */
    fn ensure_room_for_menu(
        &self,
        out: &mut impl Write,
        prompt_row: &mut u16,
        menu_rows: usize,
    ) -> Result<()> {
        if menu_rows == 0 {
            return Ok(());
        }
        let (_cols, term_rows) = crossterm::terminal::size().context("terminal size")?;
        let term_rows = term_rows as usize;
        if term_rows < 2 {
            return Ok(());
        }
        let max_prompt_row = term_rows.saturating_sub(1).saturating_sub(menu_rows);
        let current = *prompt_row as usize;
        if current <= max_prompt_row {
            return Ok(());
        }
        let scroll = current - max_prompt_row;
        let scroll_u16 = u16::try_from(scroll).unwrap_or(u16::MAX);
        queue!(out, ScrollUp(scroll_u16))?;
        *prompt_row = u16::try_from(max_prompt_row).unwrap_or(0);
        out.flush()?;
        Ok(())
    }

    /**
     * EN: Base command line stays on `prompt_row`. Candidate menu is an independent
     *     overlay on the rows below (absolute MoveTo — never `\r\n`, which would scroll
     *     and leave a second ghost `BMXt>`).
     * JA: ベース行は常に prompt_row。候補は直下の独立オーバーレイ（絶対座標。`\\r\\n` 禁止）。
     */
    fn draw(
        &self,
        out: &mut impl Write,
        prompt: &str,
        state: &LineEditState,
        prompt_row: &mut u16,
    ) -> Result<()> {
        let menu_paint = state.menu.as_ref().map(|m| {
            let total = m.candidates.len();
            let hi = m.highlight.min(total.saturating_sub(1));
            let max_rows = MENU_MAX_ROWS.min(total).max(1);
            let start = if total <= max_rows {
                0
            } else if hi < max_rows / 2 {
                0
            } else if hi + (max_rows - max_rows / 2) >= total {
                total - max_rows
            } else {
                hi - max_rows / 2
            };
            let end = (start + max_rows).min(total);
            (start, end, hi)
        });
        let menu_rows = menu_paint.map(|(s, e, _)| e - s).unwrap_or(0);
        self.ensure_room_for_menu(out, prompt_row, menu_rows)?;

        queue!(
            out,
            MoveTo(0, *prompt_row),
            Clear(ClearType::FromCursorDown)
        )?;
        queue!(out, Print(prompt))?;
        self.draw_line_with_token_span(out, state)?;

        if state.menu.is_none() {
            if let Some(hint) = completion_remainder_hint(&state.line, state.cursor_byte) {
                queue!(
                    out,
                    SetForegroundColor(Color::DarkGrey),
                    Print(&hint.display),
                    ResetColor
                )?;
            }
        }

        if let (Some(m), Some((start, end, hi))) = (state.menu.as_ref(), menu_paint) {
            for (vis_i, idx) in (start..end).enumerate() {
                let row = prompt_row.saturating_add(1).saturating_add(vis_i as u16);
                let cand = &m.candidates[idx];
                queue!(out, MoveTo(0, row))?;
                if idx == hi {
                    queue!(
                        out,
                        SetForegroundColor(Color::Green),
                        Print("▶ "),
                        Print(cand),
                        ResetColor
                    )?;
                } else {
                    queue!(out, Print("  "), Print(cand))?;
                }
            }
        }

        let end = state.cursor_byte.min(state.line.len());
        let cursor_cols = display_width(prompt) + display_width(&state.line[..end]);
        let cursor_col = u16::try_from(cursor_cols).unwrap_or(u16::MAX);
        queue!(out, MoveTo(cursor_col, *prompt_row))?;
        out.flush()?;
        Ok(())
    }

    /**
     * EN: When the menu is open, reverse-video the replace span (`token_start..token_end`).
     * JA: メニュー開中は置換対象トークンを反転表示する。
     */
    fn draw_line_with_token_span(
        &self,
        out: &mut impl Write,
        state: &LineEditState,
    ) -> Result<()> {
        let Some(m) = state.menu.as_ref() else {
            queue!(out, Print(&state.line))?;
            return Ok(());
        };
        let start = m.token_start.min(state.line.len());
        let end = m.token_end.min(state.line.len()).max(start);
        if start >= end {
            queue!(out, Print(&state.line))?;
            return Ok(());
        }
        queue!(out, Print(&state.line[..start]))?;
        queue!(
            out,
            SetAttribute(Attribute::Reverse),
            Print(&state.line[start..end]),
            SetAttribute(Attribute::NoReverse)
        )?;
        queue!(out, Print(&state.line[end..]))?;
        Ok(())
    }

    fn handle_key(&self, key: KeyEvent, state: &mut LineEditState) -> Result<KeyAction> {
        if state.menu.is_some() {
            return self.handle_key_menu_open(key, state);
        }
        let ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
        match key.code {
            KeyCode::Enter => Ok(KeyAction::Submit),
            KeyCode::Char('c') if ctrl => Ok(KeyAction::Interrupt),
            KeyCode::Char('d') if ctrl => {
                if state.line.is_empty() {
                    Ok(KeyAction::Eof)
                } else {
                    Ok(KeyAction::Continue)
                }
            }
            KeyCode::Char('a') if ctrl => {
                state.cursor_byte = 0;
                Ok(KeyAction::Continue)
            }
            KeyCode::Char('e') if ctrl => {
                state.cursor_byte = state.line.len();
                Ok(KeyAction::Continue)
            }
            KeyCode::Char('u') if ctrl => {
                state.line.clear();
                state.cursor_byte = 0;
                state.clear_hist_browse();
                Ok(KeyAction::Continue)
            }
            KeyCode::Tab => {
                state.suppressed_until_tab = false;
                self.open_or_refresh_menu(state);
                Ok(KeyAction::Continue)
            }
            KeyCode::Esc => {
                // EN: Closed menu — ignore (extension only suppresses while open).
                Ok(KeyAction::Continue)
            }
            KeyCode::Backspace => {
                if state.cursor_byte > 0 {
                    let prev = prev_char_boundary(&state.line, state.cursor_byte);
                    state.line.drain(prev..state.cursor_byte);
                    state.cursor_byte = prev;
                    state.clear_hist_browse();
                }
                Ok(KeyAction::Continue)
            }
            KeyCode::Delete => {
                if state.cursor_byte < state.line.len() {
                    let next = next_char_boundary(&state.line, state.cursor_byte);
                    state.line.drain(state.cursor_byte..next);
                    state.clear_hist_browse();
                }
                Ok(KeyAction::Continue)
            }
            KeyCode::Left => {
                state.cursor_byte = prev_char_boundary(&state.line, state.cursor_byte);
                Ok(KeyAction::Continue)
            }
            KeyCode::Right => {
                // EN: Extension — Right only moves the caret; never commits hint/menu.
                //     Grey remainder stays visual; confirm via Tab menu + Enter.
                state.cursor_byte = next_char_boundary(&state.line, state.cursor_byte);
                Ok(KeyAction::Continue)
            }
            KeyCode::Home => {
                state.cursor_byte = 0;
                Ok(KeyAction::Continue)
            }
            KeyCode::End => {
                state.cursor_byte = state.line.len();
                Ok(KeyAction::Continue)
            }
            KeyCode::Up => {
                self.history_up(state);
                Ok(KeyAction::Continue)
            }
            KeyCode::Down => {
                self.history_down(state);
                Ok(KeyAction::Continue)
            }
            KeyCode::Char(ch) if !ctrl && !key.modifiers.contains(KeyModifiers::ALT) => {
                state.line.insert(state.cursor_byte, ch);
                state.cursor_byte += ch.len_utf8();
                state.clear_hist_browse();
                Ok(KeyAction::Continue)
            }
            _ => Ok(KeyAction::Continue),
        }
    }

    fn handle_key_menu_open(
        &self,
        key: KeyEvent,
        state: &mut LineEditState,
    ) -> Result<KeyAction> {
        let ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
        match key.code {
            KeyCode::Esc => {
                state.menu = None;
                state.suppressed_until_tab = true;
                Ok(KeyAction::Continue)
            }
            KeyCode::Enter => {
                if let Some(m) = state.menu.as_ref() {
                    if let Some(cand) = m.candidates.get(m.highlight) {
                        let (next, next_pos) =
                            apply_candidate(&state.line, m.token_start, m.token_end, cand);
                        state.line = next;
                        state.cursor_byte = next_pos;
                    }
                }
                state.menu = None;
                state.clear_hist_browse();
                // EN: Extension re-syncs after pick so the next tier can appear (e.g. `nav ` → `-enter`).
                self.open_or_refresh_menu(state);
                Ok(KeyAction::Continue)
            }
            KeyCode::Up => {
                if let Some(m) = state.menu.as_mut() {
                    if m.highlight == 0 {
                        state.menu = None;
                    } else {
                        m.highlight -= 1;
                    }
                }
                Ok(KeyAction::Continue)
            }
            KeyCode::Down | KeyCode::Tab => {
                if let Some(m) = state.menu.as_mut() {
                    if !m.candidates.is_empty() {
                        m.highlight = (m.highlight + 1) % m.candidates.len();
                    }
                }
                Ok(KeyAction::Continue)
            }
            KeyCode::Char('c') if ctrl => {
                state.menu = None;
                Ok(KeyAction::Interrupt)
            }
            KeyCode::Backspace => {
                if state.cursor_byte > 0 {
                    let prev = prev_char_boundary(&state.line, state.cursor_byte);
                    state.line.drain(prev..state.cursor_byte);
                    state.cursor_byte = prev;
                    state.clear_hist_browse();
                }
                self.open_or_refresh_menu(state);
                Ok(KeyAction::Continue)
            }
            KeyCode::Delete => {
                if state.cursor_byte < state.line.len() {
                    let next = next_char_boundary(&state.line, state.cursor_byte);
                    state.line.drain(state.cursor_byte..next);
                    state.clear_hist_browse();
                }
                self.open_or_refresh_menu(state);
                Ok(KeyAction::Continue)
            }
            KeyCode::Left => {
                state.cursor_byte = prev_char_boundary(&state.line, state.cursor_byte);
                self.open_or_refresh_menu(state);
                Ok(KeyAction::Continue)
            }
            KeyCode::Right => {
                state.cursor_byte = next_char_boundary(&state.line, state.cursor_byte);
                self.open_or_refresh_menu(state);
                Ok(KeyAction::Continue)
            }
            KeyCode::Char(ch) if !ctrl && !key.modifiers.contains(KeyModifiers::ALT) => {
                state.line.insert(state.cursor_byte, ch);
                state.cursor_byte += ch.len_utf8();
                state.clear_hist_browse();
                self.open_or_refresh_menu(state);
                Ok(KeyAction::Continue)
            }
            _ => Ok(KeyAction::Continue),
        }
    }

    fn open_or_refresh_menu(&self, state: &mut LineEditState) {
        let was_open = state.menu.is_some();
        let Some((token_start, token_end, typed, full)) =
            complete_full_slot(&state.line, state.cursor_byte)
        else {
            state.menu = None;
            return;
        };
        // EN: Prefix on first Tab open; contains while the menu stays open (extension).
        //     If prefix yields nothing for a non-empty needle, fall back to contains
        //     so `nav en` still finds `-enter` even when body-prefix is insufficient.
        let mut candidates = if was_open {
            match_candidates(&full, &typed, CandidateMatchMode::Contains)
        } else {
            let prefixed = match_candidates(&full, &typed, CandidateMatchMode::Prefix);
            if prefixed.is_empty() && !typed.is_empty() {
                match_candidates(&full, &typed, CandidateMatchMode::Contains)
            } else {
                prefixed
            }
        };
        candidates = sort_candidates(candidates);
        if candidates.is_empty() {
            state.menu = None;
            return;
        }
        let prev_hi_token = state
            .menu
            .as_ref()
            .and_then(|m| m.candidates.get(m.highlight).cloned());
        let highlight = prev_hi_token
            .and_then(|tok| candidates.iter().position(|c| c == &tok))
            .unwrap_or(0);
        state.menu = Some(CandidateMenu {
            token_start,
            token_end,
            candidates,
            highlight,
        });
    }

    fn history_up(&self, state: &mut LineEditState) {
        if self.history.is_empty() {
            return;
        }
        match state.hist_index {
            None => {
                state.hist_stash = Some(state.line.clone());
                let idx = self.history.len() - 1;
                state.hist_index = Some(idx);
                state.line = self.history[idx].clone();
                state.cursor_byte = state.line.len();
            }
            Some(0) => {}
            Some(i) => {
                let idx = i - 1;
                state.hist_index = Some(idx);
                state.line = self.history[idx].clone();
                state.cursor_byte = state.line.len();
            }
        }
    }

    fn history_down(&self, state: &mut LineEditState) {
        let Some(i) = state.hist_index else {
            return;
        };
        if i + 1 >= self.history.len() {
            state.hist_index = None;
            state.line = state.hist_stash.take().unwrap_or_default();
            state.cursor_byte = state.line.len();
            return;
        }
        let idx = i + 1;
        state.hist_index = Some(idx);
        state.line = self.history[idx].clone();
        state.cursor_byte = state.line.len();
    }
}

enum KeyAction {
    Continue,
    Submit,
    Interrupt,
    Eof,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hint_shows_remainder_for_sync_setup() {
        let line = "sync -se";
        let hint = completion_remainder_hint(line, line.len()).expect("hint");
        assert_eq!(hint.display, "tup");
        assert_eq!(hint.completion, "tup");
    }

    #[test]
    fn hint_none_when_cursor_not_at_eol() {
        let line = "sync -se";
        assert!(completion_remainder_hint(line, 4).is_none());
    }

    #[test]
    fn hint_none_when_token_already_complete() {
        let line = "sync -setup";
        assert!(completion_remainder_hint(line, line.len()).is_none());
    }

    #[test]
    fn pipe_continuation_replacement_inserts_leading_space() {
        let line = "tab -list";
        let repl = completion_replacement(line, line.len(), "| browse");
        assert_eq!(repl, " | browse");
    }

    #[test]
    fn pipe_continuation_replacement_keeps_existing_space() {
        let line = "tab -list ";
        let repl = completion_replacement(line, line.len(), "| browse");
        assert_eq!(repl, "| browse");
    }

    #[test]
    fn second_tier_replacement_inserts_leading_space_after_nav() {
        let line = "nav";
        let repl = completion_replacement(line, line.len(), "-exit");
        assert_eq!(repl, " -exit");
    }

    #[test]
    fn second_tier_replacement_keeps_existing_space_after_nav() {
        let line = "nav ";
        let repl = completion_replacement(line, line.len(), "-exit");
        assert_eq!(repl, "-exit");
    }

    #[test]
    fn hint_shows_leading_space_after_complete_first() {
        let line = "nav";
        let hint = completion_remainder_hint(line, line.len()).expect("hint");
        assert!(
            hint.display.starts_with(' '),
            "expected leading space in hint, got {:?}",
            hint.display
        );
        assert!(hint.display.contains('-'));
    }

    #[test]
    fn complete_line_offers_browse_after_peers() {
        let line = "tab -list --peers ";
        let hit = complete_line(line, line.len()).expect("hit");
        assert!(hit.candidates.iter().any(|c| c == "| browse"));
    }

    #[test]
    fn apply_candidate_appends_trailing_space_at_eol() {
        let line = "nav";
        let (next, pos) = apply_candidate(line, 3, 3, "-exit");
        assert_eq!(next, "nav -exit ");
        assert_eq!(pos, next.len());
    }

    #[test]
    fn apply_candidate_replaces_partial_token() {
        let line = "sync -se";
        let hit = complete_line(line, line.len()).expect("hit");
        let candidate = pick_primary_candidate(&hit.candidates).expect("candidate");
        let (next, pos) = apply_candidate(line, hit.token_start, hit.token_end, candidate);
        assert_eq!(next, "sync -setup ");
        assert_eq!(pos, next.len());
    }

    #[test]
    fn apply_candidate_pipe_after_list() {
        let line = "tab -list";
        let (next, _) = apply_candidate(line, line.len(), line.len(), "| browse");
        assert_eq!(next, "tab -list | browse ");
    }

    #[test]
    fn prefix_body_matches_enter_for_nav_en() {
        let line = "nav en";
        let (start, end, typed, full) = complete_full_slot(line, line.len()).expect("slot");
        assert_eq!(typed, "en");
        assert_eq!(&line[start..end], "en");
        let prefixed = match_candidates(&full, &typed, CandidateMatchMode::Prefix);
        assert!(
            prefixed.iter().any(|c| c == "-enter"),
            "expected -enter in {prefixed:?}"
        );
    }

    #[test]
    fn empty_line_tab_slot_offers_first_commands() {
        let line = "";
        let (start, end, typed, full) = complete_full_slot(line, 0).expect("first-tier slot");
        assert_eq!(start, 0);
        assert_eq!(end, 0);
        assert_eq!(typed, "");
        assert!(full.iter().any(|c| c == "nav"), "expected nav in {full:?}");
        assert!(full.iter().any(|c| c == "tab"), "expected tab in {full:?}");
        assert!(
            full.len() >= 2,
            "empty Tab must list multiple first commands, got {}",
            full.len()
        );
    }

    #[test]
    fn partial_first_tab_filters_nav() {
        let line = "na";
        let (_s, _e, typed, full) = complete_full_slot(line, line.len()).expect("slot");
        assert_eq!(typed, "na");
        let prefixed = match_candidates(&full, &typed, CandidateMatchMode::Prefix);
        assert!(prefixed.iter().any(|c| c == "nav"), "{prefixed:?}");
    }

    #[test]
    fn contains_matches_mid_token_while_open() {
        let all = vec![
            "-enter".to_string(),
            "-exit".to_string(),
            "-wizard".to_string(),
        ];
        let hit = match_candidates(&all, "iz", CandidateMatchMode::Contains);
        assert_eq!(hit, vec!["-wizard".to_string()]);
    }

    #[test]
    fn short_contains_does_not_substring_match_snapshot() {
        let all = vec!["--snapshot".to_string()];
        let hit = match_candidates(&all, "p", CandidateMatchMode::Contains);
        assert!(
            hit.is_empty(),
            "single-letter contains must not substring-hit --snapshot, got {hit:?}"
        );
    }
}
