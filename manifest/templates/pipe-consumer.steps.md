# Adding a pipe consumer (`|` right-hand side)

See also: `new-command.checklist.md` → **extend-pipe-consumer**.

Consumers read **`BmxtRuleStream`** (`bmxt-rule/1`), never command-specific structs.
**UI consumers** (e.g. `| browse`) may also read the producer **`ListResult`** via `PipeConsumerRunContext` — still no producer command-name branching.

## Steps

1. Decide `acceptsKinds` from `manifest/bmxt-rule.json` (e.g. `page.open`).
2. Add `lib/features/command-line/pipe/consumers/<name>.ts`:
   - `match(segment)`
   - `acceptsKinds: readonly string[]`
   - `run(stream, deps, locale, segment, context) → SegmentOutcome`
3. Register in `pipe/consumers/registry.ts` and `PIPE_CONSUMER_COMPLETION_IDS`.
4. Optional: Tab candidates via `manifest/bmxt-candidate.json` (`registry.pipeConsumers`).
5. Rust side usually unchanged (consumer is host execution). Producer remains a `-list` command.
6. Tests: kind mismatch → exit 1; happy path closes/acts on accepted kinds.
7. Update README + `_context/map_command.csv`.

## Candidate menu (producer stage)

After a list-producer first command and `-list` (stage 0, third-token zone), the IME token menu also lists **pipe continuations** derived from the same `PIPE_CONSUMER_COMPLETION_IDS` (display `| browse`, insert ` | browse`, …). Do not maintain a second catalog for this — adding a consumer to the registry is enough for both the right-hand stage (after `|`) and these left-hand continuations.

## Contract

- Stage 0 (left of `|`) must produce `ListResult` → converted to bmxtRule (and keep `listResult` for UI consumers).
- Stage 1+ must match a registered consumer; unsupported → `pipe.error.unsupportedConsumer`.
- Do not parse producer command names inside the consumer — filter by **kind** + entries / `ListResult` only.
