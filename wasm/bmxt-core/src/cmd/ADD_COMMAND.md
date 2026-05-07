# Adding a built-in shell command

## Rust (`wasm/bmxt-core`)

1. Copy `_template/command_stub.rs` to `src/cmd/<canonical_name>.rs` (or start fresh) with `pub const CMD: Cmd` and `pub fn run(args: &[String]) -> DispatchJson`.
   - For `help` / `man`-style registry-only rows, only `CMD` is needed; dispatch stays in `dispatch.rs`.
2. Register the module in `src/cmd/mod.rs` (`pub mod <name>;`).
3. Append `your_module` to `command_registry! { ... }` in `src/registry/table.rs` (this updates both `COMMANDS` and `COMMAND_RUNNERS`; do not edit `dispatch.rs` for listing).
4. If Chrome is needed, add an `Effect` variant in `src/model.rs`, return it from `run`, then mirror JSON in TS (`effect-types.ts`, `handlers/apply-one.ts`).
5. Run `npm run build:wasm`.

## TypeScript (Chrome effects)

- New effect kinds: `lib/features/dispatch/effect-types.ts`, `handlers/apply-one.ts` (or small helpers under `lib/features/builtin-commands/`).
- Tab completion fallback (WASM load failure): `lib/features/builtin-commands/completion-fallback.ts` — keep tokens in sync with Rust tokens.

## Interactive-only flows

- Picker / UI-only entry points may still live in `tabs/bmxt.tsx`; they are outside this `cmd/` pipeline.
