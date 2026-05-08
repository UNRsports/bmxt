use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "find",
    aliases: &[],
    usage_primary: "find -pagetitle <query>",
};

fn find_usage_lines() -> Vec<String> {
    vec![
        "usage: find -pagetext <query>    — search visible page text across tabs".to_string(),
        "       find -pagetitle <query>   — search tab titles across tabs".to_string(),
        "       find -windowtitle <query> — search window labels (active tab title per window)"
            .to_string(),
        "       find -group <query>       — search tab group titles".to_string(),
    ]
}

fn norm_find_flag(arg: Option<&String>) -> Option<char> {
    let a = arg?.to_lowercase();
    match a.as_str() {
        "-pagetext" => Some('x'),
        "-pagetitle" => Some('t'),
        "-windowtitle" => Some('w'),
        "-group" => Some('g'),
        _ => None,
    }
}

fn read_query(args: &[String]) -> Option<String> {
    let q = args.iter().skip(2).cloned().collect::<Vec<_>>().join(" ");
    let q = q.trim();
    if q.is_empty() {
        return None;
    }
    Some(q.to_string())
}

pub fn run(args: &[String]) -> DispatchJson {
    let sub = norm_find_flag(args.get(1));
    if sub.is_none() {
        if args.get(1).is_none() {
            let mut lines = vec!["find: available options".to_string()];
            lines.extend(find_usage_lines());
            return DispatchJson::lines(lines);
        }
        let mut lines = vec![format!(
            "error: unknown find option: {}",
            args.get(1).map(|s| s.as_str()).unwrap_or("")
        )];
        lines.extend(find_usage_lines());
        return DispatchJson::lines(lines);
    }

    let Some(query) = read_query(args) else {
        let mut lines = vec!["error: missing query".to_string()];
        lines.extend(find_usage_lines());
        return DispatchJson::lines(lines);
    };

    match sub.unwrap() {
        'x' => DispatchJson::effects(vec![Effect::FindPageText { query }]),
        't' => DispatchJson::effects(vec![Effect::FindPageTitle { query }]),
        'w' => DispatchJson::effects(vec![Effect::FindWindowTitle { query }]),
        'g' => DispatchJson::effects(vec![Effect::FindGroup { query }]),
        _ => unreachable!(),
    }
}
