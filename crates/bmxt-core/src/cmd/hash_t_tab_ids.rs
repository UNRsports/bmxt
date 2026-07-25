//! EN: Shared `#t:<id>` argv parsing for tab-target verbs (`back` / `forward` / `reload`).
//! JA: タブ対象動詞向けの `#t:<id>` 引数パース共有。

use crate::ir::{msg_key, msg_param, msgs, DispatchBundle};

/** EN: Parse `#t:<id>` tokens from `args[skip..]`. Empty → Ok(vec![]). */
pub fn parse_hash_t_tab_ids(
    args: &[String],
    skip: usize,
    bad_token_key: &str,
    usage_key: &str,
) -> Result<Vec<i64>, DispatchBundle> {
    let mut ids = Vec::new();
    for raw in args.iter().skip(skip) {
        let tok = raw.trim();
        if tok.is_empty() {
            continue;
        }
        let Some(id_str) = tok.strip_prefix("#t:") else {
            return Err(msgs(vec![
                msg_param(bad_token_key, "token", tok),
                msg_key(usage_key),
            ]));
        };
        match id_str.parse::<i64>() {
            Ok(id) if id >= 0 => {
                if !ids.contains(&id) {
                    ids.push(id);
                }
            }
            _ => {
                return Err(msgs(vec![
                    msg_param(bad_token_key, "token", tok),
                    msg_key(usage_key),
                ]));
            }
        }
    }
    Ok(ids)
}
