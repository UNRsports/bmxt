use crate::tabs_picker::model::{
    BulkSubMode, PickerEvent, PickerState, RangeSelectInput, SelectKind,
};
use serde::Deserialize;

fn clamp_index(cur: i32, delta: i32, len: i32) -> i32 {
    if len <= 0 {
        return 0;
    }
    let max = len - 1;
    (cur + delta).clamp(0, max)
}

fn allowed_modes(kind: &SelectKind) -> &'static [BulkSubMode] {
    match kind {
        SelectKind::Window => &[
            BulkSubMode::Close,
            BulkSubMode::NewTab,
            BulkSubMode::Edit,
            BulkSubMode::Reload,
        ],
        SelectKind::Group => &[
            BulkSubMode::Move,
            BulkSubMode::Close,
            BulkSubMode::NewWindow,
            BulkSubMode::Edit,
            BulkSubMode::Reload,
        ],
        SelectKind::Tab => &[
            BulkSubMode::Move,
            BulkSubMode::Close,
            BulkSubMode::Group,
            BulkSubMode::NewWindow,
            BulkSubMode::Reload,
        ],
    }
}

fn cycle_mode(cur: Option<&BulkSubMode>, kind: &SelectKind, direction: i32) -> Option<BulkSubMode> {
    let modes = allowed_modes(kind);
    if modes.is_empty() {
        return None;
    }
    let step = if direction >= 0 { 1 } else { -1 };
    if cur.is_none() {
        return Some(if step > 0 {
            modes[0].clone()
        } else {
            modes[modes.len() - 1].clone()
        });
    }
    let cur = cur.unwrap();
    let idx = modes.iter().position(|m| m == cur).unwrap_or(0);
    let len = modes.len() as i32;
    let next = (((idx as i32 + step) % len) + len) % len;
    Some(modes[next as usize].clone())
}

fn sort_dedup_numbers(v: &mut Vec<i64>) {
    v.sort_unstable();
    v.dedup();
}

fn sort_dedup_strings(v: &mut Vec<String>) {
    v.sort_unstable();
    v.dedup();
}

pub fn reduce(state: &PickerState, ev: &PickerEvent) -> PickerState {
    let mut next = state.clone();
    next.marked_tab_ids = state.marked_tab_ids.clone();
    next.marked_window_ids = state.marked_window_ids.clone();
    next.marked_group_keys = state.marked_group_keys.clone();

    match ev {
        PickerEvent::MoveHi { delta, visible_len } => {
            next.hi = clamp_index(next.hi, *delta, *visible_len);
        }
        PickerEvent::MoveDest { delta, visible_len } => {
            next.move_dest_hi = clamp_index(next.move_dest_hi, *delta, *visible_len);
        }
        PickerEvent::CycleSubMode {
            direction,
            implicit_kind,
        } => {
            let kind = next.marked_kind.as_ref().or(implicit_kind.as_ref());
            if let Some(kind) = kind {
                next.bulk_sub_mode = cycle_mode(next.bulk_sub_mode.as_ref(), kind, *direction);
            }
        }
        PickerEvent::ToggleCurrent { row } => {
            if let Some(mk) = &next.marked_kind {
                if mk != &row.kind {
                    return state.clone();
                }
            } else {
                next.marked_kind = Some(row.kind.clone());
            }
            match &row.kind {
                SelectKind::Tab => {
                    if let Some(tab_id) = row.tab_id {
                        if let Some(i) = next.marked_tab_ids.iter().position(|&id| id == tab_id) {
                            next.marked_tab_ids.remove(i);
                        } else {
                            next.marked_tab_ids.push(tab_id);
                        }
                        sort_dedup_numbers(&mut next.marked_tab_ids);
                    }
                }
                SelectKind::Window => {
                    if let Some(window_id) = row.window_id {
                        if let Some(i) = next
                            .marked_window_ids
                            .iter()
                            .position(|&id| id == window_id)
                        {
                            next.marked_window_ids.remove(i);
                        } else {
                            next.marked_window_ids.push(window_id);
                        }
                        sort_dedup_numbers(&mut next.marked_window_ids);
                    }
                }
                SelectKind::Group => {
                    if let Some(group_key) = &row.group_key {
                        if let Some(i) = next.marked_group_keys.iter().position(|k| k == group_key)
                        {
                            next.marked_group_keys.remove(i);
                        } else {
                            next.marked_group_keys.push(group_key.clone());
                        }
                        sort_dedup_strings(&mut next.marked_group_keys);
                    }
                }
            }
            if next.marked_tab_ids.is_empty()
                && next.marked_window_ids.is_empty()
                && next.marked_group_keys.is_empty()
            {
                next.marked_kind = None;
                next.bulk_sub_mode = None;
            }
        }
        PickerEvent::SelectRange { input } => {
            let RangeSelectInput {
                anchor,
                target,
                rows,
            } = input;
            if rows.is_empty() {
                return state.clone();
            }
            let max_idx = (rows.len() as i32) - 1;
            let a = (*anchor).min(max_idx);
            let b = (*target).min(max_idx);
            let lo = a.min(b);
            let hi = a.max(b);
            let Some(first) = rows.get(lo as usize) else {
                return state.clone();
            };
            let range_kind = first.kind.clone();
            next.marked_kind = Some(range_kind.clone());
            next.marked_tab_ids.clear();
            next.marked_window_ids.clear();
            next.marked_group_keys.clear();
            for i in lo..=hi {
                let Some(r) = rows.get(i as usize) else {
                    continue;
                };
                if r.kind != range_kind {
                    continue;
                }
                match &r.kind {
                    SelectKind::Tab => {
                        if let Some(tab_id) = r.tab_id {
                            next.marked_tab_ids.push(tab_id);
                        }
                    }
                    SelectKind::Window => {
                        if let Some(window_id) = r.window_id {
                            next.marked_window_ids.push(window_id);
                        }
                    }
                    SelectKind::Group => {
                        if let Some(group_key) = &r.group_key {
                            next.marked_group_keys.push(group_key.clone());
                        }
                    }
                }
            }
            sort_dedup_numbers(&mut next.marked_tab_ids);
            sort_dedup_numbers(&mut next.marked_window_ids);
            sort_dedup_strings(&mut next.marked_group_keys);
            if next.marked_tab_ids.is_empty()
                && next.marked_window_ids.is_empty()
                && next.marked_group_keys.is_empty()
            {
                next.marked_kind = None;
                next.bulk_sub_mode = None;
            }
        }
        PickerEvent::ClearMarked => {
            next.marked_kind = None;
            next.bulk_sub_mode = None;
            next.marked_tab_ids.clear();
            next.marked_window_ids.clear();
            next.marked_group_keys.clear();
        }
    }

    next
}

pub fn reduce_with_loose_event_fallback(
    state: &PickerState,
    event_json: &str,
) -> Option<PickerState> {
    #[derive(Deserialize)]
    struct Loose {
        kind: Option<String>,
        delta: Option<i32>,
        #[serde(alias = "visibleLen")]
        visible_len: Option<i32>,
    }
    let v: Loose = serde_json::from_str(event_json).ok()?;
    match v.kind.as_deref() {
        Some("moveHi") if v.delta.is_some() && v.visible_len.is_some() => Some(PickerState {
            hi: clamp_index(state.hi, v.delta.unwrap(), v.visible_len.unwrap()),
            ..state.clone()
        }),
        Some("moveDest") if v.delta.is_some() && v.visible_len.is_some() => Some(PickerState {
            move_dest_hi: clamp_index(state.move_dest_hi, v.delta.unwrap(), v.visible_len.unwrap()),
            ..state.clone()
        }),
        _ => None,
    }
}

pub fn reduce_json(state_json: &str, event_json: &str) -> String {
    let state: PickerState = match serde_json::from_str(state_json) {
        Ok(s) => s,
        Err(e) => {
            return format!(r#"{{"error":"state:{}"}}"#, e);
        }
    };
    let event: PickerEvent = match serde_json::from_str(event_json) {
        Ok(e) => e,
        Err(_) => {
            if let Some(fallback) = reduce_with_loose_event_fallback(&state, event_json) {
                return serde_json::to_string(&fallback).unwrap_or_else(|e| format!(r#"{{"error":"{}"}}"#, e));
            }
            return format!(r#"{{"error":"event:invalid"}}"#);
        }
    };
    let next = reduce(&state, &event);
    serde_json::to_string(&next).unwrap_or_else(|e| format!(r#"{{"error":"{}"}}"#, e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tabs_picker::model::PickerState;

    fn empty_state() -> PickerState {
        PickerState {
            hi: 0,
            move_dest_hi: 0,
            marked_kind: None,
            marked_tab_ids: Vec::new(),
            marked_window_ids: Vec::new(),
            marked_group_keys: Vec::new(),
            bulk_sub_mode: None,
        }
    }

    #[test]
    fn move_hi_accepts_ts_camel_case_json() {
        let state = serde_json::to_string(&empty_state()).unwrap();
        let event = r#"{"kind":"moveHi","delta":1,"visibleLen":10}"#;
        let raw = reduce_json(&state, event);
        let next: PickerState = serde_json::from_str(&raw).expect(raw.as_str());
        assert_eq!(next.hi, 1);
    }

    #[test]
    fn cycle_sub_mode_accepts_implicit_kind_camel_case() {
        let state = serde_json::to_string(&empty_state()).unwrap();
        let event = r#"{"kind":"cycleSubMode","direction":1,"implicitKind":"tab"}"#;
        let raw = reduce_json(&state, event);
        let next: PickerState = serde_json::from_str(&raw).expect(raw.as_str());
        assert_eq!(next.bulk_sub_mode, Some(BulkSubMode::Move));
    }

    #[test]
    fn toggle_current_accepts_camel_case_row_ids() {
        let state = serde_json::to_string(&empty_state()).unwrap();
        let event = r#"{"kind":"toggleCurrent","row":{"kind":"tab","tabId":42,"windowId":1}}"#;
        let raw = reduce_json(&state, event);
        let next: PickerState = serde_json::from_str(&raw).expect(raw.as_str());
        assert_eq!(next.marked_kind, Some(SelectKind::Tab));
        assert_eq!(next.marked_tab_ids, vec![42]);
    }
}
