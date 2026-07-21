//! Compound / pipe segment eligibility from WASM `run` plans (no TS parse-* SoT).

use crate::dispatch::run_line;
use crate::ir::{DispatchBundle, UiAction};
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CompoundSegmentKind {
    Eligible,
    Continuation,
    Interactive,
    Empty,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompoundSegmentEligibility {
    pub kind: CompoundSegmentKind,
}

fn classify_bundle(bundle: &DispatchBundle) -> CompoundSegmentKind {
    match bundle {
        DispatchBundle::Msgs {
            prompt_prefix: Some(prefix),
            ..
        } if !prefix.is_empty() => CompoundSegmentKind::Continuation,
        DispatchBundle::Ui {
            action: UiAction::ContinuationPrompt { .. },
        } => CompoundSegmentKind::Continuation,
        DispatchBundle::Ui {
            action: UiAction::SessionSwitch { name },
        } if name.trim().is_empty() => CompoundSegmentKind::Interactive,
        DispatchBundle::Ui {
            action: UiAction::SessionSettingName { name },
        } if name.trim().is_empty() => CompoundSegmentKind::Interactive,
        DispatchBundle::Ui {
            action: UiAction::NavConfirmClose { .. },
        } => CompoundSegmentKind::Interactive,
        _ => CompoundSegmentKind::Eligible,
    }
}

/** EN: Classify whether a compound/pipe segment may run (vs continuation / interactive). */
pub fn classify_segment(segment: &str) -> CompoundSegmentEligibility {
    let trimmed = segment.trim();
    if trimmed.is_empty() {
        return CompoundSegmentEligibility {
            kind: CompoundSegmentKind::Empty,
        };
    }
    let bundle = run_line(trimmed);
    CompoundSegmentEligibility {
        kind: classify_bundle(&bundle),
    }
}

pub fn classify_segment_json(segment: &str) -> String {
    serde_json::to_string(&classify_segment(segment)).unwrap_or_else(|_| {
        r#"{"kind":"eligible"}"#.to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_is_empty() {
        assert_eq!(classify_segment("").kind, CompoundSegmentKind::Empty);
        assert_eq!(classify_segment("   ").kind, CompoundSegmentKind::Empty);
    }

    #[test]
    fn lone_tabs_is_continuation() {
        assert_eq!(
            classify_segment("tabs").kind,
            CompoundSegmentKind::Continuation
        );
    }

    #[test]
    fn tabs_list_is_eligible() {
        assert_eq!(
            classify_segment("tabs -list").kind,
            CompoundSegmentKind::Eligible
        );
    }

    #[test]
    fn incomplete_tabs_setting_is_continuation() {
        assert_eq!(
            classify_segment("tabs -setting").kind,
            CompoundSegmentKind::Continuation
        );
    }

    #[test]
    fn bare_session_switch_is_interactive() {
        assert_eq!(
            classify_segment("session -switch").kind,
            CompoundSegmentKind::Interactive
        );
    }

    #[test]
    fn named_session_switch_is_eligible() {
        assert_eq!(
            classify_segment("session -switch work").kind,
            CompoundSegmentKind::Eligible
        );
    }
}
