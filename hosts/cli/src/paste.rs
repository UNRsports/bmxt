use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::Command;

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
 * EN: Print a path as an OSC-8 terminal hyperlink (`file://…`) when the terminal supports it.
 *     Clicking opens the file (or its folder) — it does **not** open a file-picker dialog.
 * JA: 端末が対応していれば OSC-8 ハイパーリンク（`file://…`）としてパスを出す。
 *     クリックでファイルを開く。ファイル選択ダイアログは起動しない。
 */
pub fn print_path_hyperlink(path: &Path) {
    let abs = path
        .canonicalize()
        .unwrap_or_else(|_| path.to_path_buf());
    let url = format!("file://{}", abs.display());
    // EN: OSC 8 hyperlink — BEL terminator is widely accepted.
    print!("\x1b]8;;{url}\x07");
    print!("{}", abs.display());
    println!("\x1b]8;;\x07");
}

fn default_handshake_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("bmxt"))
}

/**
 * EN: GUI file dialog via zenity / kdialog (no native GUI crate build deps).
 * JA: zenity / kdialog による GUI ファイル選択（ネイティブ GUI crate のビルド依存なし）。
 */
pub fn pick_handshake_file(title: &str) -> Result<PathBuf> {
    let start = default_handshake_dir();
    if let Some(path) = try_zenity_pick(title, start.as_deref())? {
        return Ok(path);
    }
    if let Some(path) = try_kdialog_pick(title, start.as_deref())? {
        return Ok(path);
    }
    Err(anyhow!(
        "no GUI file dialog available (install `zenity` or `kdialog`), or pass @/path/to/file.json"
    ))
}

fn try_zenity_pick(title: &str, start: Option<&Path>) -> Result<Option<PathBuf>> {
    let mut cmd = Command::new("zenity");
    cmd.arg("--file-selection")
        .arg("--title")
        .arg(title)
        .arg("--file-filter")
        .arg("BMXt handshake | *.json")
        .arg("--file-filter")
        .arg("All | *");
    if let Some(dir) = start {
        if dir.is_dir() {
            cmd.arg("--filename")
                .arg(format!("{}/", dir.display()));
        }
    }
    match cmd.output() {
        Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(anyhow!("zenity failed: {err}")),
        Ok(out) => {
            if !out.status.success() {
                // EN: Cancel → non-zero without treating as hard failure when user aborted.
                if out.status.code() == Some(1) {
                    return Err(anyhow!("file dialog cancelled"));
                }
                return Ok(None);
            }
            let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if path.is_empty() {
                return Err(anyhow!("file dialog cancelled"));
            }
            Ok(Some(PathBuf::from(path)))
        }
    }
}

fn try_kdialog_pick(title: &str, start: Option<&Path>) -> Result<Option<PathBuf>> {
    let mut cmd = Command::new("kdialog");
    cmd.arg("--getopenfilename");
    if let Some(dir) = start {
        if dir.is_dir() {
            cmd.arg(dir);
        } else {
            cmd.arg(".");
        }
    } else {
        cmd.arg(".");
    }
    cmd.arg("*.json|BMXt handshake\n*|All files").arg("--title").arg(title);
    match cmd.output() {
        Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(anyhow!("kdialog failed: {err}")),
        Ok(out) => {
            if !out.status.success() {
                if out.status.code() == Some(1) {
                    return Err(anyhow!("file dialog cancelled"));
                }
                return Ok(None);
            }
            let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if path.is_empty() {
                return Err(anyhow!("file dialog cancelled"));
            }
            Ok(Some(PathBuf::from(path)))
        }
    }
}

fn code_from_handshake_path(path: &Path) -> Result<String> {
    let body = fs::read_to_string(path)?;
    extract_rtc_handshake_code(&body)
        .ok_or_else(|| anyhow!("no bmxt-rtc1. code found in {}", path.display()))
}

/**
 * EN: Read a handshake paste from stdin or `@path` / path to `.json`, or `:pick` for GUI.
 *     Prefer `@file.json` or `:pick` — terminals often corrupt long bare `bmxt-rtc1.` pastes.
 * JA: stdin または `@path` / `.json`、あるいは GUI の `:pick` から握手コードを読む。
 *     長文の素貼付は端末で化けやすいので `@file.json` / `:pick` を推奨。
 */
pub fn read_handshake_paste(prompt: &str) -> Result<String> {
    print!("{prompt}");
    io::stdout().flush()?;
    let mut first = String::new();
    io::stdin().read_line(&mut first)?;
    let first_trim = first.trim();

    // EN: Empty Enter, `:pick`, or lone `@` → GUI file dialog (zenity/kdialog).
    if first_trim.is_empty() || first_trim == ":pick" || first_trim == "@" {
        let path = pick_handshake_file("Select BMXt handshake JSON")?;
        println!("picked: {}", path.display());
        return code_from_handshake_path(&path);
    }

    // EN: `@file` or path ending in .json → read file body.
    let path_candidate = first_trim.strip_prefix('@').unwrap_or(first_trim);
    if (path_candidate.ends_with(".json") || first_trim.starts_with('@'))
        && Path::new(path_candidate).is_file()
    {
        return code_from_handshake_path(Path::new(path_candidate));
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
