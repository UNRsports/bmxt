use crate::cmd::hash_t_tab_ids::parse_hash_t_tab_ids;
use crate::ir::{effects, ChromeEffect, DispatchBundle};

pub fn run(args: &[String]) -> DispatchBundle {
    match parse_hash_t_tab_ids(
        args,
        1,
        "cmd.back.error.badTabToken",
        "cmd.back.usage",
    ) {
        Ok(tab_ids) => effects(vec![ChromeEffect::TabGoBack { tab_ids }]),
        Err(bundle) => bundle,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    #[test]
    fn bare_emits_empty_tab_ids() {
        let bundle = run(&["back".into()]);
        match bundle {
            DispatchBundle::Effects { effects } => match &effects[0] {
                ChromeEffect::TabGoBack { tab_ids } => assert!(tab_ids.is_empty()),
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }

    #[test]
    fn parses_tab_tokens() {
        let bundle = run(&["back".into(), "#t:12".into(), "#t:34".into()]);
        match bundle {
            DispatchBundle::Effects { effects } => match &effects[0] {
                ChromeEffect::TabGoBack { tab_ids } => assert_eq!(tab_ids, &vec![12, 34]),
                other => panic!("unexpected effect: {other:?}"),
            },
            other => panic!("unexpected bundle: {other:?}"),
        }
    }
}
