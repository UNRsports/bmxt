//! EN: Interactive prompt — history (↑↓), grey remainder completion hints, Tab apply.
//! JA: 対話プロンプト。履歴・灰色の残り補完ヒント・Tab 適用。

use std::borrow::Cow;
use std::path::PathBuf;

use anyhow::{Context, Result};
use bmxt_core::{complete_line, is_pipe_continuation_token};
use rustyline::completion::{Completer, Pair};
use rustyline::error::ReadlineError;
use rustyline::highlight::{Highlighter, MatchingBracketHighlighter};
use rustyline::hint::{Hint, Hinter};
use rustyline::history::DefaultHistory;
use rustyline::validate::Validator;
use rustyline::{
    ColorMode, CompletionType, Config, Context as RlContext, Editor, Helper,
};

pub enum ReadOutcome {
    Line(String),
    Interrupt,
    Eof,
}

/**
 * EN: Inline hint — grey remainder after the typed prefix; same text is inserted on apply.
 * JA: インラインヒント。入力済み接頭辞の後ろに灰色の残りを表示し、適用時も同じ残りを挿入。
 */
struct BmxtHint {
    display: String,
    completion: String,
}

impl Hint for BmxtHint {
    fn display(&self) -> &str {
        &self.display
    }

    fn completion(&self) -> Option<&str> {
        Some(&self.completion)
    }
}

struct BmxtHelper {
    highlighter: MatchingBracketHighlighter,
}

impl BmxtHelper {
    fn new() -> Self {
        Self {
            highlighter: MatchingBracketHighlighter::new(),
        }
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
 * EN: When appending `| browse` at EOL with no trailing space, rustyline must insert a
 *     leading space so the line becomes `… -list | browse` (extension pick-line policy).
 */
fn completion_replacement(line: &str, token_start: usize, candidate: &str) -> String {
    if !is_pipe_continuation_token(candidate) {
        return candidate.to_string();
    }
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
 * EN: Build grey remainder hint from `complete_line` when the cursor is at EOL.
 *     Example: line `sync -se` → display/completion `tup` (shown grey after typed text).
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
        // EN: Pipe append with leading space — typed prefix is empty; show full replacement.
        if typed.is_empty() && is_pipe_continuation_token(candidate) {
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

impl Completer for BmxtHelper {
    type Candidate = Pair;

    fn complete(
        &self,
        line: &str,
        pos: usize,
        _ctx: &RlContext<'_>,
    ) -> rustyline::Result<(usize, Vec<Pair>)> {
        let Some(hit) = complete_line(line, pos) else {
            return Ok((pos, Vec::new()));
        };
        let mut candidates = hit.candidates;
        let has_pipe = candidates.iter().any(|c| is_pipe_continuation_token(c));
        // EN: Preserve options-before-pipe order when continuations are present.
        if !has_pipe {
            candidates.sort_by(|a, b| {
                a.len()
                    .cmp(&b.len())
                    .then_with(|| a.to_ascii_lowercase().cmp(&b.to_ascii_lowercase()))
            });
        }
        let pairs = candidates
            .into_iter()
            .map(|token| {
                let replacement = completion_replacement(line, hit.token_start, &token);
                Pair {
                    display: token,
                    replacement,
                }
            })
            .collect();
        Ok((hit.token_start, pairs))
    }
}

impl Hinter for BmxtHelper {
    type Hint = BmxtHint;

    fn hint(&self, line: &str, pos: usize, _ctx: &RlContext<'_>) -> Option<BmxtHint> {
        completion_remainder_hint(line, pos)
    }
}

impl Highlighter for BmxtHelper {
    fn highlight_hint<'h>(&self, hint: &'h str) -> Cow<'h, str> {
        // EN: Bright black (grey) so the remainder stays visually secondary.
        Cow::Owned(format!("\x1b[90m{hint}\x1b[39m"))
    }

    fn highlight<'l>(&self, line: &'l str, pos: usize) -> Cow<'l, str> {
        self.highlighter.highlight(line, pos)
    }

    fn highlight_char(&self, line: &str, pos: usize, forced: bool) -> bool {
        self.highlighter.highlight_char(line, pos, forced)
    }
}

impl Validator for BmxtHelper {}

impl Helper for BmxtHelper {}

pub struct PromptShell {
    editor: Editor<BmxtHelper, DefaultHistory>,
    history_path: PathBuf,
}

impl PromptShell {
    pub fn open() -> Result<Self> {
        let config = Config::builder()
            .history_ignore_space(true)
            // EN: Tab applies the next full candidate (same primary as the grey hint).
            .completion_type(CompletionType::Circular)
            .color_mode(ColorMode::Enabled)
            .auto_add_history(false)
            .build();
        let mut editor = Editor::with_config(config).context("rustyline Editor")?;
        editor.set_helper(Some(BmxtHelper::new()));

        let dir = crate::config::CliConfig::config_dir()?;
        std::fs::create_dir_all(&dir)?;
        let history_path = dir.join("history");
        if history_path.is_file() {
            let _ = editor.load_history(&history_path);
        }

        Ok(Self {
            editor,
            history_path,
        })
    }

    pub fn read_line(&mut self, prompt: &str) -> Result<ReadOutcome> {
        match self.editor.readline(prompt) {
            Ok(line) => Ok(ReadOutcome::Line(line)),
            Err(ReadlineError::Interrupted) => Ok(ReadOutcome::Interrupt),
            Err(ReadlineError::Eof) => Ok(ReadOutcome::Eof),
            Err(err) => Err(err.into()),
        }
    }

    pub fn remember(&mut self, line: &str) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return;
        }
        let _ = self.editor.add_history_entry(trimmed);
        let _ = self.editor.append_history(&self.history_path);
    }

    /**
     * EN: Printer for async bus/door logs while readline owns the TTY.
     *     After each print, rustyline redraws `BMXt>` so the caret stays visible.
     */
    pub fn install_repl_log_printer(&mut self) -> Result<()> {
        let printer = self
            .editor
            .create_external_printer()
            .context("rustyline external printer")?;
        crate::repl_log::install(printer);
        Ok(())
    }
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
    fn complete_line_offers_browse_after_peers() {
        let line = "tab -list --peers ";
        let hit = complete_line(line, line.len()).expect("hit");
        assert!(hit.candidates.iter().any(|c| c == "| browse"));
    }
}
