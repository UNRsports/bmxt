//! `dom` — apply visibility filters on the **current target tab** via host-side scripting.
//! EN: Data is not persisted by this command; only an in-page style/markup hint is applied.
//! JA: 本コマンドは閲覧データを永続化しません。ページ内スタイル等の一時的な表示変更のみです。

use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "dom",
    aliases: &[],
    usage_primary: "dom -select | dom -hide (-html|-react) <selectors…>",
};

fn usage_lines() -> Vec<String> {
    vec![
        "usage: dom -select  -html|-react <css-selector> [<selector> …]".to_string(),
        "       dom -hide    -html|-react <css-selector> [<selector> …]".to_string(),
        "EN: -select keeps only matched nodes visible; -hide hides matched nodes.".to_string(),
        "JA: -select は一致要素以外を非表示、-hide は一致要素を非表示にします。".to_string(),
        "EN: -html / -react choose capture flavor for messaging (both use live DOM today).".to_string(),
        "JA: -html / -react は表示モードの区別用（現状どちらも実 DOM に適用）。".to_string(),
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
    let op = match first.to_ascii_lowercase().as_str() {
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
