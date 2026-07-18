# Adding a pipe consumer (`|` right-hand side)

See also: `new-command.checklist.md` → **extend-pipe-consumer**.

Consumers read **`BmxtRuleStream`** (`bmxt-rule/1`), never command-specific structs.

## Steps

1. Decide `acceptsKinds` from `manifest/bmxt-rule.json` (e.g. `page.open`).
2. Add `lib/features/command-line/pipe/consumers/<name>.ts`:
   - `match(segment)`
   - `acceptsKinds: readonly string[]`
   - `run(stream, deps, locale, segment) → SegmentOutcome`
3. Register in `pipe/consumers/registry.ts`.
4. Optional: Tab candidates via `manifest/bmxt-candidate.json` (`registry.pipeConsumers`).
5. Rust side usually unchanged (consumer is host execution). Producer remains a `-list` command.
6. Tests: kind mismatch → exit 1; happy path closes/acts on accepted kinds.
7. Update README + `_context/map_command.csv`.

## Contract

- Stage 0 (left of `|`) must produce `ListResult` → converted to bmxtRule.
- Stage 1+ must match a registered consumer; unsupported → `pipe.error.unsupportedConsumer`.
- Do not parse producer command names inside the consumer — filter by **kind** + entries only.
