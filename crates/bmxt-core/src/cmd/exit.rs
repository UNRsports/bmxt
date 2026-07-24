use crate::ir::{effects, ChromeEffect, DispatchBundle};

pub fn run(_args: &[String]) -> DispatchBundle {
    effects(vec![ChromeEffect::ExitPane])
}
