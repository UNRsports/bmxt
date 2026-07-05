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
- [ ] lib/features/bmxt-core/cmd/<module>.ts added or updated
- [ ] pnpm run codegen
- [ ] run implemented; export const CMD aligned with manifest
- [ ] New effects: handler in lib/features/dispatch/handlers/effects/
- [ ] pnpm run verify:manifest → pnpm run check:generated → pnpm exec tsc --noEmit → pnpm test → pnpm run build (as needed)
```

## Typical flow

1. **Scaffold:** `pnpm run new:command -- <module> <canonical_name> [aliases...]` *or* edit `manifest/bmxt-codegen.json` `commands[]`, add `lib/features/bmxt-core/cmd/<module>.ts`, then **`pnpm run codegen`**.
2. **Implement `run`:** Keep **`export const CMD`** aligned with manifest (`pnpm run verify:manifest`).
3. **New Chrome effects:** Extend manifest `effects[]` → codegen → implement `lib/features/dispatch/handlers/effects/<tsHandlerFile>.ts` (`tsHandlerExport`) → return from **`run`** via **`effectsDispatch([...])`** when needed.
4. **Verify:** `pnpm run verify:manifest`, `pnpm run check:generated`, `pnpm exec tsc --noEmit`, `pnpm run build` as needed. See README § Command add procedure.

## Subcommands (second / third tokens)

1. Set `commands[].subcommands` to `[]` or `{ head, trailingTokens?, tail? }[]` (template: `manifest/templates/command-with-subcommands.example.json`).
2. `pnpm run codegen`.
3. In `cmd/<module>.ts`, use the **same string literal** for each `head` as in the manifest.
4. Implement `run` (dispatch, optional args); align with `tail` hints.
5. Third-token Tab completion: use `listThirdTokenCandidates` from `command-subcommands.gen.ts`; wire shell completion zone if needed.

## Codegen rules

- **Single source:** `manifest/bmxt-codegen.json`. Run **`pnpm run codegen`**. Do **not** hand-edit:
  - `lib/features/bmxt-core/registry/table.gen.ts`
  - `lib/features/dispatch/effect-types.ts`
  - `lib/features/dispatch/handlers/apply-dispatch.gen.ts`
  - `lib/features/builtin-commands/completion-fallback.ts`
  - `lib/features/builtin-commands/command-subcommands.gen.ts`
- **`handlers/effects/*.ts`:** Not overwritten by codegen. After `effects[]` changes, update matching handler for generated `ChromeEffect` / `apply-dispatch.gen.ts` types.

## Layout

- Command logic: **`lib/features/bmxt-core/cmd/*.ts`**
- Chrome side effects: **`lib/features/dispatch/handlers/effects/`**
