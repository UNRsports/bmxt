use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupTargetChoice {
    pub id: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveGroupTargetContext {
    pub pick_index: usize,
    pub choices: Vec<GroupTargetChoice>,
    pub new_group_sentinel: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedGroupTarget {
    pub create_new: bool,
    pub group_id: Option<i32>,
}

pub fn resolve_group_target(ctx: ResolveGroupTargetContext) -> Option<ResolvedGroupTarget> {
    let picked = ctx.choices.get(ctx.pick_index)?;
    if picked.id == ctx.new_group_sentinel {
        return Some(ResolvedGroupTarget {
            create_new: true,
            group_id: None,
        });
    }
    Some(ResolvedGroupTarget {
        create_new: false,
        group_id: Some(picked.id),
    })
}
