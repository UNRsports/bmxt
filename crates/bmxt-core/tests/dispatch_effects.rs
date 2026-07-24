use bmxt_core::dispatch::run_line;
use bmxt_core::ir::DispatchBundle;
use pretty_assertions::assert_eq;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

#[derive(serde::Deserialize)]
struct FixtureCase {
    line: String,
    expect: Value,
}

fn fixture_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../scripts/fixtures/dispatch/effects.json")
}

fn bundle_to_value(bundle: &DispatchBundle) -> Value {
    serde_json::to_value(bundle).expect("serialize dispatch bundle")
}

#[test]
fn dispatch_effects_match_fixture() {
    let raw = fs::read_to_string(fixture_path()).expect("read effects.json fixture");
    let cases: Vec<FixtureCase> = serde_json::from_str(&raw).expect("parse effects.json");
    for case in cases {
        let got = run_line(&case.line);
        assert_eq!(
            bundle_to_value(&got),
            case.expect,
            "line {:?}",
            case.line
        );
    }
}
