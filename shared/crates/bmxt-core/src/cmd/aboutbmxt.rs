use crate::ir::{effects, msgs, HostEffect, DispatchBundle, Msg};

pub fn run(args: &[String]) -> DispatchBundle {
    let second = args.get(1).map(String::as_str).unwrap_or("");
    if second.is_empty() {
        return effects(vec![HostEffect::OpenWelcomePage]);
    }
    if second == "-system" {
        return effects(vec![HostEffect::ProbeCapabilities]);
    }
    msgs(vec![Msg {
        key: "cmd.aboutbmxt.usage".to_string(),
        params: None,
    }])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::DispatchBundle;

    fn effects_kinds(bundle: &DispatchBundle) -> Vec<&str> {
        match bundle {
            DispatchBundle::Effects { effects, .. } => effects
                .iter()
                .map(|e| match e {
                    HostEffect::OpenWelcomePage => "open_welcome_page",
                    HostEffect::ProbeCapabilities => "probe_capabilities",
                    _ => "other",
                })
                .collect(),
            _ => vec![],
        }
    }

    #[test]
    fn bare_opens_welcome() {
        let bundle = run(&["aboutbmxt".into()]);
        assert_eq!(effects_kinds(&bundle), vec!["open_welcome_page"]);
    }

    #[test]
    fn system_probes() {
        let bundle = run(&["aboutbmxt".into(), "-system".into()]);
        assert_eq!(effects_kinds(&bundle), vec!["probe_capabilities"]);
    }
}
