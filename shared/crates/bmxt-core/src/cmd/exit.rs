use crate::ir::{effects, HostEffect, DispatchBundle};

pub fn run(_args: &[String]) -> DispatchBundle {
    effects(vec![HostEffect::ExitPane])
}
