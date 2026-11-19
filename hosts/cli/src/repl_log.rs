//! EN: REPL-safe log lines — ExternalPrinter while `BMXt>` is active so the caret returns.
//! JA: REPL 安全なログ。BMXt> 中は ExternalPrinter 経由でキャレットを戻す。

use std::sync::{Mutex, OnceLock};

use rustyline::ExternalPrinter;

type LogSink = Box<dyn FnMut(String) + Send>;

static SINK: OnceLock<Mutex<Option<LogSink>>> = OnceLock::new();

fn sink() -> &'static Mutex<Option<LogSink>> {
    SINK.get_or_init(|| Mutex::new(None))
}

/**
 * EN: Install a rustyline external printer (call once after `PromptShell::open`).
 *     While readline is active, prints go above the prompt and the caret is restored.
 */
pub fn install(mut printer: impl ExternalPrinter + Send + 'static) {
    let boxed: LogSink = Box::new(move |msg: String| {
        let _ = printer.print(msg);
    });
    let mut guard = sink().lock().unwrap_or_else(|e| e.into_inner());
    *guard = Some(boxed);
}

/** EN: Drop the printer (REPL exit) so later logs use plain eprintln. */
pub fn uninstall() {
    let mut guard = sink().lock().unwrap_or_else(|e| e.into_inner());
    *guard = None;
}

/**
 * EN: One log line. Prefer ExternalPrinter when installed so `BMXt>` keeps the caret.
 * JA: 1 行ログ。導入済みなら ExternalPrinter で BMXt> のキャレットを維持する。
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
