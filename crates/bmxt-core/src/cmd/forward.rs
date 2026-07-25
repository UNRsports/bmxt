use crate::ir::{effects, msg_key, msgs, ChromeEffect, DispatchBundle};

/** EN: Bare `forward` → active tab. Numeric ids → pipe/programmatic targets only (no picker). */
pub fn run(args: &[String]) -> DispatchBundle {
    match parse_optional_tab_ids(args) {
        Ok(tab_ids) => effects(vec![ChromeEffect::TabGoForward { tab_ids }]),
        Err(()) => msgs(vec![
            msg_key("cmd.forward.error.badArgs"),
            msg_key("cmd.forward.usage"),
        ]),
    }
}

fn parse_optional_tab_ids(args: &[String]) -> Result<Vec<i64>, ()> {
    let mut ids = Vec::new();
    for raw in args.iter().skip(1) {
        let tok = raw.trim();
        if tok.is_empty() {
            continue;
        }
        match tok.parse::<i64>() {
            Ok(id) if id >= 0 => {
                if !ids.contains(&id) {
                    ids.push(id);
                }
            }
            _ => return Err(()),
        }
    }
    Ok(ids)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    #[test]
    fn bare_emits_empty_tab_ids() {
        let bundle = run(&["forward".into()]);
        match bundle {
            DispatchBundle::Effects { effects } => match &effects[0] {
                ChromeEffect::TabGoForward { tab_ids } => assert!(tab_ids.is_empty()),
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn parses_numeric_ids() {
        let bundle = run(&["forward".into(), "7".into()]);
        match bundle {
            DispatchBundle::Effects { effects } => match &effects[0] {
                ChromeEffect::TabGoForward { tab_ids } => assert_eq!(tab_ids, &vec![7]),
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }
}
