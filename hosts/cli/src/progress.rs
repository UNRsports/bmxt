//! EN: Interactive CLI progress (ASCII bar + status) for long peer RPCs.
//! JA: 長時間 peer RPC 向け Interactive CLI 進捗（ASCII バー＋状態）。

use crate::repl_log;

const BAR_WIDTH: usize = 24;

/**
 * EN: Render a one-line progress update via REPL-safe log.
 *     `fraction` in 0.0..=1.0 when known; `None` shows an indeterminate pulse.
 * JA: REPL 安全な1行進捗。`fraction` 既知なら 0–1、不明なら不定パルス。
 */
pub fn report(label: &str, fraction: Option<f64>, detail: &str) {
    let bar = match fraction {
        Some(f) => {
            let clamped = if f.is_finite() {
                f.clamp(0.0, 1.0)
            } else {
                0.0
            };
            let filled = ((clamped * BAR_WIDTH as f64).round() as usize).min(BAR_WIDTH);
            let empty = BAR_WIDTH.saturating_sub(filled);
            format!(
                "[{}{}] {:>3}%",
                "#".repeat(filled),
                "-".repeat(empty),
                (clamped * 100.0).round() as i32
            )
        }
        None => {
            let pulse = (std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() / 200)
                .unwrap_or(0)
                % (BAR_WIDTH as u128)) as usize;
            let mut cells = vec!["-"; BAR_WIDTH];
            if BAR_WIDTH > 0 {
                cells[pulse % BAR_WIDTH] = "#";
            }
            format!("[{}]  ..", cells.concat())
        }
    };
    if detail.is_empty() {
        repl_log::line(&format!("{label} {bar}"));
    } else {
        repl_log::line(&format!("{label} {bar}  {detail}"));
    }
}

pub fn done(label: &str, detail: &str) {
    let bar = format!("[{}] 100%", "#".repeat(BAR_WIDTH));
    if detail.is_empty() {
        repl_log::line(&format!("{label} {bar}"));
    } else {
        repl_log::line(&format!("{label} {bar}  {detail}"));
    }
}
