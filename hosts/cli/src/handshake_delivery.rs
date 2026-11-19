//! EN: Ask code vs file for outbound sync tickets; remember delivery + directory.
//! JA: sync 送信チケットのコード／ファイル選択と、配送方法・保存先の記憶。

use std::io::{self, Write};
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};

use crate::config::CliConfig;
use crate::msgs::t_cli;
use crate::paste;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HandshakeDelivery {
    Code,
    File,
}

pub fn parse_delivery_token(raw: &str) -> Option<HandshakeDelivery> {
    match raw.trim().to_ascii_lowercase().as_str() {
        "code" | "c" | "1" => Some(HandshakeDelivery::Code),
        "file" | "f" | "2" => Some(HandshakeDelivery::File),
        _ => None,
    }
}

pub fn delivery_token(mode: HandshakeDelivery) -> &'static str {
    match mode {
        HandshakeDelivery::Code => "code",
        HandshakeDelivery::File => "file",
    }
}

fn read_line_prompt(prompt: &str) -> Result<String> {
    print!("{prompt}");
    io::stdout().flush()?;
    let mut buf = String::new();
    io::stdin().read_line(&mut buf)?;
    Ok(buf.trim().to_string())
}

/**
 * EN: Resolve delivery mode — remembered preference, else ask and persist.
 * JA: 配送方法を解決。記憶があればそれを使い、なければ尋ねて保存する。
 */
pub fn resolve_delivery_mode(cfg: &mut CliConfig) -> Result<HandshakeDelivery> {
    if let Some(raw) = cfg.handshake_delivery.as_deref() {
        if let Some(mode) = parse_delivery_token(raw) {
            return Ok(mode);
        }
    }
    println!("{}", t_cli("cmd.cli.handshake.askDelivery", &[]));
    loop {
        let answer = read_line_prompt(&t_cli("cmd.cli.handshake.askDeliveryPrompt", &[]))?;
        if let Some(mode) = parse_delivery_token(&answer) {
            cfg.handshake_delivery = Some(delivery_token(mode).to_string());
            cfg.touch();
            cfg.save()?;
            println!(
                "{}",
                t_cli(
                    "cmd.cli.handshake.deliveryRemembered",
                    &[("mode", delivery_token(mode))]
                )
            );
            return Ok(mode);
        }
        println!("{}", t_cli("cmd.cli.handshake.askDeliveryRetry", &[]));
    }
}

fn default_ticket_dir() -> Result<PathBuf> {
    CliConfig::config_dir()
}

/**
 * EN: Confirm ticket directory (Enter keeps current/default), create it, remember path.
 * JA: チケット保存先を確認（Enter で現状／既定）。作成して記憶する。
 */
pub fn resolve_ticket_dir(cfg: &mut CliConfig) -> Result<PathBuf> {
    let suggested = cfg
        .handshake_ticket_dir
        .as_ref()
        .map(PathBuf::from)
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or(default_ticket_dir()?);
    let suggested_display = suggested.display().to_string();
    println!(
        "{}",
        t_cli(
            "cmd.cli.handshake.askTicketDir",
            &[("dir", suggested_display.as_str())]
        )
    );
    let answer = read_line_prompt(&t_cli("cmd.cli.handshake.askTicketDirPrompt", &[]))?;
    let dir = if answer.is_empty() {
        suggested
    } else {
        let expanded = expand_user_path(&answer);
        PathBuf::from(expanded)
    };
    std::fs::create_dir_all(&dir)
        .with_context(|| format!("create ticket dir {}", dir.display()))?;
    let canonical = dir.canonicalize().unwrap_or(dir);
    cfg.handshake_ticket_dir = Some(canonical.display().to_string());
    cfg.touch();
    cfg.save()?;
    println!(
        "{}",
        t_cli(
            "cmd.cli.handshake.ticketDirRemembered",
            &[("dir", &canonical.display().to_string())]
        )
    );
    Ok(canonical)
}

fn expand_user_path(raw: &str) -> String {
    let trimmed = raw.trim();
    if let Some(rest) = trimmed.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest).display().to_string();
        }
    }
    if trimmed == "~" {
        if let Some(home) = dirs::home_dir() {
            return home.display().to_string();
        }
    }
    trimmed.to_string()
}

/**
 * EN: Deliver outbound invite / offer / answer via code print or ticket file.
 * JA: 招待／offer／answer をコード表示またはチケットファイルで渡す。
 */
pub fn deliver_outbound_code(cfg: &mut CliConfig, role: &str, code: &str) -> Result<()> {
    match resolve_delivery_mode(cfg)? {
        HandshakeDelivery::Code => {
            println!("{}", t_cli("cmd.cli.handshake.codeHeader", &[("role", role)]));
            println!("{code}\n");
            Ok(())
        }
        HandshakeDelivery::File => {
            let dir = resolve_ticket_dir(cfg)?;
            let path = write_ticket_file(&dir, role, code)?;
            println!("{}", t_cli("cmd.cli.handshake.fileHeader", &[("role", role)]));
            paste::print_path_hyperlink(&path);
            println!("{}", t_cli("cmd.cli.handshake.fileHint", &[]));
            Ok(())
        }
    }
}

fn write_ticket_file(dir: &Path, role: &str, code: &str) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let stamp = chrono::Local::now().format("%Y%m%d-%H%M%S");
    let path = dir.join(format!("bmxt-{stamp}-{role}.json"));
    let doc = if role == "invite" {
        serde_json::json!({
            "v": 1,
            "kind": "bmxt-family-invite",
            "code": code,
        })
    } else {
        serde_json::json!({
            "v": 1,
            "kind": "bmxt-rtc-handshake",
            "role": role,
            "code": code,
        })
    };
    std::fs::write(&path, format!("{}\n", serde_json::to_string_pretty(&doc)?))
        .with_context(|| format!("write {}", path.display()))?;
    Ok(path)
}

/** EN: Validate path for `setting -set handshake-ticket-dir`. */
pub fn set_ticket_dir(cfg: &mut CliConfig, raw: &str) -> Result<PathBuf> {
    let expanded = expand_user_path(raw);
    if expanded.is_empty() {
        return Err(anyhow!("empty handshake-ticket-dir"));
    }
    let dir = PathBuf::from(&expanded);
    std::fs::create_dir_all(&dir)
        .with_context(|| format!("create ticket dir {}", dir.display()))?;
    let canonical = dir.canonicalize().unwrap_or(dir);
    cfg.handshake_ticket_dir = Some(canonical.display().to_string());
    cfg.touch();
    cfg.save()?;
    Ok(canonical)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeliverySettingResult {
    Mode(HandshakeDelivery),
    AskNextTime,
}

pub fn set_delivery_mode(cfg: &mut CliConfig, raw: &str) -> Result<DeliverySettingResult> {
    let lower = raw.trim().to_ascii_lowercase();
    if lower == "ask" || lower == "clear" {
        cfg.handshake_delivery = None;
        cfg.touch();
        cfg.save()?;
        return Ok(DeliverySettingResult::AskNextTime);
    }
    let mode = parse_delivery_token(raw).ok_or_else(|| {
        anyhow!("invalid handshake-delivery (use code | file | ask)")
    })?;
    cfg.handshake_delivery = Some(delivery_token(mode).to_string());
    cfg.touch();
    cfg.save()?;
    Ok(DeliverySettingResult::Mode(mode))
}
