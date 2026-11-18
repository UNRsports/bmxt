use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};

pub fn bytes_to_base64url(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

pub fn base64url_to_bytes(raw: &str) -> Option<Vec<u8>> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    for ch in trimmed.chars() {
        let ok = ch.is_ascii_alphanumeric() || ch == '-' || ch == '_';
        if !ok {
            return None;
        }
    }
    URL_SAFE_NO_PAD.decode(trimmed).ok()
}

/** EN: True when the string contains non-base64url characters (paste corruption / UTF replacement). */
pub fn base64url_looks_corrupted(raw: &str) -> bool {
    raw.chars()
        .any(|ch| !(ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch.is_whitespace()))
}
