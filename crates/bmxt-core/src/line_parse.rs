const INVISIBLE_FORMAT_CHARS: &[char] = &[
    '\u{FEFF}',
    '\u{200B}',
    '\u{200E}',
    '\u{200F}',
    '\u{202A}',
    '\u{202B}',
    '\u{202C}',
    '\u{202D}',
    '\u{202E}',
    '\u{2066}',
    '\u{2067}',
    '\u{2068}',
    '\u{2069}',
];

/// Strip invisible directional / format chars (same unicode set as TS).
pub fn strip_invisible_format_chars(s: &str) -> String {
    s.chars()
        .filter(|c| !INVISIBLE_FORMAT_CHARS.contains(c))
        .collect()
}

pub fn tokenize(line: &str) -> Vec<String> {
    line.trim()
        .split_whitespace()
        .map(|w| strip_invisible_format_chars(w.trim()))
        .filter(|s| !s.is_empty())
        .map(String::from)
        .collect()
}

pub fn parse_http_url_candidate(inner: &str) -> Option<String> {
    let t = inner.trim();
    if t.is_empty() || t.contains(char::is_whitespace) {
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
    use super::*;

    #[test]
    fn tokenize_splits_whitespace() {
        assert_eq!(tokenize("  tab  -list  "), vec!["tab", "-list"]);
    }

    #[test]
    fn strip_invisible_format_chars_removes_bom() {
        assert_eq!(strip_invisible_format_chars("\u{FEFF}tab"), "tab");
    }

    #[test]
    fn parse_http_url_candidate_accepts_https() {
        assert_eq!(
            parse_http_url_candidate("https://example.com"),
            Some("https://example.com".to_string())
        );
    }

    #[test]
    fn parse_http_url_candidate_rejects_non_http() {
        assert_eq!(parse_http_url_candidate("ftp://x"), None);
    }
}
