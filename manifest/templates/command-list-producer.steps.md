# Adding a `-list` producer (ListResult → bmxtRule)

See also: `new-command.checklist.md` → **reuse-list-kinds** / **extend-list-and-rule**.

## Reuse existing kinds

1. Rust `run` returns Effect (e.g. `foo_list`) or UiAction that triggers plain/browse list.
2. Add `lib/features/<feature>/*-list-result.ts` → `ListResult` using **existing** `ListRecordKind`.
3. Add `*-list-command.ts` and register matcher in `list-commands/registry.ts`.
4. Pipe handoff uses `bmxtRuleStreamFromListResult` + `LIST_KIND_TO_BMXT_RULE_KIND` automatically.
5. No new bmxtRule kind required if the static map already covers the ListRecordKind.

## Extend vocabulary (only if needed)

1. Add `ListRecordKind` in `lib/features/command-line/list-output/types.ts`.
2. Add mapping in `lib/features/command-line/inter-command/vocabulary.ts` (`LIST_KIND_TO_BMXT_RULE_KIND`).
3. Add kind to `manifest/bmxt-rule.json` (core/optional keys).
4. Extend `from-list-result.ts` field projection for the new kind.
5. Update `vocabulary.test.ts` `ALL_LIST_KINDS` if you keep an explicit list there.
6. i18n, README, `_context/map_command.csv`.

## Verify

```bash
pnpm run verify:manifest
pnpm run check:generated
pnpm run build:wasm
cargo test -p bmxt-core
pnpm exec tsc --noEmit
pnpm test
pnpm run build
```
