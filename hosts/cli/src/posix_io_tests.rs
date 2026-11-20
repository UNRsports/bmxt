//! EN: CLI-side BMXt POSIX Profile / NonInteractive sink checks (no WebRTC).
//! JA: CLI 側 Profile / NonInteractive シンク検証（WebRTC なし）。

#[cfg(test)]
mod tests {
    use bmxt_core::ir::{EXIT_MISUSE, EXIT_NOT_FOUND, EXIT_SUCCESS};
    use bmxt_core::run_line;

    use crate::command_io::CommandIo;

    #[test]
    fn command_io_routes_by_exit() {
        let mut io = CommandIo::new();
        io.lines_for_exit(["tab row"], EXIT_SUCCESS);
        io.lines_for_exit(["usage: x"], EXIT_MISUSE);
        let out = io.into_output(EXIT_MISUSE);
        assert_eq!(out.stdout, vec!["tab row"]);
        assert_eq!(out.stderr, vec!["usage: x"]);
        assert_eq!(out.exit_status, EXIT_MISUSE);
    }

    #[test]
    fn unknown_command_plan_exit_is_127_without_stdout_pollution() {
        let bundle = run_line("definitely-not-a-bmxt-command");
        let status = bundle.exit_status();
        assert_eq!(status, EXIT_NOT_FOUND);
        let mut io = CommandIo::new();
        match bundle {
            bmxt_core::DispatchBundle::Msgs { msgs, .. } => {
                let lines: Vec<_> = msgs.iter().map(|m| m.key.clone()).collect();
                io.lines_for_exit(lines, status);
            }
            bmxt_core::DispatchBundle::Lines { lines, .. } => {
                io.lines_for_exit(lines, status);
            }
            other => panic!("unexpected: {other:?}"),
        }
        let out = io.into_output(status);
        assert!(out.stdout.is_empty(), "failure must not pollute stdout");
        assert!(!out.stderr.is_empty());
        assert_eq!(out.exit_status, EXIT_NOT_FOUND);
    }

    #[test]
    fn profile_exit_table() {
        assert_eq!(EXIT_SUCCESS, 0);
        assert_eq!(EXIT_MISUSE, 2);
        assert_eq!(EXIT_NOT_FOUND, 127);
    }
}
