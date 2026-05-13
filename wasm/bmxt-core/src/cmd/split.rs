use crate::meta::Cmd;
use crate::model::{DispatchJson, Effect};

pub const CMD: Cmd = Cmd {
    name: "split",
    aliases: &[],
    usage_primary: "split -col | split -row",
};

fn split_usage_lines() -> Vec<String> {
    vec![
        "usage: split -col   — vertical split (new pane beside current)".to_string(),
        "       split -row   — horizontal split (new pane below current)".to_string(),
        "       Ctrl+Arrow   — move keyboard focus between panes when more than one is open"
            .to_string(),
    ]
}

pub fn run(args: &[String]) -> DispatchJson {
    if args.len() <= 1 {
        let mut lines = vec!["split: choose a layout".to_string()];
        lines.extend(split_usage_lines());
        lines.push(
            "Run split alone for this message; the prompt restores to `split ` for Tab completion."
                .to_string(),
        );
        return DispatchJson::lines(lines);
    }
    let sub = args[1].to_lowercase();
    if !crate::generated::command_subcommands::is_second_token("split", args[1].as_str()) {
        let mut lines = vec![format!("error: unknown split option: {}", args[1])];
        lines.extend(split_usage_lines());
        return DispatchJson::lines(lines);
    }
    if args.len() > 2 {
        let mut lines = vec!["error: split takes only one option (-col or -row)".to_string()];
        lines.extend(split_usage_lines());
        return DispatchJson::lines(lines);
    }
    match sub.as_str() {
        "-col" => DispatchJson::effects(vec![Effect::SplitCol]),
        "-row" => DispatchJson::effects(vec![Effect::SplitRow]),
        _ => unreachable!("is_second_token and match must stay in sync with manifest"),
    }
}

#[cfg(test)]
mod tests {
    use super::run;
    use crate::model::Effect;

    #[test]
    fn split_col_emits_effect() {
        let out = run(&["split".into(), "-col".into()]);
        let ef = out.effects.expect("effects");
        assert!(ef.iter().any(|e| matches!(e, Effect::SplitCol)));
    }

    #[test]
    fn split_row_emits_effect() {
        let out = run(&["split".into(), "-row".into()]);
        let ef = out.effects.expect("effects");
        assert!(ef.iter().any(|e| matches!(e, Effect::SplitRow)));
    }
}
