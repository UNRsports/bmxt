# BMXt command add — reference

## Generated files (do not hand-edit)

| File | Role |
|------|------|
| `lib/features/bmxt-core/registry/table.gen.ts` | Command registry |
| `lib/features/dispatch/effect-types.ts` | Effect type union |
| `lib/features/dispatch/handlers/apply-dispatch.gen.ts` | Effect dispatch switch |
| `lib/features/builtin-commands/completion-fallback.ts` | Tab completion fallback |
| `lib/features/builtin-commands/command-subcommands.gen.ts` | Subcommand heads, third-token candidates |

## Subcommand manifest shape

Template: `manifest/templates/command-with-subcommands.example.json`

```json
{
  "head": "-list",
  "trailingTokens": ["optional", "hint"],
  "tail": "usage hint for optional args"
}
```

## Command-line terminology

| Term | Meaning | Example |
|------|---------|---------|
| First command | Initial keyword | `tabs`, `setting`, `split` |
| Second command | Next fixed token | `-list`, `-row` |
| Third token | Optional fixed token after head | From `listThirdTokenCandidates` |

## Continuation behavior

When first command requires second:

1. User types `setting` + Enter (no second token).
2. Shell prints usage or placeholder showing expected second-command shape.
3. Prompt restores to `setting ` with cursor at end.
4. Implementation uses shared continuation mechanism in shell/bmxt-core — not ad hoc per command.

## New effect workflow

1. Add entry to `manifest/bmxt-codegen.json` `effects[]`.
2. `pnpm run codegen`.
3. Create/update `lib/features/dispatch/handlers/effects/<name>.ts` with `tsHandlerExport` matching manifest.
4. Return effect from command `run` via `effectsDispatch([...])`.

## Verification (match CI)

```bash
pnpm run verify:manifest
pnpm run check:generated
pnpm exec tsc --noEmit
pnpm test
pnpm run build
```

## Further reading

- README § Inter-command vocabulary / Command add procedure (EN + JA)
- README § Command-line token model (first / second commands)
- `manifest/templates/new-command.checklist.md`
- `lib/features/command-line/inter-command/`
