use crate::ir::{ui, DispatchBundle, UiAction};

pub fn run(_args: &[String]) -> DispatchBundle {
    ui(UiAction::ShowHelp)
}
