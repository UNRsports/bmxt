use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetRow {
    pub kind: String,
    pub tab_id: Option<i32>,
    pub window_id: Option<i32>,
    pub group_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveTargetContext {
    pub move_dest_hi: usize,
    pub rows: Vec<TargetRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedTarget {
    pub kind: String,
    pub tab_id: Option<i32>,
    pub window_id: Option<i32>,
    pub group_id: Option<i32>,
}

pub fn resolve_target(ctx: ResolveTargetContext) -> Option<ResolvedTarget> {
    let row = ctx.rows.get(ctx.move_dest_hi)?;
    Some(ResolvedTarget {
        kind: row.kind.clone(),
        tab_id: row.tab_id,
        window_id: row.window_id,
        group_id: row.group_id,
    })
}
