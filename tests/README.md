# tests/

EN: All **JS/TS** automated tests for BMXt live under this directory (not under `lib/` or the repo root).
JA: BMXt の **JS/TS** 自動テストはすべてこのディレクトリ配下に置く（`lib/` やリポジトリ直下には置かない）。

## Layout / 構成

| Path | Role |
|------|------|
| **`unit/features/`** | Node.js `node:test` unit tests. Mirrors `lib/features/` paths. |
| **`unit/scripts/`** | Unit tests for `scripts/` helpers (`.test.mjs`). |
| **`property/`** | Property-based tests via **fast-check** + `node:test` (includes **TS↔WASM boundary** random-input suites). |
| **`e2e/`** | Headless **WebDriver** extension E2E (`selenium-webdriver`). |

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
pnpm run test:e2e:chrome  # WebDriver Chrome headless (requires pnpm run build:chrome)
pnpm run test:e2e:firefox # WebDriver Firefox headless (requires pnpm run build:firefox)
pnpm run test:e2e:all     # Chrome then Firefox
cargo test -p bmxt-core   # Rust (crates/bmxt-core — not under tests/)
pnpm run verify           # full CI gate (includes Chrome + Firefox e2e)
```

## E2E (WebDriver) / E2E（WebDriver）

| | Chrome | Firefox |
|--|--------|---------|
| Driver | ChromeDriver + **Chrome for Testing** (not branded Chrome) | geckodriver → Marionette (`--allow-system-access`) |
| Mode | **`--headless=new`** (always) | **`-headless`** (always) |
| Extension load | `--load-extension` on unpacked `.output/chrome-mv3` | `installAddon(..., temporary)` on `.output/firefox-mv3` |
| Shell page | `driver.get(chrome-extension://…/bmxt.html)` | Chrome-context `openTrustedLinkIn(moz-extension://…)` (Navigate is blocked) |

- Host switch: **`BMXT_E2E_BROWSER=chrome|firefox`**
- Specs: **`tests/e2e/*.test.ts`** (shared); harness in **`harness.ts`**
- Drivers are fetched by **Selenium Manager** (no separate `test:e2e:install`)
- Suites: command smoke (`commands-smoke.test.ts` + `command-matrix.ts`), prompt integrity (`prompt-integrity.test.ts`), CJK caret (`prompt-cjk.test.ts`)

## Adding tests / テスト追加

- **Unit (TS):** add `tests/unit/features/<same-path-as-lib>/<name>.test.ts` and import production modules from `lib/features/...` with a `.ts` extension.
- **Property:** add `tests/property/<name>.property.test.ts` using `fast-check` (`fc.assert` / `fc.property`). Boundary suites: `utf16-utf8-offset.property.test.ts`, `wasm-boundary.property.test.ts` (needs built `lib/wasm/bmxt-core/bmxt_core_bg.wasm`).
- **E2E:** add `tests/e2e/<name>.test.ts` using **`harness.ts`** (runs on both browsers via the scripts above).
- **E2E command smoke:** add a row to `tests/e2e/command-matrix.ts` (`id`, `line`, `assert`, optional `tags` / `expectContains`). Assertions: `usage` | `log_ok` | `log_or_empty` | `picker` | `cleared` | `help_text`. Prefer locale-stable substrings (`usage:`, `error:`). Tag `needs_https` when content scripts / page tabs are required. Do **not** explode into full flag/compound combinatorics.
- **E2E prompt integrity:** add cases to `tests/e2e/prompt-integrity.test.ts` for UI breakage classes (wipe, busy, picker, history, focus) — not command matrices. Reuse `tests/e2e/helpers/` and `harness.ts`.
- **Rust:** add `#[cfg(test)]` modules under `crates/bmxt-core/src/`, or integration files under `crates/bmxt-core/tests/` — **not** under this directory.

Do **not** put `*.test.ts` next to production files under `lib/`.
Do **not** reintroduce Playwright-based e2e or root-level `playwright.config.ts`.
Do **not** relocate Cargo tests into this `tests/` directory.
