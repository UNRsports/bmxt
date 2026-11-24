//! Fixed-token Tab / IME completion (first–third tiers) from the generated registry.
//! EN: Also merges `| browse`… pipe-continuation candidates (same policy as extension TS).

use crate::cmd::all_completion_tokens;
use crate::generated::{
    all_command_metas, is_second_token, resolve_canonical, subcommand_branches,
};
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteHit {
    pub token_start: usize,
    pub token_end: usize,
    pub prefix: String,
    pub candidates: Vec<String>,
    pub tier: String,
}

fn is_ascii_whitespace(b: u8) -> bool {
    b == b' ' || b == b'\t' || b == b'\n' || b == b'\r'
}

/**
 * EN: Floor `pos` to a UTF-8 char boundary (JS may pass a UTF-16 index by mistake).
 * JA: `pos` を UTF-8 文字境界へ切り下げ（JS の UTF-16 指数が誤って渡っても panic しない）。
 */
fn clamp_to_char_boundary(line: &str, pos: usize) -> usize {
    let pos = pos.min(line.len());
    if line.is_char_boundary(pos) {
        return pos;
    }
    let mut p = pos;
    while p > 0 && !line.is_char_boundary(p) {
        p -= 1;
    }
    p
}

/** EN: Whitespace-delimited token bounds under `pos` (UTF-8 byte index). */
fn word_bounds(line: &str, pos: usize) -> (usize, usize) {
    let bytes = line.as_bytes();
    let pos = clamp_to_char_boundary(line, pos);
    let mut l = pos;
    while l > 0 && !is_ascii_whitespace(bytes[l - 1]) {
        l -= 1;
    }
    let mut r = pos;
    while r < bytes.len() && !is_ascii_whitespace(bytes[r]) {
        r += 1;
    }
    (l, r)
}

fn prefix_filter(candidates: &[String], prefix: &str) -> Vec<String> {
    let p = prefix.to_ascii_lowercase();
    candidates
        .iter()
        .filter(|c| c.to_ascii_lowercase().starts_with(&p))
        .cloned()
        .collect()
}

fn second_token_heads(canonical: &str) -> Vec<String> {
    subcommand_branches(canonical)
        .iter()
        .map(|b| b.head.to_string())
        .collect()
}

fn third_token_candidates(canonical: &str, second_lower: &str) -> Vec<String> {
    for br in subcommand_branches(canonical) {
        if br.head.eq_ignore_ascii_case(second_lower) {
            return br
                .trailing_tokens
                .iter()
                .map(|t| (*t).to_string())
                .collect();
        }
    }
    Vec::new()
}

/** EN: First commands whose `-list` can feed `| browse`… (aligned with PICKER_LIST_PRODUCER_TOKENS). */
const PIPE_PRODUCER_FIRST: &[&str] = &[
    "tab",
    "dom",
    "session",
    "setting",
    "search",
    "bookmark",
    "history",
];

/**
 * EN: Pipe consumer completion ids (aligned with PIPE_CONSUMER_COMPLETION_IDS in TS).
 * JA: パイプ右辺候補 id（TS の PIPE_CONSUMER_COMPLETION_IDS と揃える）。
 */
const PIPE_CONSUMER_COMPLETION_IDS: &[&str] = &[
    "browse",
    "open",
    "jump",
    "move",
    "new-window",
    "back",
    "forward",
    "reload",
    "close",
    "tab",
    "bookmark",
    "history",
];

fn is_pipe_producer_first(canonical: &str) -> bool {
    PIPE_PRODUCER_FIRST
        .iter()
        .any(|name| name.eq_ignore_ascii_case(canonical))
}

/** EN: Bare pipe-consumer names (+ aliases), same order as PIPE_CONSUMER_COMPLETION_IDS. */
fn list_pipe_consumer_names() -> Vec<String> {
    let mut out = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for id in PIPE_CONSUMER_COMPLETION_IDS {
        let meta = all_command_metas().iter().find(|m| m.name == *id);
        let names: Vec<&str> = match meta {
            Some(m) => {
                let mut names = vec![m.name];
                names.extend(m.aliases.iter().copied());
                names
            }
            None => vec![*id],
        };
        for name in names {
            if seen.insert(name.to_string()) {
                out.push(name.to_string());
            }
        }
    }
    out
}

/** EN: Display tokens like `| browse` (canonical name + aliases). */
fn list_pipe_continuation_candidate_tokens() -> Vec<String> {
    list_pipe_consumer_names()
        .into_iter()
        .map(|name| format!("| {name}"))
        .collect()
}

/**
 * EN: Complete the first token of the pipe RHS (`… | b` → `browse`), extension-aligned.
 * JA: パイプ右辺の第一トークン補完（`… | b` → `browse`）。
 */
fn complete_pipe_rhs(line: &str, cursor: usize, pipe_at: usize) -> Option<CompleteHit> {
    let after_bar = pipe_at + 1;
    let bytes = line.as_bytes();
    let mut rhs_start = after_bar;
    while rhs_start < bytes.len() && is_ascii_whitespace(bytes[rhs_start]) {
        rhs_start += 1;
    }
    // EN: Cursor still on `|` or in spaces before the consumer — offer all consumers.
    if cursor <= rhs_start {
        let names = list_pipe_consumer_names();
        if names.is_empty() {
            return None;
        }
        return Some(CompleteHit {
            token_start: rhs_start,
            token_end: rhs_start,
            prefix: String::new(),
            candidates: names,
            tier: "first".to_string(),
        });
    }

    let rhs = &line[rhs_start..];
    let local_cursor = cursor.saturating_sub(rhs_start).min(rhs.len());
    let (l, r) = word_bounds(rhs, local_cursor);
    let tokens_before: Vec<&str> = if rhs[..l].trim().is_empty() {
        Vec::new()
    } else {
        rhs[..l].trim().split_whitespace().collect()
    };
    // EN: Only the consumer first token is fixed-complete here (flags are free-form).
    if !tokens_before.is_empty() {
        return None;
    }
    let prefix = rhs[l..local_cursor].to_string();
    let names = list_pipe_consumer_names();
    let cands = if prefix.is_empty() {
        names
    } else {
        prefix_filter(&names, &prefix)
    };
    if cands.is_empty() {
        return None;
    }
    // EN: Exact complete consumer at EOL — no further fixed tokens.
    if cands.len() == 1
        && cands[0].eq_ignore_ascii_case(&rhs[l..r])
        && local_cursor >= r
        && cursor >= line.len()
    {
        return None;
    }
    Some(CompleteHit {
        token_start: rhs_start + l,
        token_end: rhs_start + r,
        prefix,
        candidates: cands,
        tier: "first".to_string(),
    })
}

fn is_pipe_continuation_candidate(token: &str) -> bool {
    let t = token.trim();
    t.starts_with('|')
        && t.chars()
            .nth(1)
            .is_some_and(|c| c.is_ascii_whitespace())
        && t.split_whitespace().nth(1).is_some()
}

fn stage_line_offers_pipe_continuations(stage_line: &str) -> bool {
    let parts: Vec<&str> = stage_line.split_whitespace().collect();
    if parts.len() < 2 {
        return false;
    }
    let Some(canonical) = resolve_canonical(parts[0]) else {
        return false;
    };
    if !is_pipe_producer_first(canonical) {
        return false;
    }
    parts[1].eq_ignore_ascii_case("-list")
}

fn is_cursor_on_complete_list_second(stage_line: &str, cursor: usize) -> bool {
    let (l, r) = word_bounds(stage_line, cursor);
    let left = &stage_line[..l];
    let tokens_before: Vec<&str> = if left.trim().is_empty() {
        Vec::new()
    } else {
        left.trim().split_whitespace().collect()
    };
    if tokens_before.len() != 1 {
        return false;
    }
    let Some(canonical) = resolve_canonical(tokens_before[0]) else {
        return false;
    };
    if !is_pipe_producer_first(canonical) {
        return false;
    }
    let word = &stage_line[l..r];
    word.eq_ignore_ascii_case("-list") && cursor >= r
}

/**
 * EN: True when the cursor may accept `| browse`… after a list producer `-list`
 *     (third+ token zone, trailing space after `-list`, or complete `-list` at EOL).
 */
fn is_pipe_continuation_offer_zone(stage_line: &str, cursor: usize) -> bool {
    if !stage_line_offers_pipe_continuations(stage_line) {
        return false;
    }
    let (l, r) = word_bounds(stage_line, cursor);
    let left = &stage_line[..l];
    let tokens_before: Vec<&str> = if left.trim().is_empty() {
        Vec::new()
    } else {
        left.trim().split_whitespace().collect()
    };

    if tokens_before.len() >= 2 && tokens_before[1].eq_ignore_ascii_case("-list") {
        return true;
    }

    if tokens_before.len() == 1 {
        if let Some(canonical) = resolve_canonical(tokens_before[0]) {
            if is_pipe_producer_first(canonical) {
                let word = &stage_line[l..r];
                if !word.eq_ignore_ascii_case("-list") {
                    return false;
                }
                if cursor < r {
                    return false;
                }
                let after = &stage_line[r..];
                if !after.is_empty() && !after.chars().all(|c| c.is_ascii_whitespace()) {
                    return false;
                }
                return true;
            }
        }
    }
    false
}

fn match_pipe_continuation_candidates(candidates: &[String], prefix: &str) -> Vec<String> {
    if prefix.starts_with('-') {
        return Vec::new();
    }
    if prefix.is_empty() {
        return candidates.to_vec();
    }
    let p = prefix.split_whitespace().collect::<Vec<_>>().join(" ");
    let p = p.to_ascii_lowercase();
    let p_after_pipe = p.trim_start_matches('|').trim_start();
    candidates
        .iter()
        .filter(|candidate| {
            let cl = candidate.to_ascii_lowercase();
            let name = cl.trim_start_matches('|').trim_start();
            if cl.starts_with(&p) {
                return true;
            }
            if p.starts_with('|') {
                return name.starts_with(p_after_pipe);
            }
            name.starts_with(&p)
        })
        .cloned()
        .collect()
}

fn merge_option_and_pipe_continuation(option_candidates: &[String], prefix: &str) -> Vec<String> {
    let pipe_filtered =
        match_pipe_continuation_candidates(&list_pipe_continuation_candidate_tokens(), prefix);
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for token in option_candidates.iter().chain(pipe_filtered.iter()) {
        if seen.insert(token.clone()) {
            out.push(token.clone());
        }
    }
    out
}

/**
 * EN: Merge `| browse`… into third-tier picks on list producers (extension-aligned).
 * JA: list プロデューサーの第三段に `| browse` 等を載せる（拡張と同じ判定）。
 */
fn apply_pipe_continuation_candidates(
    hit: Option<CompleteHit>,
    stage_line: &str,
    cursor: usize,
) -> Option<CompleteHit> {
    if !stage_line_offers_pipe_continuations(stage_line) {
        return hit;
    }

    let on_complete_list_word = is_cursor_on_complete_list_second(stage_line, cursor);
    let mut effective = hit;
    if on_complete_list_word {
        if let Some(ref h) = effective {
            if h.tier == "second" {
                effective = None;
            }
        }
    }

    if let Some(ref h) = effective {
        if h.tier != "third" {
            return effective;
        }
    }

    let in_offer_zone = is_pipe_continuation_offer_zone(stage_line, cursor);
    let merge_existing_third = effective
        .as_ref()
        .is_some_and(|h| h.tier == "third");
    if !in_offer_zone && !merge_existing_third {
        return effective;
    }

    let (l, r) = word_bounds(stage_line, cursor);
    let (prefix, token_start, token_end) = if let Some(ref h) = effective {
        (h.prefix.clone(), h.token_start, h.token_end)
    } else if on_complete_list_word {
        (String::new(), stage_line.len(), stage_line.len())
    } else {
        (stage_line[l..cursor].to_string(), l, r)
    };

    let option_candidates = effective
        .as_ref()
        .map(|h| h.candidates.as_slice())
        .unwrap_or(&[]);
    let merged = merge_option_and_pipe_continuation(option_candidates, &prefix);
    if merged.is_empty() {
        return None;
    }
    Some(CompleteHit {
        token_start,
        token_end,
        prefix,
        candidates: merged,
        tier: "third".to_string(),
    })
}

fn complete_line_fixed(line: &str, cursor: usize) -> Option<CompleteHit> {
    let (l, r) = word_bounds(line, cursor);
    let left = &line[..l];
    let tokens_before: Vec<&str> = if left.trim().is_empty() {
        Vec::new()
    } else {
        left.trim().split_whitespace().collect()
    };
    let token_index = tokens_before.len();
    let prefix = line[l..cursor].to_string();

    if token_index == 0 {
        let cmd_word = &line[l..r];
        let canonical0 = resolve_canonical(cmd_word);
        if let Some(canonical) = canonical0 {
            if cursor >= line.len() && !subcommand_branches(canonical).is_empty() {
                let next = second_token_heads(canonical);
                if !next.is_empty() {
                    return Some(CompleteHit {
                        token_start: line.len(),
                        token_end: line.len(),
                        prefix: String::new(),
                        candidates: next,
                        tier: "second".to_string(),
                    });
                }
            }
        }
        if prefix.is_empty() {
            return None;
        }
        let all = all_completion_tokens();
        let cands = prefix_filter(&all, &prefix);
        if cands.is_empty() {
            return None;
        }
        return Some(CompleteHit {
            token_start: l,
            token_end: r,
            prefix,
            candidates: cands,
            tier: "first".to_string(),
        });
    }

    let Some(first) = tokens_before.first().copied() else {
        return None;
    };
    let Some(canonical) = resolve_canonical(first) else {
        return None;
    };
    if subcommand_branches(canonical).is_empty() {
        return None;
    }

    if token_index == 1 {
        let second_word = &line[l..r];
        let second_complete = is_second_token(canonical, second_word);
        if cursor >= line.len() && second_complete {
            let next = third_token_candidates(canonical, &second_word.to_ascii_lowercase());
            if !next.is_empty() {
                return Some(CompleteHit {
                    token_start: line.len(),
                    token_end: line.len(),
                    prefix: String::new(),
                    candidates: next,
                    tier: "third".to_string(),
                });
            }
            // EN: Complete second with no third fixed tokens — no sibling-head menu.
            return None;
        }
        let raw_second = second_token_heads(canonical);
        let mut cands = prefix_filter(&raw_second, &prefix);
        if second_complete {
            let second_lc = second_word.to_ascii_lowercase();
            cands.retain(|c| c.to_ascii_lowercase() != second_lc);
        }
        if cands.is_empty() {
            return None;
        }
        return Some(CompleteHit {
            token_start: l,
            token_end: r,
            prefix,
            candidates: cands,
            tier: "second".to_string(),
        });
    }

    if token_index == 2 {
        let Some(second_tok) = tokens_before.get(1).copied() else {
            return None;
        };
        let second = second_tok.to_ascii_lowercase();
        let all_third = third_token_candidates(canonical, &second);
        if all_third.is_empty() {
            return None;
        }
        let cands = prefix_filter(&all_third, &prefix);
        if cands.is_empty() {
            return None;
        }
        return Some(CompleteHit {
            token_start: l,
            token_end: r,
            prefix,
            candidates: cands,
            tier: "third".to_string(),
        });
    }

    None
}

/**
 * EN: First unquoted single `|` (pipe), not `||`. Byte index of the bar.
 * JA: クォート外の単独 `|`（`||` は除外）。バーのバイト位置。
 */
fn first_pipe_byte_index(line: &str) -> Option<usize> {
    let bytes = line.as_bytes();
    let mut i = 0;
    let mut in_single = false;
    let mut in_double = false;
    while i < bytes.len() {
        let b = bytes[i];
        if in_single {
            if b == b'\'' {
                in_single = false;
            }
            i += 1;
            continue;
        }
        if in_double {
            if b == b'\\' && i + 1 < bytes.len() {
                i += 2;
                continue;
            }
            if b == b'"' {
                in_double = false;
            }
            i += 1;
            continue;
        }
        match b {
            b'\'' => {
                in_single = true;
                i += 1;
            }
            b'"' => {
                in_double = true;
                i += 1;
            }
            b'|' => {
                if i + 1 < bytes.len() && bytes[i + 1] == b'|' {
                    i += 2;
                    continue;
                }
                return Some(i);
            }
            _ => i += 1,
        }
    }
    None
}

/**
 * EN: Resolve fixed-token candidates for the token under `cursor`, then merge
 *     `| browse`… when the stage is a list producer with `-list` (extension-aligned).
 *     On/after `|`, complete bare pipe-consumer names (`browse`, `close`, …).
 * Returns `None` when no fixed-token menu applies (host may add live browser candidates).
 */
pub fn complete_line(line: &str, cursor: usize) -> Option<CompleteHit> {
    let cursor = clamp_to_char_boundary(line, cursor);
    let hit = complete_line_fixed(line, cursor);
    if let Some(pipe_at) = first_pipe_byte_index(line) {
        if cursor >= pipe_at {
            return complete_pipe_rhs(line, cursor, pipe_at);
        }
        let stage = &line[..pipe_at];
        return apply_pipe_continuation_candidates(hit, stage, cursor);
    }
    apply_pipe_continuation_candidates(hit, line, cursor)
}

/** EN: True when `token` is a pipe-continuation menu candidate (`| browse`, …). */
pub fn is_pipe_continuation_token(token: &str) -> bool {
    is_pipe_continuation_candidate(token)
}

pub fn complete_json(line: &str, cursor: usize) -> String {
    match complete_line(line, cursor) {
        Some(hit) => serde_json::to_string(&hit).unwrap_or_else(|_| "null".to_string()),
        None => "null".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn completes_first_token_prefix() {
        let hit = complete_line("ta", 2).expect("hit");
        assert_eq!(hit.tier, "first");
        assert!(hit.candidates.iter().any(|c| c == "tab"));
    }

    #[test]
    fn completes_second_after_tabs_space() {
        let line = "tab ";
        let hit = complete_line(line, line.len()).expect("hit");
        assert_eq!(hit.tier, "second");
        assert!(hit.candidates.iter().any(|c| c == "-list"));
    }

    #[test]
    fn completes_second_for_complete_first_without_trailing_space() {
        let line = "tab";
        let hit = complete_line(line, line.len()).expect("hit");
        assert_eq!(hit.tier, "second");
        assert!(hit.candidates.iter().any(|c| c == "-list"));
        assert!(hit.candidates.iter().any(|c| c == "-nowurl"));
    }

    #[test]
    fn completes_third_after_tabs_list() {
        let line = "tab -list ";
        let hit = complete_line(line, line.len()).expect("hit");
        assert_eq!(hit.tier, "third");
        assert!(hit.candidates.iter().any(|c| c == "-url"));
        assert!(hit.candidates.iter().any(|c| c == "--device"));
        assert!(hit.candidates.iter().any(|c| c == "--peers"));
        assert!(hit.candidates.iter().any(|c| c == "| browse"));
    }

    #[test]
    fn offers_pipe_continuation_after_tab_list_peers() {
        let line = "tab -list --peers ";
        let hit = complete_line(line, line.len()).expect("hit");
        assert_eq!(hit.tier, "third");
        assert!(hit.candidates.iter().any(|c| c == "| browse"));
        assert!(hit.candidates.iter().any(|c| c == "| close"));
        assert!(hit.candidates.iter().any(|c| c == "| c"));
    }

    #[test]
    fn offers_pipe_continuation_for_setting_list_at_eol() {
        let line = "setting -list";
        let hit = complete_line(line, line.len()).expect("hit");
        assert_eq!(hit.tier, "third");
        assert_eq!(hit.token_start, line.len());
        assert!(hit.candidates.iter().any(|c| c == "| browse"));
        assert!(!hit.candidates.iter().any(|c| c == "-list"));
    }

    #[test]
    fn match_pipe_continuation_filters_pipe_prefix() {
        let all = list_pipe_continuation_candidate_tokens();
        let filtered = match_pipe_continuation_candidates(&all, "|");
        assert!(filtered.iter().all(|c| c.starts_with("| ")));
        assert!(filtered.iter().any(|c| c == "| browse"));
    }

    #[test]
    fn completes_pipe_rhs_consumer_after_bar() {
        let line = "tab -list --peers | b";
        let hit = complete_line(line, line.len()).expect("hit");
        assert!(hit.candidates.iter().any(|c| c == "browse"));
        assert!(!hit.candidates.iter().any(|c| c.starts_with("| ")));
    }

    #[test]
    fn completes_pipe_rhs_all_when_bar_only() {
        let line = "tab -list | ";
        let hit = complete_line(line, line.len()).expect("hit");
        assert!(hit.candidates.iter().any(|c| c == "browse"));
        assert!(hit.candidates.iter().any(|c| c == "close"));
    }

    #[test]
    fn no_hit_when_pipe_rhs_consumer_already_complete() {
        let line = "tab -list | browse";
        assert!(complete_line(line, line.len()).is_none());
    }

    #[test]
    fn no_pipe_continuation_while_typing_dash_option() {
        let line = "tab -list -u";
        let hit = complete_line(line, line.len()).expect("hit");
        assert!(hit.candidates.iter().any(|c| c == "-url"));
        assert!(!hit.candidates.iter().any(|c| is_pipe_continuation_token(c)));
    }

    #[test]
    fn no_hit_on_empty_first_prefix() {
        assert!(complete_line("", 0).is_none());
        assert!(complete_line("   ", 3).is_none());
    }

    #[test]
    fn no_hit_when_tab_nowurl_complete_at_eol() {
        let line = "tab -nowurl";
        assert!(complete_line(line, line.len()).is_none());
    }

    #[test]
    fn still_completes_partial_tab_second() {
        let line = "tab -no";
        let hit = complete_line(line, line.len()).expect("hit");
        assert_eq!(hit.tier, "second");
        assert!(hit.candidates.iter().any(|c| c == "-nowurl"));
    }

    #[test]
    fn still_completes_partial_nav_windowclose() {
        let line = "nav -wi";
        let hit = complete_line(line, line.len()).expect("hit");
        assert_eq!(hit.tier, "second");
        assert!(hit.candidates.iter().any(|c| c == "-windowclose"));
    }

    #[test]
    fn does_not_panic_on_mid_utf8_cursor_inside_cjk() {
        let line = "search -list --all リスト | browse";
        // EN: JS UTF-16 indexes 20/21 land mid-character if mistaken for UTF-8 bytes.
        let _ = complete_line(line, 20);
        let _ = complete_line(line, 21);
        let json = complete_json(line, 20);
        assert!(json == "null" || json.starts_with('{'));
    }

    #[test]
    fn completes_safely_at_cjk_char_boundaries() {
        let line = "search -list --all リスト | browse";
        let start_of_pattern = "search -list --all ".len();
        assert!(line.is_char_boundary(start_of_pattern));
        // EN: Still on producer stage — `| browse`… may appear (extension offer zone).
        let hit = complete_line(line, start_of_pattern);
        if let Some(h) = hit {
            assert!(h.candidates.iter().any(|c| c == "| browse"));
        }
        // EN: Cursor on RHS after `|` — no left-stage pipe-continuation merge.
        assert!(complete_line(line, line.len()).is_none());
    }
}
