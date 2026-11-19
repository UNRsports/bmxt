//! EN: Mesh planning helpers (mirrors extension `mesh/mesh-plan.ts`).
//! JA: メッシュ計画ヘルパ（拡張 `mesh/mesh-plan.ts` と同等）。

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MeshPeerAnnounce {
    pub device_id: String,
    pub display_name: String,
}

/** EN: Deterministic Perfect-Negotiation-style role from device ids (ASCII order). */
pub fn connect_role_for_peer(local_device_id: &str, remote_device_id: &str) -> &'static str {
    if local_device_id < remote_device_id {
        "offer"
    } else {
        "answer"
    }
}

/**
 * EN: Peers we should create a directed mesh offer toward (deterministic offerer only).
 * JA: メッシュ directed offer を出すべき peer（辞書順で offer 側のみ）。
 */
pub fn peers_to_offer_mesh(
    self_device_id: &str,
    announced: &[MeshPeerAnnounce],
    already_connected_or_busy: &std::collections::HashSet<String>,
) -> Vec<MeshPeerAnnounce> {
    let mut out = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for peer in announced {
        let id = peer.device_id.trim();
        if id.is_empty() || id == self_device_id {
            continue;
        }
        if seen.contains(id) || already_connected_or_busy.contains(id) {
            continue;
        }
        seen.insert(id.to_string());
        if connect_role_for_peer(self_device_id, id) != "offer" {
            continue;
        }
        let display_name = if peer.display_name.trim().is_empty() {
            id.to_string()
        } else {
            peer.display_name.trim().to_string()
        };
        out.push(MeshPeerAnnounce {
            device_id: id.to_string(),
            display_name,
        });
    }
    out
}

/**
 * EN: Other live peers to advertise to a newly connected neighbor (exclude self + neighbor).
 * JA: 新規接続相手へ広告する他の生存 peer（自分と相手は除外）。
 */
pub fn peers_to_announce(
    self_device_id: &str,
    neighbor_device_id: &str,
    connected_ids: &[String],
) -> Vec<MeshPeerAnnounce> {
    let mut out = Vec::new();
    for id in connected_ids {
        if id == self_device_id || id == neighbor_device_id || id == "pending-offer" {
            continue;
        }
        out.push(MeshPeerAnnounce {
            device_id: id.clone(),
            display_name: id.clone(),
        });
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn only_lexicographically_smaller_offers() {
        let targets = peers_to_offer_mesh(
            "aaa",
            &[
                MeshPeerAnnounce {
                    device_id: "bbb".into(),
                    display_name: "B".into(),
                },
                MeshPeerAnnounce {
                    device_id: "000".into(),
                    display_name: "Z".into(),
                },
            ],
            &HashSet::new(),
        );
        assert_eq!(
            targets
                .iter()
                .map(|t| t.device_id.as_str())
                .collect::<Vec<_>>(),
            vec!["bbb"]
        );
    }

    #[test]
    fn skips_busy_peers() {
        let mut busy = HashSet::new();
        busy.insert("bbb".into());
        let targets = peers_to_offer_mesh(
            "aaa",
            &[MeshPeerAnnounce {
                device_id: "bbb".into(),
                display_name: "B".into(),
            }],
            &busy,
        );
        assert!(targets.is_empty());
    }

    #[test]
    fn announce_excludes_self_and_neighbor() {
        let peers = peers_to_announce(
            "self",
            "n1",
            &["self".into(), "n1".into(), "n2".into(), "pending-offer".into()],
        );
        assert_eq!(
            peers,
            vec![MeshPeerAnnounce {
                device_id: "n2".into(),
                display_name: "n2".into(),
            }]
        );
    }
}
