//! EN: Parse `bookmark -send` / SyncBookmarkSend trailing payload.
//! JA: `bookmark -send` / SyncBookmarkSend の trailing payload を解釈する。

const MAX_URLS: usize = 20;
const MAX_GROUP_TITLE_LEN: usize = 64;
const MAX_PARENT_ID_LEN: usize = 64;

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
pub struct ParsedBookmarkSendPayload {
    pub urls: Vec<String>,
    pub group_title: Option<String>,
    pub parent_id: Option<String>,
}

/**
 * EN: Split payload tokens; keep http(s) URLs; honor `--group` / `--parent`.
 * JA: トークン分割。http(s) URL のみ残し、`--group` / `--parent` を解釈する。
 */
pub fn parse_bookmark_send_payload(payload: &str) -> ParsedBookmarkSendPayload {
    let parts: Vec<&str> = payload.split_whitespace().filter(|p| !p.is_empty()).collect();
    let mut group_title: Option<String> = None;
    let mut parent_id: Option<String> = None;
    let mut urls: Vec<String> = Vec::new();
    let mut i = 0;
    while i < parts.len() {
        let part = parts[i];
        if part == "--group" && i + 1 < parts.len() {
            group_title = sanitize_group_title(parts[i + 1]);
            i += 2;
            continue;
        }
        if part == "--parent" && i + 1 < parts.len() {
            parent_id = sanitize_parent_id(parts[i + 1]);
            i += 2;
            continue;
        }
        if let Some(url) = parse_http_url_candidate(part) {
            if urls.len() < MAX_URLS {
                urls.push(url);
            }
        }
        i += 1;
    }
    ParsedBookmarkSendPayload {
        urls,
        group_title,
        parent_id,
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

fn sanitize_parent_id(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_PARENT_ID_LEN {
        return None;
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return None;
    }
    Some(trimmed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_urls_group_and_parent() {
        let parsed = parse_bookmark_send_payload(
            "https://a.example/ https://b.example/ --group MyGroup --parent folder1",
        );
        assert_eq!(
            parsed.urls,
            vec![
                "https://a.example/".to_string(),
                "https://b.example/".to_string()
            ]
        );
        assert_eq!(parsed.group_title.as_deref(), Some("MyGroup"));
        assert_eq!(parsed.parent_id.as_deref(), Some("folder1"));
    }
}
