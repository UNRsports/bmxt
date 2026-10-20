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
pnpm run test:e2e         # Playwright headless (requires pnpm run build first)
pnpm run test:e2e:headed  # same suite with a visible Chromium window (debug)
pnpm run test:e2e:install # install Chromium for Playwright
cargo test -p bmxt-core   # Rust (crates/bmxt-core — not under tests/)
pnpm run verify           # full CI gate (includes the above)
```

E2E defaults to **headless** (`channel: "chromium"` + MV3 extension load) so windows do not cover the desktop. Set **`HEADED=1`** (or use `test:e2e:headed`) to show the browser.

## Adding tests / テスト追加

- **Unit (TS):** add `tests/unit/features/<same-path-as-lib>/<name>.test.ts` and import production modules from `lib/features/...` with a `.ts` extension.
- **Property:** add `tests/property/<name>.property.test.ts` using `fast-check` (`fc.assert` / `fc.property`). Boundary suites: `utf16-utf8-offset.property.test.ts`, `wasm-boundary.property.test.ts` (needs built `lib/wasm/bmxt-core/bmxt_core_bg.wasm`).
- **E2E:** add `tests/e2e/<name>.spec.ts` (shared fixtures in `fixtures.ts`). Open BMXt pages with **`extensionPageUrl`** from **`lib/features/extension-url/`** (do not hard-code `chrome-extension://`).
- **E2E command smoke:** add a row to `tests/e2e/command-matrix.ts` (`id`, `line`, `assert`, optional `tags` / `expectContains`). Assertions: `usage` | `log_ok` | `log_or_empty` | `picker` | `cleared` | `help_text`. Prefer locale-stable substrings (`usage:`, `error:`). Tag `needs_https` when content scripts / page tabs are required. Do **not** explode into full flag/compound combinatorics.
- **E2E prompt integrity:** add cases to `tests/e2e/prompt-integrity.spec.ts` for UI breakage classes (wipe, busy, picker, history, focus) — not command matrices. Reuse `tests/e2e/helpers/`.
- **Rust:** add `#[cfg(test)]` modules under `crates/bmxt-core/src/`, or integration files under `crates/bmxt-core/tests/` — **not** under this directory.

Do **not** put `*.test.ts` next to production files under `lib/`.
Do **not** reintroduce root-level `e2e/` or `playwright.config.ts`.
Do **not** relocate Cargo tests into this `tests/` directory.

## Generated artifacts / 生成物

Playwright writes **`tests/test-results/`** and (locally) **`tests/playwright-report/`**. These are gitignored — do not commit them. Legacy root **`/test-results/`** is also ignored if an older run created it.
