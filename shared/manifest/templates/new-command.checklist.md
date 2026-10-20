# New built-in command checklist

**EN** Prefer **reusing** closed vocabulary. Extend only when reuse is impossible.
**JA** 閉じた語彙の**再利用を優先**。どうしても足りないときだけ語彙を拡張する。

Catalogs / code:

| Layer | Source of truth |
|-------|-----------------|
| Registry / effects / UiAction kinds | `manifest/bmxt-codegen.json` → `pnpm run codegen` |
| Command semantics | `crates/bmxt-core/src/cmd/*.rs` (WASM) |
| List → rule map | `lib/features/command-line/inter-command/vocabulary.ts` |
| bmxtRule kinds | `manifest/bmxt-rule.json` |
| Plain `-list` | `list-output/` + `list-commands/` plugins |
| Pipe consumers | `lib/features/command-line/pipe/consumers/` |
| Chrome apply | `lib/features/dispatch/handlers/effects/` |
| UI apply | `lib/features/bmxt-window/shell/apply-ui-action.ts` |
| i18n | `lib/features/setting/i18n/namespaces/` (EN+JA) |

## Decision tree

```
Need Chrome side effect?
  └─ Existing ChromeEffect covers it? → reuse-effects (command-reuse-effects.example.rs)
  └─ No → extend-effect (manifest effects[] + handlers/effects/*.ts) THEN Rust run

UI-only (picker / mode / session UI)?
  └─ Existing UiAction covers it? → reuse-ui-action (command-reuse-ui-action.example.rs)
  └─ No → extend-ui-action (ir.rs + codegen + apply-ui-action.ts) THEN Rust run

Produces enumerable rows (-list)?
  └─ Existing ListRecordKind / bmxtRule kinds cover it? → reuse-list-kinds (list plugin only)
  └─ No → extend-list-and-rule (types + bmxt-rule.json + vocabulary map + adapter)

Consumes pipe stdin (|)?
  └─ Existing consumer + acceptsKinds cover it? → wire match only
  └─ No → extend-pipe-consumer (pipe-consumer.steps.md)
```

Helper: `preferredCommandAddPath()` in `inter-command/vocabulary.ts`.

## Minimal checklist (reuse path — TS hand-edit avoidable)

```
Task progress:
- [ ] Decision: reuse-effects | reuse-ui-action | reuse-list-kinds
- [ ] manifest/bmxt-codegen.json commands[] (+ subcommands)
- [ ] crates/bmxt-core/src/cmd/<module>.rs + cmd/mod.rs
- [ ] pnpm run codegen && pnpm run build:wasm
- [ ] i18n keys EN+JA (msgs / usage) if needed
- [ ] README + _context/map_command.csv
- [ ] verify:manifest → check:generated → cargo test -p bmxt-core → tsc → test → build
```

## Extend checklist (when reuse is impossible)

```
Task progress:
- [ ] extend-effect: effects[] + handlers/effects/<file>.ts
- [ ] extend-ui-action: crates/bmxt-core/src/ir.rs UiAction + apply-ui-action.ts + codegen
- [ ] extend-list-and-rule: ListRecordKind + vocabulary map + bmxt-rule.json + from-list-result
- [ ] extend-pipe-consumer: PipeConsumerEntry + acceptsKinds + registry
- [ ] Same verify chain as above
```

## Scaffold

```bash
pnpm run new:command -- <module> <canonical_name> [aliases...]
```

Then replace the stub `run` using the matching example under this directory.
