# BMXt Tutorial — specification (extensible)

## Goals

- Teach keyboard-first flows by walking the user through real prompt input.
- Soft guidance only: hints and progress; never block or rewrite free typing.
- First tutorial: reach `tab -list | browse` and open the tab picker column.
- Start via **`tutorial` / `tutorial -start`** and **auto-start on first launch** (skippable with **`tutorial -skip`** or the coach Skip control).

## Layout

```
lib/features/tutorial/
  SPEC.md                 # this document
  index.ts                # public exports
  types.ts                # schema (TutorialDefinition / Step / Assert / Observation)
  assert.ts               # pure assert evaluator
  catalog.ts              # registry of TutorialDefinition
  tutorials/
    tab-list-browse.ts    # default lesson
  progress-storage.ts     # chrome.storage.local progress
  observation.ts          # shell → Observation adapter helpers
  use-tutorial-runtime.ts # React runtime (advance / start / skip)
  tutorial-coach-panel.tsx
```

## Concepts

| Term | Meaning |
|------|---------|
| **Tutorial** | Ordered lesson (`id`, title i18n key, `steps[]`) |
| **Step** | One milestone: instruction + optional hint + `assert` |
| **Assert** | Pure predicate over a shell **Observation** |
| **Observation** | Snapshot: prompt line, token-picker model, tabs-picker open |
| **Progress** | Persisted completion / skip / active step (`bmxt_tutorial_progress_v1`) |
| **Runtime** | Observes shell each render; advances to the furthest satisfied step |

## Assert vocabulary (v1)

Composable:

- `promptEquals` / `promptMatches` / `promptTokenPrefix`
- `tokenPickerVisible` (optional `tier`) / `tokenPickerHas`
- `tabsPickerOpen`
- `all` / `any`

New assert kinds belong in `types.ts` + `assert.ts` only; keep the shell adapter thin.

## Soft advancement

On each observation, the runtime finds the **largest** `stepIndex` such that every step `0 .. stepIndex-1` is satisfied (contiguous prefix). Users may type ahead; the coach jumps forward without forcing keystrokes.

## Command surface (Rust → UiAction)

Reuses generic **`set_mode`**:

| Input | UiAction |
|-------|----------|
| `tutorial` / `tutorial -start` | `{ kind: "set_mode", feature_id: "tutorial", mode: "start" }` |
| `tutorial -skip` | `{ kind: "set_mode", feature_id: "tutorial", mode: "skip" }` |

Host (`apply-ui-action.ts`) calls tutorial runtime callbacks on `CommandDispatchDeps`.

## Adding a tutorial

1. Add `lib/features/tutorial/tutorials/<id>.ts` exporting a `TutorialDefinition`.
2. Register it in `catalog.ts` (`DEFAULT_TUTORIAL_ID` only if it should auto-start).
3. Add EN+JA keys under `lib/features/setting/i18n/namespaces/tutorial.json`.
4. Unit-test asserts in `tests/unit/features/tutorial/`.

## Non-goals (v1)

- Forcing keystrokes or locking the prompt
- Multi-pane / float-only lessons
- Remote or user-authored tutorial packs
