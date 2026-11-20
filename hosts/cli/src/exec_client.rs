//! EN: `bmxt exec` client — POST /v1/exec on the resident door, emit OS FDs + exit.
//! JA: `bmxt exec` クライアント。常駐 door へ POST /v1/exec し OS FD と exit を出す。

use std::io::{self, Read};
use std::process::ExitCode;
use std::time::Duration;

use anyhow::{anyhow, Context, Result};
use bmxt_core::command_output::CommandOutput;
use bmxt_core::ir::EXIT_FAILURE;
use serde::Deserialize;

use crate::door::DOOR_PORT;
use crate::msgs::t_cli;

const EXEC_TIMEOUT: Duration = Duration::from_secs(120);
const MAX_LINE_BYTES: usize = 200_000;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExecResponseBody {
    stdout: Vec<String>,
    stderr: Vec<String>,
    exit_status: i32,
}

/**
 * EN: Resolve the grammar line from `--` argv or a single stdin line.
 * JA: `--` 引数または stdin 1 行から文法行を解決する。
 */
pub fn resolve_exec_line(args: &[String]) -> Result<String> {
    if !args.is_empty() {
        let joined = args.join(" ");
        let trimmed = joined.trim();
        if trimmed.is_empty() {
            return Err(anyhow!(t_cli("cmd.cli.exec.emptyLine", &[])));
        }
        if trimmed.len() > MAX_LINE_BYTES {
            return Err(anyhow!(t_cli("cmd.cli.exec.lineTooLong", &[])));
        }
        return Ok(trimmed.to_string());
    }
    let mut buf = String::new();
    io::stdin()
        .read_to_string(&mut buf)
        .context("read stdin for bmxt exec")?;
    let line = buf.lines().next().unwrap_or("").trim();
    if line.is_empty() {
        return Err(anyhow!(t_cli("cmd.cli.exec.emptyLine", &[])));
    }
    if line.len() > MAX_LINE_BYTES {
        return Err(anyhow!(t_cli("cmd.cli.exec.lineTooLong", &[])));
    }
    Ok(line.to_string())
}

/**
 * EN: Call resident `/v1/exec`, print channels, return process exit code.
 * JA: 常駐 `/v1/exec` を呼び、チャネルを印刷してプロセス exit を返す。
 */
pub async fn run_exec(line: &str) -> Result<ExitCode> {
    let url = format!("http://127.0.0.1:{DOOR_PORT}/v1/exec");
    let body = serde_json::json!({ "line": line });
    let client = reqwest_like_post(&url, &body).await;
    match client {
        Ok(output) => {
            emit_command_output(&output);
            Ok(exit_code_from_status(output.exit_status))
        }
        Err(err) => {
            eprintln!("{}", t_cli("cmd.cli.exec.residentMissing", &[]));
            eprintln!("error: {err:#}");
            Ok(ExitCode::from(EXIT_FAILURE as u8))
        }
    }
}

fn emit_command_output(output: &CommandOutput) {
    for line in &output.stdout {
        println!("{line}");
    }
    for line in &output.stderr {
        eprintln!("{line}");
    }
}

fn exit_code_from_status(status: i32) -> ExitCode {
    if (0..=255).contains(&status) {
        ExitCode::from(status as u8)
    } else {
        ExitCode::from(EXIT_FAILURE as u8)
    }
}

/**
 * EN: Minimal HTTP/1.1 JSON POST without adding reqwest (loopback only).
 * JA: reqwest を増やさず loopback 向け最小 HTTP/1.1 JSON POST。
 */
async fn reqwest_like_post(_url: &str, body: &serde_json::Value) -> Result<CommandOutput> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpStream;

    let payload = serde_json::to_vec(body)?;
    let mut stream = tokio::time::timeout(EXEC_TIMEOUT, TcpStream::connect("127.0.0.1:17653"))
        .await
        .map_err(|_| anyhow!("connect timeout to resident door"))?
        .context("connect to resident door")?;

    let request = format!(
        "POST /v1/exec HTTP/1.1\r\nHost: 127.0.0.1:{DOOR_PORT}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        payload.len()
    );
    stream.write_all(request.as_bytes()).await?;
    stream.write_all(&payload).await?;
    stream.flush().await?;

    let mut raw = Vec::new();
    tokio::time::timeout(EXEC_TIMEOUT, stream.read_to_end(&mut raw))
        .await
        .map_err(|_| anyhow!("read timeout from resident door"))?
        .context("read exec response")?;

    let text = String::from_utf8_lossy(&raw);
    let Some((_, header_body)) = text.split_once("\r\n\r\n") else {
        return Err(anyhow!("invalid HTTP response from resident"));
    };
    let status_line = text.lines().next().unwrap_or("");
    if !status_line.contains(" 200 ") && !status_line.ends_with(" 200") {
        // EN: Still try to parse JSON error body for stderr-friendly message.
        if let Ok(err_body) = serde_json::from_str::<serde_json::Value>(header_body.trim()) {
            if let Some(msg) = err_body.get("error").and_then(|v| v.as_str()) {
                return Err(anyhow!("{msg}"));
            }
        }
        return Err(anyhow!("resident exec HTTP {status_line}"));
    }
    let parsed: ExecResponseBody = serde_json::from_str(header_body.trim())
        .context("parse exec JSON response")?;
    Ok(CommandOutput {
        stdout: parsed.stdout,
        stderr: parsed.stderr,
        exit_status: parsed.exit_status,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_joins_argv() {
        let line = resolve_exec_line(&["tab".into(), "-list".into()]).unwrap();
        assert_eq!(line, "tab -list");
    }

    #[test]
    fn resolve_rejects_blank_argv() {
        assert!(resolve_exec_line(&["".into(), "  ".into()]).is_err());
    }
}
