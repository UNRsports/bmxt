---
name: bmxt-add-command
description: >-
  Adds or changes BMXt built-in commands, subcommands, and Chrome effects via
  manifest/bmxt-codegen.json and pnpm run codegen. Use when adding commands,
  subcommands, effects, editing manifest/bmxt-codegen.json, or implementing
  command-line token model (first/second commands, continuation). Prefer closed
  inter-command vocabulary reuse (manifest/templates/).
---

# BMXt — Add built-in command

Read [reference.md](reference.md) and **`manifest/templates/new-command.checklist.md`** first.

## Inter-command vocabulary (invariant)

Commands communicate only through closed channels — not by calling each other by name:

| Channel | Role |
|---------|------|
| `DispatchBundle` (`lines` / `effects` / `ui` / `msgs`) | Rust → host plan (**bmxt-host/2**) |
| `ListResult` (`bmxt-list/1`) | Plain `-list` / picker |
| `BmxtRuleStream` (`bmxt-rule/1`) | Pipe `|` handoff |
| Exit status | Compound `&&` / `||` / `;` |

Index: `lib/features/command-line/inter-command/`. **Prefer reuse**; extend catalogs only when required.

**Reuse path = Rust only:** If the command can be expressed with existing `ChromeEffect` / `UiAction` / list kinds, implement only in `crates/bmxt-core/src/cmd/*.rs` (+ manifest `commands[]` / codegen / i18n keys). **Do not** add TypeScript executors. Completeness check: `pnpm run verify:host-blind`.

## Command-line model (invariants)

- Prompt = **token sequence**. **First command** = initial keyword (`tabs`, `split`). **Second command** = next fixed token (`-list`, `-row`). Document and implement **first → second**.
- **No short aliases** for first/second tiers (do not accept or complete `-l` for `-list`). Tab completion = canonical full tokens only. Legacy top-level aliases in README (e.g. `help`/`?`) may remain; do not add new short aliases for new first/second families.
- When a first command is **not actionable** without a second command, **Enter** on first token alone must: (1) show usage/placeholder for the second token, (2) restore prompt to `firstCommand ` (trailing ASCII space, cursor at end). Implement in **Rust** via `msgs` + `promptPrefix` (`require_second_token` / `msgs_with_prompt`). The TS host only expands msgs and calls `setContinuationPrompt` — **do not** add Enter-path continuation in TypeScript (`continuationPromptAfterLoneFirstToken` is for IME helpers only; compound eligibility uses WASM `compound_segment_eligibility`).
- Fixed-token Tab/IME candidates (tiers 1–3) come from WASM **`complete(line, cursor)`**; host IME keeps filter UX and live overlays only.

## Checklist

```
Task progress:
- [ ] Decision path from manifest/templates/new-command.checklist.md (reuse vs extend)
- [ ] Manifest updated (commands[] / subcommands; effects[] / uiActions[] only if extending)
- [ ] crates/bmxt-core/src/cmd/<module>.rs added or updated (+ cmd/mod.rs)
- [ ] pnpm run codegen (+ Rust generated registry / effects / ui_action)
- [ ] run implemented from template; subcommand head literals match manifest
- [ ] New effects (extend only): handler in lib/features/dispatch/handlers/effects/
- [ ] New UiAction kinds (extend only): manifest uiActions[] + apply-ui-action.ts + codegen
- [ ] New list/pipe kinds (extend only): vocabulary.ts + bmxt-rule.json + adapter/consumer
- [ ] i18n EN+JA; README; _context/map_command.csv
- [ ] pnpm run build:wasm
- [ ] pnpm run verify:manifest → verify:host-blind → check:generated → cargo test -p bmxt-core → tsc → test → build
```

## Typical flow

1. **Decide:** Open **`manifest/templates/new-command.checklist.md`**. Prefer **reuse-effects** / **reuse-ui-action** / **reuse-list-kinds** (Rust-only).
2. **Scaffold:** `pnpm run new:command -- <module> <canonical_name> [aliases...]` *or* edit `manifest/bmxt-codegen.json` `commands[]`, add `crates/bmxt-core/src/cmd/<module>.rs`, wire `cmd/mod.rs`, then **`pnpm run codegen`**.
3. **Implement `run`:** Copy from **`command-reuse-effects.example.rs`** or **`command-reuse-ui-action.example.rs`**, or follow **`command-list-producer.steps.md`** / **`pipe-consumer.steps.md`**. Return `DispatchBundle` (`lines` / `effects` / `ui` / `msgs`). Prefer generic UiActions (`set_mode`, `close_picker`, `open_plain_list`, `open_picker`).
4. **Extend only if needed:** New Chrome effects / UiAction / list+rule kinds / pipe consumer (see checklist).
5. **Verify:** `verify:manifest`, `verify:host-blind`, `check:generated`, `build:wasm`, `cargo test -p bmxt-core`, `tsc`, `test`, `build`.

## Subcommands (second / third tokens)

1. Set `commands[].subcommands` to `[]` or `{ head, trailingTokens?, tail? }[]`.
2. `pnpm run codegen`.
3. In `crates/bmxt-core/src/cmd/<module>.rs`, use the **same string literal** for each `head`.
4. Implement `run`; align with `tail` hints.
5. Tab completion: `command-subcommands.gen.ts` (from manifest).

## Codegen rules

- **Single source:** `manifest/bmxt-codegen.json` (`commands[]`, `effects[]`, `uiActions[]`). Run **`pnpm run codegen`**. Do **not** hand-edit:
  - `lib/features/bmxt-core/registry/table.gen.ts`
  - `lib/features/dispatch/effect-types.ts`, `ui-action-types.ts`
  - `lib/features/dispatch/handlers/apply-dispatch.gen.ts`
  - `lib/features/builtin-commands/completion-fallback.ts`, `command-subcommands.gen.ts`
  - `crates/bmxt-core/src/generated/chrome_effect.rs`, `ui_action.rs`, `registry_table.rs`
- **`handlers/effects/*.ts`:** Not overwritten by codegen.
- **`apply-ui-action.ts`:** Hand-written thin executors for generic UiAction kinds only.

## Layout

- Command semantics: **`crates/bmxt-core/src/cmd/*.rs`** (WASM)
- Inter-command vocabulary: **`lib/features/command-line/inter-command/`**
- Templates: **`manifest/templates/`**
- TS host: **`lib/features/bmxt-core/`** (`wasm-host`, `dispatch`, registry metadata)
- Chrome side effects: **`lib/features/dispatch/handlers/effects/`**
- UI actions: **`lib/features/bmxt-window/shell/apply-ui-action.ts`**
