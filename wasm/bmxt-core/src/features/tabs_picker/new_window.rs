use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewWindowTabMeta {
    pub id: i32,
    pub window_id: i32,
    pub index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveNewWindowOrderContext {
    pub tabs: Vec<NewWindowTabMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedNewWindowOrder {
    pub ordered_ids: Vec<i32>,
}

pub fn resolve_new_window_order(ctx: ResolveNewWindowOrderContext) -> ResolvedNewWindowOrder {
    let mut tabs = ctx.tabs;
    tabs.sort_by(|a, b| {
        a.window_id
            .cmp(&b.window_id)
            .then_with(|| a.index.cmp(&b.index))
            .then_with(|| a.id.cmp(&b.id))
    });
    ResolvedNewWindowOrder {
        ordered_ids: tabs.into_iter().map(|t| t.id).collect(),
    }
}
