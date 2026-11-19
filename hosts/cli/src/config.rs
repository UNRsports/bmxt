use std::fs;
use std::path::PathBuf;

use anyhow::{anyhow, Context, Result};
use bmxt_family::{bytes_to_base64url, generate_family_seed};
use rand::RngCore;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliConfig {
    pub device_id: String,
    pub display_name: String,
    pub family_id: Option<String>,
    pub seed_b64: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    /// EN: Remembered outbound handshake delivery: `code` | `file`. Missing → ask.
    /// JA: 送信握手の配送方法の記憶。`code` | `file`。未設定なら毎回尋ねる。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub handshake_delivery: Option<String>,
    /// EN: Remembered directory for handshake / invite ticket files.
    /// JA: 握手・招待チケットの保存先ディレクトリ。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub handshake_ticket_dir: Option<String>,
}

impl CliConfig {
    pub fn config_dir() -> Result<PathBuf> {
        let base = dirs::config_dir().ok_or_else(|| anyhow!("no config dir"))?;
        Ok(base.join("bmxt"))
    }

    pub fn config_path() -> Result<PathBuf> {
        Ok(Self::config_dir()?.join("config.json"))
    }

    pub fn load_or_create() -> Result<Self> {
        let path = Self::config_path()?;
        if path.is_file() {
            let raw = fs::read_to_string(&path).with_context(|| format!("read {}", path.display()))?;
            let cfg: CliConfig = serde_json::from_str(&raw)?;
            return Ok(cfg);
        }
        let mut id_bytes = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut id_bytes);
        let device_id = bytes_to_base64url(&id_bytes);
        let short = device_id.chars().take(6).collect::<String>();
        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let cfg = CliConfig {
            device_id: device_id.clone(),
            display_name: format!("terminal@{short}"),
            family_id: None,
            seed_b64: None,
            created_at: now.clone(),
            updated_at: now,
            handshake_delivery: None,
            handshake_ticket_dir: None,
        };
        cfg.save()?;
        Ok(cfg)
    }

    pub fn save(&self) -> Result<()> {
        let dir = Self::config_dir()?;
        fs::create_dir_all(&dir)?;
        let path = Self::config_path()?;
        let raw = serde_json::to_string_pretty(self)?;
        fs::write(&path, raw).with_context(|| format!("write {}", path.display()))?;
        Ok(())
    }

    pub fn ensure_family(&mut self) -> Result<()> {
        if self.family_id.is_some() && self.seed_b64.is_some() {
            return Ok(());
        }
        let (family_id, seed_b64) = generate_family_seed();
        self.family_id = Some(family_id);
        self.seed_b64 = Some(seed_b64);
        self.touch();
        self.save()?;
        Ok(())
    }

    pub fn join_family(&mut self, family_id: String, seed_b64: String) -> Result<()> {
        self.family_id = Some(family_id);
        self.seed_b64 = Some(seed_b64);
        self.touch();
        self.save()?;
        Ok(())
    }

    pub fn touch(&mut self) {
        self.updated_at = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    }

    pub fn require_family(&self) -> Result<(&str, &str)> {
        let family_id = self
            .family_id
            .as_deref()
            .ok_or_else(|| anyhow!("not in a Family — run: bmxt sync pair <invite> or sync setup"))?;
        let seed = self
            .seed_b64
            .as_deref()
            .ok_or_else(|| anyhow!("missing Family seed"))?;
        Ok((family_id, seed))
    }
}
