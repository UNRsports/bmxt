# Adding a built-in shell command

## Rust (`wasm/bmxt-core`)

1. Add `src/cmd/<canonical_name>.rs` with `pub const CMD: Cmd` and `pub fn run(args: &[String]) -> DispatchJson`.
   - For `help` / `man`-style registry-only rows, only `CMD` is needed; dispatch stays in `dispatch.rs`.
2. Register the module in `src/cmd/mod.rs`.
3. Append `your_module::CMD` to `src/registry/table.rs` (`COMMANDS`).
4. If Chrome is needed, add an `Effect` variant in `src/model.rs` and a branch in `dispatch.rs` → `your_module::run`, then mirror JSON in TS (`effect-types.ts`, `handlers/apply-one.ts`).
5. Run `npm run build:wasm`.

## TypeScript (Chrome effects)

- New effect kinds: `lib/features/dispatch/effect-types.ts`, `handlers/apply-one.ts` (or small helpers under `lib/features/builtin-commands/`).
- Tab completion fallback (WASM load failure): `lib/features/builtin-commands/completion-fallback.ts` — keep tokens in sync with Rust tokens.

## Interactive-only flows

- Picker / UI-only entry points may still live in `tabs/bmxt.tsx`; they are outside this `cmd/` pipeline.
