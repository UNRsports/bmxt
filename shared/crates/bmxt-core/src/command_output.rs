//! EN: Host-facing command I/O snapshot (BMXt POSIX Profile).
//! JA: ホスト向けコマンド I/O スナップショット（BMXt POSIX Profile）。

use serde::{Deserialize, Serialize};

use crate::ir::{EXIT_SUCCESS, EXIT_FAILURE, EXIT_MISUSE, EXIT_NOT_FOUND};

/// EN: Logical output channel (POSIX stdout / stderr).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogChannel {
    Stdout,
    Stderr,
}

/**
 * EN: Canonical command output for the BMXt POSIX Profile.
 * Delivery is a completion buffer (UTF-8 lines); not a live byte stream.
 * JA: BMXt POSIX Profile の正準コマンド出力。配信は完了バッファ（UTF-8 行）。
 */
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandOutput {
    pub stdout: Vec<String>,
    pub stderr: Vec<String>,
    pub exit_status: i32,
}

impl CommandOutput {
    pub fn success(stdout: Vec<String>) -> Self {
        Self {
            stdout,
            stderr: Vec::new(),
            exit_status: EXIT_SUCCESS,
        }
    }

    pub fn with_exit(stdout: Vec<String>, stderr: Vec<String>, exit_status: i32) -> Self {
        Self {
            stdout,
            stderr,
            exit_status,
        }
    }

    /** EN: Route `lines` to stdout when exit is 0, else stderr. */
    pub fn from_lines_and_exit(lines: Vec<String>, exit_status: i32) -> Self {
        if exit_status == EXIT_SUCCESS {
            Self::success(lines)
        } else {
            Self {
                stdout: Vec::new(),
                stderr: lines,
                exit_status,
            }
        }
    }

    pub fn channel_for_exit(exit_status: i32) -> LogChannel {
        if exit_status == EXIT_SUCCESS {
            LogChannel::Stdout
        } else {
            LogChannel::Stderr
        }
    }

    pub fn is_success(&self) -> bool {
        self.exit_status == EXIT_SUCCESS
    }
}

/// EN: Profile exit status table (keep in sync with TS `exit-status.ts`).
pub const PROFILE_EXIT_SUCCESS: i32 = EXIT_SUCCESS;
pub const PROFILE_EXIT_FAILURE: i32 = EXIT_FAILURE;
pub const PROFILE_EXIT_MISUSE: i32 = EXIT_MISUSE;
pub const PROFILE_EXIT_NOT_FOUND: i32 = EXIT_NOT_FOUND;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_lines_routes_by_exit() {
        let ok = CommandOutput::from_lines_and_exit(vec!["a".into()], EXIT_SUCCESS);
        assert_eq!(ok.stdout, vec!["a"]);
        assert!(ok.stderr.is_empty());

        let bad = CommandOutput::from_lines_and_exit(vec!["usage: x".into()], EXIT_MISUSE);
        assert!(bad.stdout.is_empty());
        assert_eq!(bad.stderr, vec!["usage: x"]);
        assert_eq!(bad.exit_status, EXIT_MISUSE);
    }
}
