//! EN: Aggregated command I/O sink (Interactive REPL vs NonInteractive exec).
//! JA: コマンド I/O 集約シンク（対話 REPL / 非対話 exec）。

use bmxt_core::command_output::CommandOutput;
use bmxt_core::ir::EXIT_SUCCESS;

/**
 * EN: Host interaction mode — mirrors browser UI vs `bmxt exec` oneshot.
 * JA: ホスト対話モード。拡張 UI 相当 vs `bmxt exec` ワンショット。
 */
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InteractionMode {
    /// EN: REPL — TUI / handshake ask allowed; flush to process FDs after each line.
    Interactive,
    /// EN: `bmxt exec` — no ask / zenity / `| browse`; buffer only until IPC/OS emit.
    NonInteractive,
}

/**
 * EN: Completion-buffer sink for one `run_line` (POSIX stdout/stderr lines).
 * Infrastructure logs must not use this — keep those on `eprintln!` / `repl_log`.
 * JA: 1 回の `run_line` 用完了バッファ。インフラログはここに混ぜない。
 */
#[derive(Debug, Default, Clone)]
pub struct CommandIo {
    stdout: Vec<String>,
    stderr: Vec<String>,
}

impl CommandIo {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn stdout_line(&mut self, line: impl Into<String>) {
        self.stdout.push(line.into());
    }

    pub fn stderr_line(&mut self, line: impl Into<String>) {
        self.stderr.push(line.into());
    }

    pub fn extend_stdout<I, S>(&mut self, lines: I)
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        for line in lines {
            self.stdout.push(line.into());
        }
    }

    pub fn extend_stderr<I, S>(&mut self, lines: I)
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        for line in lines {
            self.stderr.push(line.into());
        }
    }

    /** EN: Route lines by plan-time exit (0 → stdout, else stderr). */
    pub fn lines_for_exit<I, S>(&mut self, lines: I, exit_status: i32)
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        if exit_status == EXIT_SUCCESS {
            self.extend_stdout(lines);
        } else {
            self.extend_stderr(lines);
        }
    }

    pub fn into_output(self, exit_status: i32) -> CommandOutput {
        CommandOutput {
            stdout: self.stdout,
            stderr: self.stderr,
            exit_status,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bmxt_core::ir::EXIT_MISUSE;

    #[test]
    fn lines_for_exit_splits_channels() {
        let mut io = CommandIo::new();
        io.lines_for_exit(["ok"], EXIT_SUCCESS);
        io.lines_for_exit(["usage: x"], EXIT_MISUSE);
        let out = io.into_output(EXIT_MISUSE);
        assert_eq!(out.stdout, vec!["ok"]);
        assert_eq!(out.stderr, vec!["usage: x"]);
        assert_eq!(out.exit_status, EXIT_MISUSE);
    }
}
