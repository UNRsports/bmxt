//! EN: Parse `tab -send` / SyncOpen trailing payload (`urls… [--group title] [--close]`).
//! JA: `tab -send` / SyncOpen の trailing payload を解釈する（拡張 `parse-open-payload.ts` 相当）。

const MAX_URLS: usize = 20;
const MAX_GROUP_TITLE_LEN: usize = 64;

/**
 * EN: Accept http(s) URL tokens only (mirrors bmxt-core `parse_http_url_candidate`).
 * JA: http(s) URL トークンのみ受理（bmxt-core `parse_http_url_candidate` 相当）。
 */
fn parse_http_url_candidate(inner: &str) -> Option<String> {
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedOpenPayload {
    pub urls: Vec<String>,
    pub group_title: Option<String>,
    pub close_after: bool,
}

/**
 * EN: Split payload tokens; keep http(s) URLs; honor `--group` / `--close`.
 * JA: トークン分割。http(s) URL のみ残し、`--group` / `--close` を解釈する。
 */
pub fn parse_open_payload(payload: &str) -> ParsedOpenPayload {
    let parts: Vec<&str> = payload.split_whitespace().filter(|p| !p.is_empty()).collect();
    let mut group_title: Option<String> = None;
    let mut close_after = false;
    let mut urls: Vec<String> = Vec::new();
    let mut i = 0;
    while i < parts.len() {
        let part = parts[i];
        if part == "--group" && i + 1 < parts.len() {
            group_title = sanitize_group_title(parts[i + 1]);
            i += 2;
            continue;
        }
        if part == "--close" {
            close_after = true;
            i += 1;
            continue;
        }
        if let Some(url) = parse_http_url_candidate(part) {
            if urls.len() < MAX_URLS {
                urls.push(url);
            }
        }
        i += 1;
    }
    ParsedOpenPayload {
        urls,
        group_title,
        close_after,
    }
}

fn sanitize_group_title(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_GROUP_TITLE_LEN {
        return None;
    }
    for ch in trimmed.chars() {
        let code = ch as u32;
        if code < 0x20 || code == 0x7f {
            return None;
        }
    }
    Some(trimmed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_urls_group_and_close() {
        let parsed = parse_open_payload(
            "https://a.example/ https://b.example/ --group MyGroup --close",
        );
        assert_eq!(
            parsed.urls,
            vec![
                "https://a.example/".to_string(),
                "https://b.example/".to_string()
            ]
        );
        assert_eq!(parsed.group_title.as_deref(), Some("MyGroup"));
        assert!(parsed.close_after);
    }

    #[test]
    fn rejects_non_http_and_caps_urls() {
        let parsed = parse_open_payload("ftp://x https://ok.example/ javascript:alert(1)");
        assert_eq!(parsed.urls, vec!["https://ok.example/".to_string()]);
        assert!(parsed.group_title.is_none());
        assert!(!parsed.close_after);
    }

    #[test]
    fn group_title_too_long_becomes_none() {
        let long = "x".repeat(MAX_GROUP_TITLE_LEN + 1);
        let payload = format!("https://ok.example/ --group {long}");
        let parsed = parse_open_payload(&payload);
        assert!(parsed.group_title.is_none());
        assert_eq!(parsed.urls, vec!["https://ok.example/".to_string()]);
    }
}
