//! 入力行のトークン化と URL 候補の判定（dispatch / tabs サブコマンド共通）。

pub fn tokenize(line: &str) -> Vec<String> {
    line.trim()
        .split_whitespace()
        .map(|s| s.to_string())
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
