# BMXt command templates

Templates for adding built-in commands against the **closed inter-command vocabulary**.

| File | When to use |
|------|-------------|
| [`new-command.checklist.md`](./new-command.checklist.md) | **Start here** — decision tree + checklist (EN/JA) |
| [`command-with-subcommands.example.json`](./command-with-subcommands.example.json) | Manifest `commands[].subcommands` shape |
| [`command-reuse-effects.example.rs`](./command-reuse-effects.example.rs) | Rust `run` that returns existing `ChromeEffect`s only |
| [`command-reuse-ui-action.example.rs`](./command-reuse-ui-action.example.rs) | Rust `run` that returns existing `UiAction` only |
| [`command-list-producer.steps.md`](./command-list-producer.steps.md) | New or extended `-list` producer → `ListResult` / bmxtRule |
| [`pipe-consumer.steps.md`](./pipe-consumer.steps.md) | New pipe `|` consumer (`acceptsKinds`) |

Scaffold: `pnpm run new:command -- <module> <canonical_name> [aliases...]`

Vocabulary index (runtime + docs): `lib/features/command-line/inter-command/`
