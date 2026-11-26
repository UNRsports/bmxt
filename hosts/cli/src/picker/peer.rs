//! EN: Connected-peer one-shot picker (ratatui). Replaces stdin number pick.
//! JA: 接続 peer のワンショット picker（番号入力の置換）。

use anyhow::{anyhow, Result};

use crate::msgs::t_cli;
use crate::picker::oneshot;

/**
 * EN: Pick one connected peer device id. One peer → auto-select.
 * JA: 接続 peer の device id を1つ選ぶ。1台なら自動確定。
 */
pub fn pick_peer(peers: &[(String, String)]) -> Result<String> {
    if peers.is_empty() {
        return Err(anyhow!(t_cli("cmd.cli.device.noPeers", &[])));
    }
    let choices: Vec<(String, String)> = peers
        .iter()
        .map(|(id, name)| {
            let label = if name.is_empty() {
                format!("{id}")
            } else {
                format!("{name}  ({id})")
            };
            (id.clone(), label)
        })
        .collect();
    oneshot::pick_labeled_once(&t_cli("cmd.cli.picker.peerTitle", &[]), &choices)
}
