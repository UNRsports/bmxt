//! `dom` — visibility filters (`-select` / `-hide`) or **structure dump** (`-show`) on the target tab.
//! EN: No browsing data is persisted by these commands; `-show` prints to the terminal session only.
//! JA: 閲覧データの永続化は行いません。`-show` はターミナル表示のみです。

use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "dom",
    aliases: &[],
    usage_primary: "dom -show (-html|-react) | dom -select | dom -hide …",
};

fn usage_lines() -> Vec<String> {
    vec![
        "usage: dom -show    -html|-react   — print DOM structure of the target tab to the terminal".to_string(),
        "       dom -select  -html|-react <css-selector> [<selector> …]".to_string(),
        "       dom -hide    -html|-react <css-selector> [<selector> …]".to_string(),
        "EN: -select keeps only matched nodes visible; -hide hides matched nodes (reload to clear).".to_string(),
        "JA: -select / -hide は表示フィルタ（再読み込みで解除）。-show は構造の表示のみ。".to_string(),
        "EN: -html prints serialized documentElement; -react prints an element-tree outline (Fiber names when detectable).".to_string(),
        "JA: -html は document の HTML。-react は要素木の概要（検出できれば Fiber 系キーを表示）。".to_string(),
    ]
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
    let first_lc = first.to_ascii_lowercase();
    match first_lc.as_str() {
        "-show" => {
            if args.len() != 3 {
                let mut lines = vec!["error: dom -show requires exactly: dom -show -html   or   dom -show -react".to_string()];
                lines.extend(usage_lines());
                return DispatchJson::lines(lines);
            }
            let flavor_tok = args[2].as_str();
            let flavor_l = flavor_tok.to_ascii_lowercase();
            let flavor = match flavor_l.as_str() {
                "-html" | "-react" => flavor_l,
                _ => {
                    let mut lines = vec!["error: dom -show needs third token -html or -react".to_string()];
                    lines.extend(usage_lines());
                    return DispatchJson::lines(lines);
                }
            };
            DispatchJson::effects(vec![Effect::DomShow { flavor }])
        }
        "-select" | "-hide" => {
            let flavor_tok = args.get(2).map(|s| s.as_str()).unwrap_or("");
            let flavor_l = flavor_tok.to_ascii_lowercase();
            let flavor = match flavor_l.as_str() {
                "-html" | "-react" => flavor_l,
                _ => {
                    let mut lines = vec!["error: dom requires -html or -react after -select / -hide".to_string()];
                    lines.extend(usage_lines());
                    return DispatchJson::lines(lines);
                }
            };
            let selectors: Vec<String> = args.iter().skip(3).cloned().collect();
            if selectors.is_empty() {
                let mut lines = vec!["error: dom needs at least one CSS selector after the mode token".to_string()];
                lines.extend(usage_lines());
                return DispatchJson::lines(lines);
            }
            let op = match first_lc.as_str() {
                "-select" => "select",
                "-hide" => "hide",
                _ => {
                    let mut lines = vec![format!("error: unknown dom option (internal): {first}")];
                    lines.extend(usage_lines());
                    return DispatchJson::lines(lines);
                }
            };
            let selectors_json = serde_json::to_string(&selectors).unwrap_or_else(|_| "[]".to_string());
            DispatchJson::effects(vec![Effect::DomApplyFilters {
                op: op.to_string(),
                flavor,
                selectors: selectors_json,
            }])
        }
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
    fn dom_show_emits_dom_show_effect() {
        let out = run(&["dom".into(), "-show".into(), "-html".into()]);
        let ef = out.effects.expect("effects");
        assert!(matches!(&ef[0], Effect::DomShow { flavor } if flavor == "-html"));
    }
}
