//! EN: REPL-safe log lines — queued while `BMXt>` owns the TTY so the caret returns.
//! JA: REPL 安全なログ。BMXt> 中はキュー経由でキャレットを戻す。

use std::sync::{Mutex, OnceLock};

type LogSink = Box<dyn FnMut(String) + Send>;

static SINK: OnceLock<Mutex<Option<LogSink>>> = OnceLock::new();

fn sink() -> &'static Mutex<Option<LogSink>> {
    SINK.get_or_init(|| Mutex::new(None))
}

/**
 * EN: Install a prompt log sink (call once after `PromptShell::open`).
 *     While the prompt loop is active, messages are queued and drained above `BMXt>`.
 */
pub fn install(mut printer: impl FnMut(String) + Send + 'static) {
    let boxed: LogSink = Box::new(move |msg: String| {
        printer(msg);
    });
    let mut guard = sink().lock().unwrap_or_else(|e| e.into_inner());
    *guard = Some(boxed);
}

/** EN: Drop the sink (REPL exit) so later logs use plain eprintln. */
pub fn uninstall() {
    let mut guard = sink().lock().unwrap_or_else(|e| e.into_inner());
    *guard = None;
}

/**
 * EN: One log line. Prefer the prompt sink when installed so `BMXt>` keeps the caret.
 * JA: 1 行ログ。導入済みならプロンプト sink で BMXt> のキャレットを維持する。
 */
pub fn line(message: &str) {
    let text = if message.ends_with('\n') {
        message.to_string()
    } else {
        format!("{message}\n")
    };
    let mut guard = sink().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(printer) = guard.as_mut() {
        printer(text);
        return;
    }
    eprint!("{text}");
}
