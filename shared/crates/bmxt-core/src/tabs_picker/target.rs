use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetRow {
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tab_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_id: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveTargetContext {
    pub move_dest_hi: i32,
    pub rows: Vec<TargetRow>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedTarget {
    pub kind: String,
    pub tab_id: Option<i64>,
    pub window_id: Option<i64>,
    pub group_id: Option<i64>,
}

pub fn resolve_target(ctx: &ResolveTargetContext) -> Option<ResolvedTarget> {
    let row = ctx.rows.get(ctx.move_dest_hi as usize)?;
    Some(ResolvedTarget {
        kind: row.kind.clone(),
        tab_id: row.tab_id,
        window_id: row.window_id,
        group_id: row.group_id,
    })
}

pub fn resolve_target_json(context_json: &str) -> String {
    match serde_json::from_str::<ResolveTargetContext>(context_json) {
        Ok(ctx) => serde_json::to_string(&resolve_target(&ctx)).unwrap_or_else(|e| {
            format!(r#"{{"error":"{}"}}"#, e)
        }),
        Err(e) => format!(r#"{{"error":"{}"}}"#, e),
    }
}
