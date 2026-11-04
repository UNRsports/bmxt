# Firefox SP (smartphone / Fenix) — special case

**Shell model:** tab-hosted `bmxt.html` (`tabs.create` / focus). This is the **only** quadrant that uses the tab shell.

| | PC | SP |
|---|---|---|
| Chrome | popup | popup |
| Firefox | popup | **tab (this folder)** |

## Why not a separate XPI

AMO ships one XPI per version with both `gecko` and `gecko_android`. SP-specific behavior is selected at **runtime** via `shared/lib/features/host-env/` (`usesTabShell` = Firefox origin ∧ Android).

## Runtime (do not mix into PC files)

- `host-env/sp/*` — no `windows` / `commands` / `tabGroups`
- `host-env/shell/tab/*` — never activate another tab for picker preview
- Firefox `action.default_popup` trampoline (`bmxt-launch.html`) messages the background; background opens a **tab** on SP and a **popup window** on PC

Packaging entry remains [`../pc/wxt.config.ts`](../pc/wxt.config.ts) (merged single Firefox build) via [`../wxt.config.ts`](../wxt.config.ts).
