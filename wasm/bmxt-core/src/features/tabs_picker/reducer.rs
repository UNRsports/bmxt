use super::model::{BulkSubMode, PickerEvent, PickerState, SelectKind};
use serde_json::Value;

fn wrap_index(cur: usize, delta: i32, len: usize) -> usize {
    if len == 0 {
        return 0;
    }
    let l = len as i32;
    let base = cur as i32;
    let next = (base + delta).rem_euclid(l);
    next as usize
}

fn allowed_modes(kind: SelectKind) -> &'static [BulkSubMode] {
    match kind {
        SelectKind::Window => &[BulkSubMode::Close],
        SelectKind::Group => &[BulkSubMode::Move, BulkSubMode::Close, BulkSubMode::NewWindow],
        SelectKind::Tab => &[
            BulkSubMode::Move,
            BulkSubMode::Close,
            BulkSubMode::Group,
            BulkSubMode::NewWindow,
        ],
    }
}

fn cycle_mode(cur: Option<BulkSubMode>, kind: SelectKind, direction: i32) -> Option<BulkSubMode> {
    let modes = allowed_modes(kind);
    if modes.is_empty() {
        return None;
    }
    let step = if direction >= 0 { 1 } else { -1 };
    match cur {
        None => {
            if step > 0 {
                Some(modes[0])
            } else {
                Some(modes[modes.len() - 1])
            }
        }
        Some(m) => {
            let idx = modes.iter().position(|x| *x == m).unwrap_or(0);
            let len = modes.len() as i32;
            let next = (idx as i32 + step).rem_euclid(len) as usize;
            Some(modes[next])
        }
    }
}

fn sort_dedup_i32(v: &mut Vec<i32>) {
    v.sort_unstable();
    v.dedup();
}

fn sort_dedup_string(v: &mut Vec<String>) {
    v.sort();
    v.dedup();
}

pub fn reduce(mut state: PickerState, ev: PickerEvent) -> PickerState {
    match ev {
        PickerEvent::MoveHi { delta, visible_len } => {
            state.hi = wrap_index(state.hi, delta, visible_len);
        }
        PickerEvent::MoveDest { delta, visible_len } => {
            state.move_dest_hi = wrap_index(state.move_dest_hi, delta, visible_len);
        }
        PickerEvent::CycleSubMode {
            direction,
            implicit_kind,
        } => {
            let kind = state.marked_kind.or(implicit_kind);
            if let Some(kind) = kind {
                state.bulk_sub_mode = cycle_mode(state.bulk_sub_mode, kind, direction);
            }
        }
        PickerEvent::ToggleCurrent { row } => {
            if let Some(k) = state.marked_kind {
                if k != row.kind {
                    return state;
                }
            } else {
                state.marked_kind = Some(row.kind);
            }
            match row.kind {
                SelectKind::Tab => {
                    if let Some(id) = row.tab_id {
                        if let Some(i) = state.marked_tab_ids.iter().position(|x| *x == id) {
                            state.marked_tab_ids.remove(i);
                        } else {
                            state.marked_tab_ids.push(id);
                        }
                        sort_dedup_i32(&mut state.marked_tab_ids);
                    }
                }
                SelectKind::Window => {
                    if let Some(id) = row.window_id {
                        if let Some(i) = state.marked_window_ids.iter().position(|x| *x == id) {
                            state.marked_window_ids.remove(i);
                        } else {
                            state.marked_window_ids.push(id);
                        }
                        sort_dedup_i32(&mut state.marked_window_ids);
                    }
                }
                SelectKind::Group => {
                    if let Some(key) = row.group_key {
                        if let Some(i) = state.marked_group_keys.iter().position(|x| *x == key) {
                            state.marked_group_keys.remove(i);
                        } else {
                            state.marked_group_keys.push(key);
                        }
                        sort_dedup_string(&mut state.marked_group_keys);
                    }
                }
            }
            if state.marked_tab_ids.is_empty()
                && state.marked_window_ids.is_empty()
                && state.marked_group_keys.is_empty()
            {
                state.marked_kind = None;
                state.bulk_sub_mode = None;
            }
        }
        PickerEvent::SelectRange { input } => {
            if input.rows.is_empty() {
                return state;
            }
            let max_idx = input.rows.len() - 1;
            let a = input.anchor.min(max_idx);
            let b = input.target.min(max_idx);
            let lo = a.min(b);
            let hi = a.max(b);
            let Some(first) = input.rows.get(lo) else {
                return state;
            };
            let range_kind = first.kind;
            state.marked_kind = Some(range_kind);
            state.marked_tab_ids.clear();
            state.marked_window_ids.clear();
            state.marked_group_keys.clear();
            for i in lo..=hi {
                let Some(r) = input.rows.get(i) else {
                    continue;
                };
                if r.kind != range_kind {
                    continue;
                }
                match r.kind {
                    SelectKind::Tab => {
                        if let Some(id) = r.tab_id {
                            state.marked_tab_ids.push(id);
                        }
                    }
                    SelectKind::Window => {
                        if let Some(id) = r.window_id {
                            state.marked_window_ids.push(id);
                        }
                    }
                    SelectKind::Group => {
                        if let Some(k) = r.group_key.clone() {
                            state.marked_group_keys.push(k);
                        }
                    }
                }
            }
            sort_dedup_i32(&mut state.marked_tab_ids);
            sort_dedup_i32(&mut state.marked_window_ids);
            sort_dedup_string(&mut state.marked_group_keys);
            if state.marked_tab_ids.is_empty()
                && state.marked_window_ids.is_empty()
                && state.marked_group_keys.is_empty()
            {
                state.marked_kind = None;
                state.bulk_sub_mode = None;
            }
        }
        PickerEvent::ClearMarked => {
            state.marked_kind = None;
            state.bulk_sub_mode = None;
            state.marked_tab_ids.clear();
            state.marked_window_ids.clear();
            state.marked_group_keys.clear();
        }
    }
    state
}

/// `PickerEvent` の厳密デシリアライズが失敗したとき、`moveHi` / `moveDest` だけ緩い JSON から適用する。
pub fn reduce_with_loose_event_fallback(mut state: PickerState, event_json: &str) -> Option<PickerState> {
    let v: Value = serde_json::from_str(event_json).ok()?;
    let kind = v.get("kind")?.as_str()?;
    match kind {
        "moveHi" => {
            let delta = v.get("delta")?.as_i64()? as i32;
            let visible_len = v.get("visibleLen")?.as_u64()? as usize;
            state.hi = wrap_index(state.hi, delta, visible_len);
            Some(state)
        }
        "moveDest" => {
            let delta = v.get("delta")?.as_i64()? as i32;
            let visible_len = v.get("visibleLen")?.as_u64()? as usize;
            state.move_dest_hi = wrap_index(state.move_dest_hi, delta, visible_len);
            Some(state)
        }
        _ => None,
    }
}

#[cfg(test)]
mod loose_fallback_tests {
    use super::{reduce_with_loose_event_fallback, wrap_index};
    use crate::features::tabs_picker::model::PickerState;

    fn empty_state(hi: usize, move_dest_hi: usize) -> PickerState {
        PickerState {
            hi,
            move_dest_hi,
            marked_kind: None,
            marked_tab_ids: vec![],
            marked_window_ids: vec![],
            marked_group_keys: vec![],
            bulk_sub_mode: None,
        }
    }

    #[test]
    fn loose_move_hi_matches_wrap_index() {
        let state = empty_state(0, 0);
        let json = r#"{"kind":"moveHi","delta":1,"visibleLen":3}"#;
        let out = reduce_with_loose_event_fallback(state, json).expect("loose parse");
        assert_eq!(out.hi, wrap_index(0, 1, 3));
    }

    #[test]
    fn loose_move_dest_matches_wrap_index() {
        let state = empty_state(0, 1);
        let json = r#"{"kind":"moveDest","delta":2,"visibleLen":4}"#;
        let out = reduce_with_loose_event_fallback(state, json).expect("loose parse");
        assert_eq!(out.move_dest_hi, wrap_index(1, 2, 4));
    }
}
