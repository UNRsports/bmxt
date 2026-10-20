# tests/

EN: All **JS/TS** automated tests for BMXt live under this directory (not under `lib/` or the repo root).
JA: BMXt の **JS/TS** 自動テストはすべてこのディレクトリ配下に置く（`lib/` やリポジトリ直下には置かない）。

## Layout / 構成

| Path | Role |
|------|------|
| **`unit/features/`** | Node.js `node:test` unit tests. Mirrors `lib/features/` paths. |
| **`unit/scripts/`** | Unit tests for `scripts/` helpers (`.test.mjs`). |
| **`property/`** | Property-based tests via **fast-check** + `node:test` (includes **TS↔WASM boundary** random-input suites). |
| **`e2e/`** | Playwright extension E2E specs. |
| **`playwright.config.ts`** | Playwright config (`testDir: ./e2e`). |

## Rust / WASM (not under this directory) / Rust・WASM（このディレクトリ外）

**Policy:** Rust tests stay in **`crates/bmxt-core/`**. They are **intentionally not** colocated under repo-root **`tests/`**. This is the supported layout.

| Kind | Location | Why |
|------|----------|-----|
| **Unit** (`#[cfg(test)]`) | **`crates/bmxt-core/src/**/*.rs`** | Cargo unit tests live next to the code they exercise (including private items). |
| **Integration** | **`crates/bmxt-core/tests/`** (e.g. `dispatch_effects.rs`) | Cargo discovers integration tests only as `{package}/tests/` beside that crate’s **`Cargo.toml`**. |

- **EN:** Do **not** move Rust tests into this `tests/` tree. `pnpm test` does not run them; use **`cargo test -p bmxt-core`** (also part of **`pnpm run verify`**).
- **JA:** Rust テストをこの `tests/` へ移さない。`pnpm test` の対象外。**`cargo test -p bmxt-core`**（**`pnpm run verify`** にも含まれる）で実行する。

## Commands / コマンド

```bash
pnpm test                 # JS/TS unit + property (glob under tests/)
pnpm run test:e2e         # Playwright Chromium (requires pnpm run build:chrome first)
pnpm run test:e2e:firefox # Playwright Firefox (requires pnpm run build:firefox first)
pnpm run test:e2e:install # install Chromium + Firefox for Playwright
cargo test -p bmxt-core   # Rust (crates/bmxt-core — not under tests/)
pnpm run verify           # full CI gate (includes Chromium e2e; not Firefox e2e)
```

**Firefox e2e notes**

| Layer | Status |
|-------|--------|
| Temporary install (RDP via **`playwright-webextext`**) | Supported — `firefox-install.smoke.spec.ts` |
| Drive **`moz-extension://…/bmxt.html`** (prompt / pickers) | **Not supported** by Playwright Firefox (Juggler) — see [playwright#7297](https://github.com/microsoft/playwright/issues/7297). Shell specs stay Chromium-only. |

- Build: **`pnpm run build:firefox`** → **`.output/firefox-mv3`**
- Browser pin: Playwright Firefox must be **≥ `strict_min_version` (139.0)** → **`@playwright/test` ≥ 1.54**
- Host switch: **`BMXT_E2E_BROWSER=chrome|firefox`**
- **`pnpm run verify`** still runs Chromium e2e only

## Adding tests / テスト追加

- **Unit (TS):** add `tests/unit/features/<same-path-as-lib>/<name>.test.ts` and import production modules from `lib/features/...` with a `.ts` extension.
- **Property:** add `tests/property/<name>.property.test.ts` using `fast-check` (`fc.assert` / `fc.property`). Boundary suites: `utf16-utf8-offset.property.test.ts`, `wasm-boundary.property.test.ts` (needs built `lib/wasm/bmxt-core/bmxt_core_bg.wasm`).
- **E2E:** add `tests/e2e/<name>.spec.ts` (shared fixtures in `fixtures.ts`; run on Chrome and/or Firefox via the scripts above).
- **Rust:** add `#[cfg(test)]` modules under `crates/bmxt-core/src/`, or integration files under `crates/bmxt-core/tests/` — **not** under this directory.

Do **not** put `*.test.ts` next to production files under `lib/`.
Do **not** reintroduce root-level `e2e/` or `playwright.config.ts`.
Do **not** relocate Cargo tests into this `tests/` directory.

## Generated artifacts / 生成物

Playwright writes **`tests/test-results/`** and (locally) **`tests/playwright-report/`**. These are gitignored — do not commit them. Legacy root **`/test-results/`** is also ignored if an older run created it.
