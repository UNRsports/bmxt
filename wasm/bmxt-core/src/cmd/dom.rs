//! `dom` — `-list` picker (DOM read-only browse).
//! EN: No browsing data is persisted by this module; the picker prints to the terminal session only.
//! JA: 本モジュールは閲覧データの永続化を行いません。picker はターミナル表示のみです。

use crate::line_parse::strip_invisible_format_chars;
use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "dom",
    aliases: &[],
    usage_primary: "dom -list [--html|--react] [<pattern>]",
};

fn usage_lines() -> Vec<String> {
    vec![
        "usage: dom -list [--html|--react] [<pattern>]   — open DOM picker (default flavor: --html)".to_string(),
        "EN: -list opens a picker (same chrome as grep -list); flavor pull-down: --html (default) | --react.".to_string(),
        "JA: -list は picker（grep -list と同じクロム）。flavor プルダウン: --html (default) | --react。".to_string(),
        "EN: <pattern> is a case-insensitive substring filter on the output lines (no regex).".to_string(),
        "JA: <pattern> は出力行に対する大文字小文字無視の部分一致フィルタ（正規表現なし）。".to_string(),
    ]
}

/// EN: Same ASCII fold as `is_second_token` in generated `command_subcommands.rs`.
/// JA: 生成コードの `is_second_token` と同じ ASCII 大小折りたたみ。
fn normalize_dom_token(tok: &str) -> String {
    strip_invisible_format_chars(tok.trim()).to_ascii_lowercase()
}

/// Trim outer `"…"` / `'…'` once so pasted quoted pattern still matches DOM lines.
fn normalize_dom_pattern(raw: String) -> String {
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

/// `dom -list` — optional flavor token then pattern (`--html` default).
fn run_list(args: &[String]) -> DispatchJson {
    if args.len() == 2 {
        return DispatchJson::effects(vec![Effect::DomList {
            flavor: "--html".to_string(),
            pattern: String::new(),
        }]);
    }
    let tok2 = normalize_dom_token(args[2].as_str());
    let (flavor, pattern_start_idx): (&str, usize) = match tok2.as_str() {
        "--html" | "--react" => (tok2.as_str(), 3),
        _ => ("--html", 2),
    };
    let pattern_raw = args
        .iter()
        .skip(pattern_start_idx)
        .cloned()
        .collect::<Vec<_>>()
        .join(" ");
    let pattern = normalize_dom_pattern(pattern_raw);
    DispatchJson::effects(vec![Effect::DomList {
        flavor: flavor.to_string(),
        pattern,
    }])
}

pub fn run(args: &[String]) -> DispatchJson {
    if args.get(1).is_none() {
        let mut lines = vec!["dom: available options".to_string()];
        lines.extend(usage_lines());
        return DispatchJson::lines(lines);
    }
    let first = args[1].as_str();
    if !crate::generated::command_subcommands::is_second_token("dom", first) {
        let mut lines = vec![format!("error: unknown dom option: {first}")];
        lines.extend(usage_lines());
        return DispatchJson::lines(lines);
    }
    let first_lc = normalize_dom_token(first);
    match first_lc.as_str() {
        "-list" => run_list(args),
        _ => {
            let mut lines = vec![format!("error: unknown dom option (internal): {first}")];
            lines.extend(usage_lines());
            DispatchJson::lines(lines)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::run;
    use crate::model::Effect;

    #[test]
    fn dom_bare_prints_usage() {
        let out = run(&["dom".into()]);
        assert!(out.effects.is_none());
        let lines = out.lines.expect("lines");
        assert!(lines[0].starts_with("dom:"));
    }

    #[test]
    fn dom_list_defaults_to_html_flavor() {
        let out = run(&["dom".into(), "-list".into()]);
        let ef = out.effects.expect("effects");
        assert_eq!(ef.len(), 1);
        assert!(matches!(
            &ef[0],
            Effect::DomList { flavor, pattern } if flavor == "--html" && pattern.is_empty()
        ));
    }

    #[test]
    fn dom_list_with_react_flavor_and_pattern() {
        let out = run(&[
            "dom".into(),
            "-list".into(),
            "--React".into(),
            "header".into(),
        ]);
        let ef = out.effects.expect("effects");
        assert!(matches!(
            &ef[0],
            Effect::DomList { flavor, pattern } if flavor == "--react" && pattern == "header"
        ));
    }

    #[test]
    fn dom_list_pattern_without_flavor_defaults_to_html() {
        let out = run(&["dom".into(), "-list".into(), "main-content".into()]);
        let ef = out.effects.expect("effects");
        assert!(matches!(
            &ef[0],
            Effect::DomList { flavor, pattern } if flavor == "--html" && pattern == "main-content"
        ));
    }

    #[test]
    fn dom_list_strips_outer_double_quotes_from_pattern() {
        let out = run(&[
            "dom".into(),
            "-list".into(),
            "--html".into(),
            "\"app-root\"".into(),
        ]);
        let ef = out.effects.expect("effects");
        assert!(matches!(
            &ef[0],
            Effect::DomList { pattern, .. } if pattern == "app-root"
        ));
    }

    #[test]
    fn dom_unknown_second_token_is_rejected() {
        let out = run(&["dom".into(), "-show".into()]);
        assert!(out.effects.is_none());
        let lines = out.lines.expect("lines");
        assert!(lines[0].starts_with("error: unknown dom option"));
    }
}
