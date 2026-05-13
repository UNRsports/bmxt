//! 入力行のトークン化と URL 候補の判定（dispatch / tabs サブコマンド共通）。

/// EN: Strip BOM / ZWSP / bidi marks IMEs may insert inside or around tokens (e.g. `-page\u{200b}`).
/// JA: IME 等がトークン内外に挿す BOM・ZWSP・双方向制御などを除去（例: `-page\u{200b}`）。
pub fn strip_invisible_format_chars(s: &str) -> String {
    s.chars()
        .filter(|c| {
            !matches!(
                *c,
                '\u{feff}' // BOM
                    | '\u{200b}' // ZWSP
                    | '\u{200e}'
                    | '\u{200f}'
                    | '\u{202a}'
                    | '\u{202b}'
                    | '\u{202c}'
                    | '\u{202d}'
                    | '\u{202e}'
                    | '\u{2066}'
                    | '\u{2067}'
                    | '\u{2068}'
                    | '\u{2069}'
            )
        })
        .collect()
}

pub fn tokenize(line: &str) -> Vec<String> {
    line.trim()
        .split_whitespace()
        .map(|w| strip_invisible_format_chars(w.trim()))
        .filter(|s| !s.is_empty())
        .collect()
}

pub fn parse_http_url_candidate(inner: &str) -> Option<String> {
    let t = inner.trim();
    if t.is_empty() || t.chars().any(|c| c.is_whitespace()) {
        return None;
    }
    let lower = t.to_ascii_lowercase();
    if !lower.starts_with("http://") && !lower.starts_with("https://") {
        return None;
    }
    Some(t.to_string())
}

#[cfg(test)]
mod tests {
    use super::{strip_invisible_format_chars, tokenize};

    #[test]
    fn tokenize_strips_zwsp_glued_to_flag() {
        let v = tokenize(concat!("grep -page", "\u{200b}", " 変わる"));
        assert_eq!(v, vec!["grep", "-page", "変わる"]);
    }

    #[test]
    fn strip_removes_bom_prefix() {
        assert_eq!(
            strip_invisible_format_chars(concat!("\u{feff}", "grep")),
            "grep"
        );
    }
}
