---
name: bmxt-add-command
description: >-
  Adds or changes BMXt built-in commands, subcommands, and Chrome effects via
  manifest/bmxt-codegen.json and pnpm run codegen. Use when adding commands,
  subcommands, effects, editing manifest/bmxt-codegen.json, or implementing
  command-line token model (first/second commands, continuation).
---

# BMXt — Add built-in command

Read [reference.md](reference.md) for subcommand templates, generated files, and command-line model details.

## Command-line model (invariants)

- Prompt = **token sequence**. **First command** = initial keyword (`tabs`, `split`). **Second command** = next fixed token (`-list`, `-row`). Document and implement **first → second**.
- **No short aliases** for first/second tiers (do not accept or complete `-l` for `-list`). Tab completion = canonical full tokens only. Legacy top-level aliases in README (e.g. `help`/`?`) may remain; do not add new short aliases for new first/second families.
- When a first command is **not actionable** without a second command, **Enter** on first token alone must: (1) show usage/placeholder for the second token, (2) restore prompt to `firstCommand ` (trailing ASCII space, cursor at end). Use shared **continuation**, not per-command one-offs.

## Checklist

```
Task progress:
- [ ] Manifest updated (commands[] / subcommands / effects[])
- [ ] crates/bmxt-core/src/cmd/<module>.rs added or updated (+ cmd/mod.rs)
- [ ] pnpm run codegen (+ Rust generated registry/effects)
- [ ] run implemented; subcommand head literals match manifest
- [ ] New effects: handler in lib/features/dispatch/handlers/effects/
- [ ] New UiAction kinds: apply-ui-action.ts + codegen ui-action-types if needed
- [ ] pnpm run build:wasm
- [ ] pnpm run verify:manifest → check:generated → cargo test -p bmxt-core → tsc → test → build
```

## Typical flow

1. **Scaffold:** `pnpm run new:command -- <module> <canonical_name> [aliases...]` *or* edit `manifest/bmxt-codegen.json` `commands[]`, add `crates/bmxt-core/src/cmd/<module>.rs`, wire `cmd/mod.rs`, then **`pnpm run codegen`**.
2. **Implement `run`:** Return `DispatchBundle` JSON (`lines` / `effects` / `ui` / `msgs` with i18n keys). **`pnpm run verify:manifest`** checks Rust cmd literals + registry.
3. **New Chrome effects:** Extend manifest `effects[]` → codegen → implement `lib/features/dispatch/handlers/effects/<tsHandlerFile>.ts`.
4. **UI-only:** Return `UiActionIR`; handle in `lib/features/bmxt-window/shell/apply-ui-action.ts` (no command-name branching in Enter path).
5. **Verify:** `verify:manifest`, `check:generated`, `build:wasm`, `cargo test -p bmxt-core`, `tsc`, `test`, `build`.

## Subcommands (second / third tokens)

1. Set `commands[].subcommands` to `[]` or `{ head, trailingTokens?, tail? }[]`.
2. `pnpm run codegen`.
3. In `crates/bmxt-core/src/cmd/<module>.rs`, use the **same string literal** for each `head`.
4. Implement `run`; align with `tail` hints.
5. Tab completion: `command-subcommands.gen.ts` (from manifest).

## Codegen rules

- **Single source:** `manifest/bmxt-codegen.json`. Run **`pnpm run codegen`**. Do **not** hand-edit:
  - `lib/features/bmxt-core/registry/table.gen.ts`
  - `lib/features/dispatch/effect-types.ts`, `ui-action-types.ts`
  - `lib/features/dispatch/handlers/apply-dispatch.gen.ts`
  - `lib/features/builtin-commands/completion-fallback.ts`, `command-subcommands.gen.ts`
  - `crates/bmxt-core/src/generated/chrome_effect.rs`, `registry_table.rs`
- **`handlers/effects/*.ts`:** Not overwritten by codegen.

## Layout

- Command semantics: **`crates/bmxt-core/src/cmd/*.rs`** (WASM)
- TS host: **`lib/features/bmxt-core/`** (`wasm-host`, `dispatch`, registry metadata)
- Chrome side effects: **`lib/features/dispatch/handlers/effects/`**
- UI actions: **`lib/features/bmxt-window/shell/apply-ui-action.ts`**
