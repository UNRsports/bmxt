use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewRow {
    pub kind: String,
    pub tab_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewContext {
    pub hi: usize,
    pub delta: i32,
    pub visible_len: usize,
    pub rows: Vec<PreviewRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewDecision {
    pub next_hi: usize,
    pub activate_tab_id: Option<i32>,
}

fn wrap_index(cur: usize, delta: i32, len: usize) -> usize {
    if len == 0 {
        return 0;
    }
    let l = len as i32;
    let base = cur as i32;
    let next = (base + delta).rem_euclid(l);
    next as usize
}

pub fn resolve_preview(ctx: PreviewContext) -> PreviewDecision {
    let next_hi = wrap_index(ctx.hi, ctx.delta, ctx.visible_len);
    let activate_tab_id = ctx
        .rows
        .get(next_hi)
        .and_then(|r| if r.kind == "tab" { r.tab_id } else { None });
    PreviewDecision {
        next_hi,
        activate_tab_id,
    }
}
