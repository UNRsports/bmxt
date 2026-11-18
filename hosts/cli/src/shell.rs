//! EN: Interactive prompt — history (↑↓), line editing, Tab completion from bmxt-core.
//! JA: 対話プロンプト。履歴・行編集・bmxt-core Tab 補完。

use std::borrow::Cow;
use std::path::PathBuf;

use anyhow::{Context, Result};
use bmxt_core::complete_line;
use rustyline::completion::{Completer, Pair};
use rustyline::error::ReadlineError;
use rustyline::highlight::{Highlighter, MatchingBracketHighlighter};
use rustyline::hint::{Hinter, HistoryHinter};
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

struct BmxtHelper {
    hinter: HistoryHinter,
    highlighter: MatchingBracketHighlighter,
}

impl BmxtHelper {
    fn new() -> Self {
        Self {
            hinter: HistoryHinter {},
            highlighter: MatchingBracketHighlighter::new(),
        }
    }
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
        let pairs = hit
            .candidates
            .into_iter()
            .map(|token| Pair {
                display: token.clone(),
                replacement: token,
            })
            .collect();
        Ok((hit.token_start, pairs))
    }
}

impl Hinter for BmxtHelper {
    type Hint = String;

    fn hint(&self, line: &str, pos: usize, ctx: &RlContext<'_>) -> Option<String> {
        self.hinter.hint(line, pos, ctx)
    }
}

impl Highlighter for BmxtHelper {
    fn highlight_hint<'h>(&self, hint: &'h str) -> Cow<'h, str> {
        self.highlighter.highlight_hint(hint)
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
            .completion_type(CompletionType::List)
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
}
