//! Fixed-token Tab / IME completion (first–third tiers) from the generated registry.

use crate::cmd::all_completion_tokens;
use crate::generated::{is_second_token, resolve_canonical, subcommand_branches};
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

/** EN: Whitespace-delimited token bounds under `pos` (byte index; ASCII command lines). */
fn word_bounds(line: &str, pos: usize) -> (usize, usize) {
    let bytes = line.as_bytes();
    let pos = pos.min(bytes.len());
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

/**
 * EN: Resolve fixed-token candidates for the token under `cursor`.
 * Returns `None` when no fixed-token menu applies (host may add live/Chrome candidates).
 */
pub fn complete_line(line: &str, cursor: usize) -> Option<CompleteHit> {
    let cursor = cursor.min(line.len());
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
}
