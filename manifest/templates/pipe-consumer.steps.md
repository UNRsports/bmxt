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

After a list-producer first command and **complete `-list`** (stage 0), the IME token menu lists **pipe continuations** from `PIPE_CONSUMER_COMPLETION_IDS` (display `| browse`, insert ` | browse`, …).

Offer zone (any of):

- Cursor in the third+ token zone after `-list` (including a trailing space: `setting -list `)
- Cursor at EOL on the complete `-list` word with **no** trailing space (`setting -list`)
- An existing third-tier hit for the same stage (e.g. `tab -list` option menu) — merge pipe tokens into it

**Auto-open / Enter:** When the resolved menu includes `| …` continuations and the token prefix is empty, open the menu without Tab. Enter on a bare complete `-list` line opens that menu instead of submitting (second Enter / pick applies `| browse` and runs). Esc then Enter still runs the plain `-list`.

Do not maintain a second catalog — registering a consumer is enough for both the right-hand stage (after `|`) and these left-hand continuations.

## Candidate menu (consumer stage)

On stage ≥ 1, first-token candidates come from `listPipeConsumerCompletionTokens()`. When the current word is already an **exact complete** consumer (e.g. `… | browse` or `… | browse `), the menu must **not** re-offer that same token (and must not reopen the full list after a trailing space). Partial prefixes (`bro`) still offer `browse`.

## Contract

- Stage 0 (left of `|`) must produce `ListResult` → converted to bmxtRule (and keep `listResult` for UI consumers).
- Stage 1+ must match a registered consumer; unsupported → `pipe.error.unsupportedConsumer`.
- Do not parse producer command names inside the consumer — filter by **kind** + entries / `ListResult` only.
