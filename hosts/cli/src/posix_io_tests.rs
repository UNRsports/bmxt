//! EN: CLI-side BMXt POSIX Profile / NonInteractive sink checks (no WebRTC).
//! JA: CLI 側 Profile / NonInteractive シンク検証（WebRTC なし）。

#[cfg(test)]
mod tests {
    use bmxt_core::ir::{EXIT_MISUSE, EXIT_NOT_FOUND, EXIT_SUCCESS};
    use bmxt_core::pipe_consumer::classify_pipe_consumer;
    use bmxt_core::run_line;

    use crate::adapter::CliHostAdapter;
    use crate::command_io::{CommandIo, InteractionMode};
    use crate::config::CliConfig;

    fn test_cfg() -> CliConfig {
        CliConfig {
            device_id: "test-device".into(),
            display_name: "terminal@test".into(),
            family_id: None,
            seed_b64: None,
            created_at: "2026-01-01T00:00:00.000Z".into(),
            updated_at: "2026-01-01T00:00:00.000Z".into(),
            handshake_delivery: None,
            handshake_ticket_dir: None,
        }
    }

    fn noninteractive_adapter<'a>(
        cfg: &'a mut CliConfig,
        draft: &'a mut Option<bmxt_ui_settings::UiSettings>,
    ) -> CliHostAdapter<'a> {
        CliHostAdapter {
            cfg,
            client: None,
            setting_draft: draft,
            mode: InteractionMode::NonInteractive,
            io: CommandIo::new(),
        }
    }

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

    #[test]
    fn interaction_mode_gates_ui() {
        assert!(InteractionMode::Interactive.allows_interactive_ui());
        assert!(!InteractionMode::NonInteractive.allows_interactive_ui());
    }

    #[test]
    fn unknown_pipe_consumer_is_none() {
        assert!(classify_pipe_consumer("not-a-real-consumer").is_none());
        assert!(classify_pipe_consumer("browse").is_some());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn noninteractive_refuses_browse_pipe() {
        let mut cfg = test_cfg();
        let mut draft = None;
        let mut adapter = noninteractive_adapter(&mut cfg, &mut draft);
        let outcome = adapter
            .run_line("setting -list | browse")
            .await
            .expect("run_line");
        assert_eq!(outcome.exit_status, EXIT_MISUSE);
        assert!(
            outcome.output.stdout.is_empty(),
            "browse refusal must not pollute stdout: {:?}",
            outcome.output.stdout
        );
        assert!(
            !outcome.output.stderr.is_empty(),
            "expected stderr diagnostic"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn noninteractive_refuses_sync_setup() {
        let mut cfg = test_cfg();
        let mut draft = None;
        let mut adapter = noninteractive_adapter(&mut cfg, &mut draft);
        let outcome = adapter.run_line("sync -setup").await.expect("run_line");
        assert_eq!(outcome.exit_status, EXIT_MISUSE);
        assert!(!outcome.output.stderr.is_empty());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn unknown_pipe_consumer_is_misuse_on_stderr() {
        let mut cfg = test_cfg();
        let mut draft = None;
        let mut adapter = noninteractive_adapter(&mut cfg, &mut draft);
        let outcome = adapter
            .run_line("tab -list | not-a-real-consumer")
            .await
            .expect("run_line");
        assert_eq!(outcome.exit_status, EXIT_MISUSE);
        assert!(outcome.output.stdout.is_empty());
        assert!(
            outcome
                .output
                .stderr
                .iter()
                .any(|l| l.contains("unknown pipe consumer")),
            "stderr={:?}",
            outcome.output.stderr
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn help_success_stays_on_stdout() {
        let mut cfg = test_cfg();
        let mut draft = None;
        let mut adapter = noninteractive_adapter(&mut cfg, &mut draft);
        let outcome = adapter.run_line("help").await.expect("run_line");
        assert_eq!(outcome.exit_status, EXIT_SUCCESS);
        assert!(
            !outcome.output.stdout.is_empty(),
            "help should print to stdout"
        );
        assert!(
            outcome.output.stderr.is_empty(),
            "help success must not use stderr: {:?}",
            outcome.output.stderr
        );
    }
}
