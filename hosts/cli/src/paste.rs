use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Result};
use bmxt_family::extract_rtc_handshake_code;

/** EN: Write a browser-compatible handshake JSON ticket; returns absolute path. */
pub fn write_handshake_ticket(role: &str, code: &str) -> Result<PathBuf> {
    let dir = dirs::config_dir()
        .ok_or_else(|| anyhow!("no config dir"))?
        .join("bmxt");
    fs::create_dir_all(&dir)?;
    let stamp = chrono::Local::now().format("%Y%m%d-%H%M%S");
    let path = dir.join(format!("bmxt-{stamp}-{role}.json"));
    let doc = serde_json::json!({
        "v": 1,
        "kind": "bmxt-rtc-handshake",
        "role": role,
        "code": code,
    });
    fs::write(&path, format!("{}\n", serde_json::to_string_pretty(&doc)?))?;
    Ok(path)
}

/**
 * EN: Read a handshake paste from stdin or `@path` / path to `.json`.
 *     Prefer `@file.json` — terminals often corrupt long bare `bmxt-rtc1.` pastes.
 * JA: stdin または `@path` / `.json` から握手コードを読む。
 *     長文の素貼付は端末で化けやすいので `@file.json` を推奨。
 */
pub fn read_handshake_paste(prompt: &str) -> Result<String> {
    print!("{prompt}");
    io::stdout().flush()?;
    let mut first = String::new();
    io::stdin().read_line(&mut first)?;
    let first_trim = first.trim();
    if first_trim.is_empty() {
        return Err(anyhow!("empty paste"));
    }

    // EN: `@file` or path ending in .json → read file body.
    let path_candidate = first_trim.strip_prefix('@').unwrap_or(first_trim);
    if (path_candidate.ends_with(".json") || first_trim.starts_with('@'))
        && Path::new(path_candidate).is_file()
    {
        let body = fs::read_to_string(path_candidate)?;
        return extract_rtc_handshake_code(&body)
            .ok_or_else(|| anyhow!("no bmxt-rtc1. code found in {}", path_candidate));
    }

    let mut buf = first;
    if let Some(code) = extract_rtc_handshake_code(&buf) {
        let compact: String = buf.chars().filter(|c| !c.is_whitespace()).collect();
        // EN: Bare code line (not a JSON object) — done after one line.
        if compact.starts_with("bmxt-rtc1.") && !compact.starts_with('{') {
            return Ok(code);
        }
    }

    eprintln!("(multi-line paste — finish with an empty line)");
    loop {
        let mut line = String::new();
        io::stdin().read_line(&mut line)?;
        if line.trim().is_empty() {
            break;
        }
        buf.push_str(&line);
    }

    extract_rtc_handshake_code(&buf)
        .ok_or_else(|| anyhow!("no bmxt-rtc1. code found in paste (JSON ticket or bare code)"))
}
