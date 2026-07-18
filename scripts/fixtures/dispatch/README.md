# Dispatch golden fixtures

Locale-independent `runDispatch` / WASM `run` contracts for Effect-producing lines.
Msgs/help lines are expanded by the TS host and are not golden here.

Budget (Phase 0 / §13): raw `bmxt_core_bg.wasm` ≤ **400 KiB**.
Baseline (pre-WASM): `public/background-services.js` ≈ 480 KiB.
