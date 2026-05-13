//! `grep` — search **history**, **bookmarks**, or **page text** in memory only (host implements fetch).
//! EN: No persistence is added by this module; results are printed to the terminal session.
//! JA: 本モジュールは永続化を行いません。結果はターミナル表示のみです。

use crate::line_parse::strip_invisible_format_chars;
use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "grep",
    aliases: &[],
    usage_primary: "grep -history | grep -bookmark | grep -page <pattern>",
};

fn usage_lines() -> Vec<String> {
    vec![
        "usage: grep -history <pattern>   — search recent history titles/URLs".to_string(),
        "       grep -bookmark <pattern>  — search bookmark titles/URLs".to_string(),
        "       grep -page <pattern>     — search visible text in non-discarded http(s) tabs".to_string(),
        "EN: Pattern is matched as a case-insensitive substring (no regex in v1).".to_string(),
        "JA: パターンは大文字小文字を区別しない部分一致です（v1 は正規表現なし）。".to_string(),
        "EN/JA: Optional ASCII double quotes around the pattern are stripped (e.g. grep -history \"…\").".to_string(),
    ]
}

/// EN: Same ASCII fold as `is_second_token` in generated `command_subcommands.rs`.
/// JA: 生成コードの `is_second_token` と同じ ASCII 大小折りたたみ。
fn normalize_grep_second_token(head: &str) -> String {
    strip_invisible_format_chars(head.trim()).to_ascii_lowercase()
}

/// Trim outer `"…"` / `'…'` once so pasted quoted Japanese still matches titles.
fn normalize_grep_pattern(raw: String) -> String {
    let t = strip_invisible_format_chars(raw.trim());
    let chs: Vec<char> = t.chars().collect();
    if chs.len() >= 2 {
        let a = chs[0];
        let b = chs[chs.len() - 1];
        if (a == '"' && b == '"') || (a == '\'' && b == '\'') {
            return strip_invisible_format_chars(
                &chs[1..chs.len() - 1].iter().collect::<String>().trim(),
            )
            .to_string();
        }
    }
    t.to_string()
}

pub fn run(args: &[String]) -> DispatchJson {
    if args.get(1).is_none() {
        let mut lines = vec!["grep: available options".to_string()];
        lines.extend(usage_lines());
        return DispatchJson::lines(lines);
    }
    let head_raw = args[1].as_str();
    let head_key = normalize_grep_second_token(head_raw);
    if !crate::generated::command_subcommands::is_second_token("grep", &head_key) {
        let mut lines = vec![format!("error: unknown grep option: {head_raw}")];
        lines.extend(usage_lines());
        return DispatchJson::lines(lines);
    }
    let pattern_raw = args.iter().skip(2).cloned().collect::<Vec<_>>().join(" ");
    let pattern = normalize_grep_pattern(pattern_raw);
    if pattern.is_empty() {
        let mut lines = vec!["error: grep needs a non-empty pattern".to_string()];
        lines.extend(usage_lines());
        return DispatchJson::lines(lines);
    }
    let effect = match head_key.as_str() {
        "-history" => Effect::GrepHistory { pattern },
        "-bookmark" => Effect::GrepBookmark { pattern },
        "-page" => Effect::GrepPage { pattern },
        _ => {
            let mut lines = vec![format!(
                "error: internal: unrecognized grep head after validation ({head_key})"
            )];
            lines.extend(usage_lines());
            return DispatchJson::lines(lines);
        }
    };
    DispatchJson::effects(vec![effect])
}

#[cfg(test)]
mod tests {
    use super::run;
    use crate::model::Effect;

    #[test]
    fn grep_history_accepts_uppercase_flag() {
        let out = run(&["grep".into(), "-History".into(), "foo".into()]);
        let ef = out.effects.expect("effects");
        assert!(matches!(&ef[0], Effect::GrepHistory { pattern } if pattern == "foo"));
    }

    #[test]
    fn grep_history_strips_ascii_double_quotes() {
        let out = run(&["grep".into(), "-history".into(), "\"クソゲー\"".into()]);
        let ef = out.effects.expect("effects");
        assert!(matches!(&ef[0], Effect::GrepHistory { pattern } if pattern == "クソゲー"));
    }

    #[test]
    fn grep_page_emits_effect_with_hiragana_pattern() {
        let out = run(&["grep".into(), "-page".into(), "変わる".into()]);
        let ef = out.effects.expect("effects");
        assert!(matches!(&ef[0], Effect::GrepPage { pattern } if pattern == "変わる"));
    }

    #[test]
    fn grep_page_accepts_leading_bom_on_flag() {
        let out = run(&["grep".into(), format!("\u{feff}-page"), "変わる".into()]);
        let ef = out.effects.expect("effects");
        assert!(matches!(&ef[0], Effect::GrepPage { pattern } if pattern == "変わる"));
    }
}
