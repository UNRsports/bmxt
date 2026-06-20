# BMXt

> **English** documentation is first; the complete **Japanese** version follows below ([jump to 日本語](#japanese)).

## Table of contents

- [Introduction](#introduction)
- [🛠 Seed Project](#seed-project)
- [📺 Demo Video](#demo-video)
- [♿️ Universal Design Intent](#universal-design-intent)
- [Technical Overview](#technical-overview)
  - [WXT project layout](#wxt-project-layout)
- [Key Specs](#key-specs)
  - [Permissions (`wxt.config.ts` manifest)](#permissions-manifest)
  - [Reproducible builds](#reproducible-builds)
  - [npm dependencies and security](#npm-dependencies)
- [Command-line token model (first / second commands)](#command-line-token-model)
  - [Command List](#command-list)
  - [BMXt process lifecycle (`clear` / window close / `exit`)](#bmxt-process-lifecycle)
  - [`aboutbmxt`](#aboutbmxt)
  - [Nav mode (`nav -enter` / `nav -exit`)](#nav-mode)
  - [`translate` (`translate -on` / `translate -off` / `translate -setting`)](#translate)
  - [`setting` (`setting -list` / `setting -exit -list`)](#setting)
  - [`session` (terminal sessions)](#session)
  - [`tabs` (subcommands)](#tabs-man-tabs)
  - [Picker UI (side columns)](#picker-ui)
  - [Tab Picker (`tabs -list` / `tabs -list -u`)](#tabs-tab-picker)
  - [Tab picker `:edit` (window & tab group)](#tabs-tab-picker-edit)
  - [Tab picker — implementation (keyboard & reducer)](#tabs-tab-picker-impl)
  - [URL Lines (`http` / `https`)](#url-lines)
- [Command Execution Architecture (Current)](#command-execution-architecture)
  - [Job execution (background work)](#job-execution)
  - [Add a New Built-in Command](#add-new-built-in-command)
  - [Command add procedure](#command-add-procedure)
- [Prompt Key Bindings](#prompt-key-bindings)
- [Development](#development)
  - [Development startup (step-by-step)](#development-startup)
  - [npm dependencies and security](#npm-dependencies)
  - [Main Sources](#main-sources)
  - [Version upgrade banner & release notes](#version-upgrade-banner)
- [Production Build](#production-build)
- [Store Submission (Reference)](#store-submission)
- [License](#license)
- [Roadmap](#roadmap)
- [日本語](#japanese)

<a id="introduction"></a>

## Introduction


**BMXt** is a UI for **keyboard-centric browser control** in Chrome. It exists because the author is not satisfied with today’s out-of-the-box browser experience.

It has a **terminal-style** prompt and log, but it is designed as a **command surface for manipulating the whole browser**—broader than a classic terminal emulator—and it aims to keep your hands on the keyboard in a relaxed posture while reducing how often you reach for tabs and windows.

**About the name** — a play on **Browser Manipulator X Terminal**:

- **X**
  - **UX** improvement
  - Inclusive “cross-over” use for many kinds of people
  - Open-ended, command-driven growth (exponential / unbounded feel)
- **t**
  - **T**erminal (first letter)
  - The extension as a **plus** layered on your browser (the idea in the letter **t**)

The project is still in its early days, but **BMXt is available on the [Chrome Web Store](https://chromewebstore.google.com/detail/bmxtdemo/ljadfdncbodcdkmhfneeopomipanafil)**. The author believes the keyboard can take you “anywhere,” will keep adding features, and wants to keep building BMXt as a **tool that stays human-centered**.

The sections below describe what BMXt can do today.
Please also take a look at the demo video.

<a id="seed-project"></a>

## 🛠 Seed Project


This repository is a dedicated shell built with **Chrome Extension (Manifest V3) + [WXT](https://wxt.dev/)**. It runs in its own dedicated popup window (tab bar–less single-page chrome via `chrome.windows.create({ type: "popup" })`), not the toolbar action popup. The author handles technical decision-making and verification/design/testing, while implementation is done 100% with an AI assistant (Cursor). At this stage, the project is positioned as a validation and seeding phase focused on eliminating behavioral breakage and polishing UX.

<a id="demo-video"></a>

## 📺 Demo Video

Note: The demo video currently covers the group creation part of the available features.




https://github.com/user-attachments/assets/2e418356-cfce-479a-9880-185e542c5fad







<a id="universal-design-intent"></a>

## ♿️ Universal Design Intent


BMXt is not only an efficiency tool for engineers; it also aims to build reliable, low-effort interaction paths by reducing mouse dependency, keeping key operations consistent, and coexisting well with IME input.

<a id="technical-overview"></a>

## Technical Overview


The following is a technical overview. From the toolbar icon, you can open/focus the BMXt window and run tab/window/group operations plus one-line URL navigation from the command line. Built with [WXT](https://wxt.dev/) (Manifest V3).

**Layout:** Command registry, dispatch, and built-in command logic live in **`lib/features/bmxt-core/`** (TypeScript); Chrome API effects and feature UI live under **`lib/features/<feature>/`** (see also `.cursorrules` in the repo root). **Terminal sessions** (tmux-style: one visible, several in the background) share one BMXt window — see **[`session`](#session)**. List pickers open as **side columns** beside the terminal in the same session pane (**[Picker UI](#picker-ui)**).

**Command-line conventions** (first/second commands, Tab completion, Enter when a second token is required) are summarized in **[Command-line token model](#command-line-token-model)**.

<a id="wxt-project-layout"></a>

### WXT project layout

Extension sources follow [WXT](https://wxt.dev/) conventions. The Manifest V3 definition and Vite/React build options live in **`wxt.config.ts`** (not `package.json`). Entrypoints sit under **`entrypoints/`**; feature logic under **`lib/features/`**; static assets under **`public/`** (copied into the build output).

| Path | Role |
|------|------|
| **`wxt.config.ts`** | Manifest (permissions, CSP, commands), React/Vite config |
| **`entrypoints/background.ts`** | Service worker |
| **`entrypoints/bmxt/`** | BMXt window — `index.html` + `main.tsx` → output **`bmxt.html`** |
| **`entrypoints/bmxt-nav-overlay.content.ts`** | Nav overlay content script (http/https) |
| **`public/_locales/`** | Extension i18n messages (`__MSG_*__` in manifest) |
| **`public/assets/search-cache/`** | `sql-wasm.wasm` (via **`scripts/copy-sql-wasm.mjs`**) |
| **`bmxt-ui.css`** | Full-window terminal styles (React mounts into **`#root`**) |
| **`manifest/bmxt-codegen.json`** | Single source for command registry / dispatch codegen |
| **`.output/chrome-mv3/`** | Production build — load unpacked for manual testing |
| **`.output/chrome-mv3-dev/`** | Dev watch build |
| **`.output/bmxtdemo-<version>-chrome.zip`** | Store zip from **`npm run package`** |

**Build scripts:** **`npm run dev`**, **`build`**, and **`package`** each run **`scripts/copy-sql-wasm.mjs`** and **`scripts/sync-welcome-docs.mjs`** before invoking WXT. **`postinstall`** also runs those scripts plus **`wxt prepare`** (generates **`.wxt/types/`**).

**TypeScript / JSX:** **`tsconfig.json`** uses **`"jsx": "react-jsx"`** (automatic JSX runtime). WXT loads **`@wxt-dev/module-react`** with **`jsxRuntime: "automatic"`** in **`wxt.config.ts`**.

<a id="key-specs"></a>

## Key Specs

- **UI**: Extension page opened in a dedicated popup window without a tab bar (WXT entrypoint **`entrypoints/bmxt/`** → **`bmxt.html`**; `chrome.windows.create({ type: "popup" })`). React mounts into **`#root`** in **`entrypoints/bmxt/index.html`**. Window UI lives in **`lib/features/bmxt-window/`** (`BmxtTerminal`); **`entrypoints/bmxt/main.tsx`** is a thin entry that mounts it. Styles in **`bmxt-ui.css`** at repo root.
- **Input**: Prompt line is rendered with a transparent `textarea` + mirror layer. Supports Japanese IME composition/commit. **Keyboard-first** interaction drives commands, picker focus, and nav; the **mouse** can still **select and copy** displayed text in the log, prompt mirror, picker lists, hints, and the version-upgrade block (`user-select: text` in **`bmxt-ui.css`**). Clicks on picker rows activate a column without moving filter typing focus away from the tab picker search field.
- **State**: Command output logs and command history are stored in `chrome.storage.local`. Keys and caps are defined in **`lib/features/extension-storage/keys.ts`**: **500** log lines (`bmxt_log`), **300** history entries (`bmxt_cmd_history`).
- **Background**: Service Worker (`entrypoints/background.ts`) opens the window on icon click and handles command execution and tab operations.
- **Global shortcuts** (configurable under `chrome://extensions/shortcuts`): **`launch-bmxt`** (default **Shift+Alt+C**) opens BMXt or focuses an existing window; **`reset-bmxt`** (default **Shift+Alt+R**) clears process-scoped session state **and** command history, then opens or focuses BMXt (see **[BMXt process lifecycle](#bmxt-process-lifecycle)**).

<a id="permissions-manifest"></a>

### Permissions (`wxt.config.ts` manifest)


`favicon`, `tabs`, `tabGroups`, `storage`, `unlimitedStorage`, `windows`, `scripting`, `history`, and `bookmarks`. Host patterns `http://*/*` and `https://*/*` are declared as **`optional_host_permissions`**; the Extension requests them **at runtime** when you run commands that inject into web pages (`dom`, `search -list --page`, **`nav -enter`**, and similar). If you deny the prompt, those commands return an error line explaining how to enable access in `chrome://extensions`.

**Data handling (aligned with the privacy policy and store text):** command output and typed history are handled primarily **in memory** for the UI; only capped fields are written to **`chrome.storage.local`** (see **`lib/features/extension-storage/keys.ts`**). The extension page and service worker are not designed to call **`fetch()`** against arbitrary third-party HTTPS URLs; CI runs **`npm run check:no-fetch`** to guard that policy, and the packaged manifest’s **Content Security Policy** (including **`connect-src 'self'`**) is an additional guardrail—Chrome Web Store delivery and browser updates are separate.

The manifest sets **`content_security_policy.extension_pages`** with **`default-src 'self'`**, **`script-src 'self' 'wasm-unsafe-eval'`** (required for **`sql.js`** WebAssembly in the search cache), **`connect-src 'self'`**, **`object-src 'self'`**, **`style-src 'self'`**, **`img-src 'self' data: blob:`**, **`font-src 'self' data:`**, and **`worker-src 'self'`**. Extension UI uses external CSS and Constructable Stylesheets for dynamic layout (no `'unsafe-inline'`). See **`wxt.config.ts`** for the exact string. Extension **version** and npm metadata remain in **`package.json`** (WXT reads **`version`** from there at build time).

<a id="reproducible-builds"></a>

### Reproducible builds


Official releases are tagged in Git (`git tag`). To reproduce a store submission from source, check out that tag and run **`npm ci`** (uses **`package-lock.json`**; do **not** use **`npm install`** in CI or when you want an exact tree) then **`npm run codegen`** and **`npm run build`** (or **`npm run package`**) so the same dependency tree and codegen path apply. See **[npm dependencies and security](#npm-dependencies)** for lockfile policy, audit policy, and maintainer checks.

<a id="npm-dependencies"></a>

### npm dependencies and security


**Direct dependencies** (see **`package.json`**) are **`react@18.2.0`**, **`react-dom@18.2.0`**, and **`sql.js`**. Build tooling uses **`wxt@0.20.18`** and **`@wxt-dev/module-react@1.1.5`** (devDependencies; Vite-based bundler).

**Install for reproducibility**

| Command | When to use |
|---------|-------------|
| **`npm ci`** | **Default** after clone, in CI, and before release builds. Installs **exactly** what **`package-lock.json`** records. |
| **`npm install`** | Only when you intentionally change **`package.json`** (new devDependency, bump a direct dependency, etc.) and will commit the updated lockfile. |

**Dependency pinning** — transitive versions are **not** overridden in **`package.json`**. The full tree is pinned in **`package-lock.json`** (exact versions + integrity hashes). Use **`npm ci`** everywhere you need a known-good tree. **`.npmrc`** is **gitignored** (never commit tokens or local registry config). When you run **`npm install`** to add a direct dependency, either pin the version in **`package.json`** yourself (no **`^`**) or set **`save-exact=true`** in your **local** **`~/.npmrc`** or project **`.npmrc`** (local only).

Recommended local flow after pulling lockfile changes:

```bash
rm -rf node_modules
npm ci
npm run build
```

**Node.js version** — use **`.nvmrc`** (recommended Node for this repo).

**CI** (**.github/workflows/ci.yml**) runs **`npm ci`**, **`npm audit --audit-level=critical`**, tests, and **`npm run build`**. **`npm audit fix --force`** must **not** be used without reviewing the suggested dependency changes.

**Known residual audit items** — **`npm audit`** may report issues in WXT’s build-time toolchain (Vite, esbuild, etc.). These are **not shipped** in the extension bundle. CI gates on **critical** only.

**After any dependency change**, run **`npm ci`**, **`npm run build`**, **`npm test`**, and **`npm audit --audit-level=critical`**, and commit **`package.json`** and **`package-lock.json`** together.

<a id="command-line-token-model"></a>

## Command-line token model (first / second commands)


BMXt’s shell is **command-line driven**. Specs and implementations should use a consistent token model:

1. **First command, then second command** — Name the **first command** (e.g. `tabs`, `session`) and, when applicable, the **second command** next (e.g. `-list`, `-new`). Documentation and parsing follow that order.
2. **No abbreviated spellings for first/second commands** — Do not register alternate short forms for either tier (e.g. do **not** map `-l` to `-list`). **Tab completion** should offer **canonical full tokens** only for this pattern. Older top-level aliases in the README (e.g. `help`/`?`) may remain for backward compatibility; **do not** add new short aliases when introducing **new** first/second families.
3. **Enter when a second command is required** — If the first command is **not actionable** without a configured second command, pressing **Enter** with only the first token must show **usage or a placeholder** for the missing second token, then **restore the prompt** to `firstCommand ` (first command plus one trailing ASCII space) with the **cursor at the end**, ready to type the rest. Implement this through the shared **continuation** path (see **`.cursorrules`** and the first bullet under **[Command add procedure](#command-add-procedure)**), not one-off handlers per command.

<a id="command-list"></a>

## Command List


`help` or `?` shows the same command overview as in-app help.

| Command | Description |
|----------|------|
| `help` / `?` | Show help |
| `aboutbmxt` | Open the BMXt welcome page in a **new browser tab** (see **[`aboutbmxt`](#aboutbmxt)**) |
| `clear` | Clear logs |
| `exit` | Close the **active terminal session**; when it is the **last** session, close the BMXt window and **end the BMXt process** (all persisted process state is cleared — see [BMXt process lifecycle](#bmxt-process-lifecycle)) |
| `tabs` | Show available options, then restore prompt to `tabs ` for option input |
| `tabs -list [-u]` | Open tab picker column; supports search, multi-select marker `#`, and bulk modes |
| `tabs -exit -list` | Close tab picker column in this session (including `group new` picker) |
| `tabs -setting -page-active --auto \| --manual` | Tab picker: toggle whether moving the highlight auto-activates the tab (`--auto` default; `--manual` uses Alt+↑↓); saved in `chrome.storage.local` |
| `tabs -moveurl <url>` | Focus matching URL tab or open new tab (http/https) |
| `tabs -nowurl` | Print current tab URL |
| `dom` | Print usage and restore the prompt to `dom ` (trailing space) so you can enter `-list` |
| `dom -list [--html\|--react] [<pattern>]` | Open a read-only DOM picker column for the active tab (same picker chrome as `search -list`); flavor `--html` (default) or `--react`; optional case-insensitive substring filter on rendered lines (not a regex); scriptable http(s) only; may prompt for optional site access |
| `dom -exit -list` | Close DOM list picker column in this session |
| `search` | Print usage and restore the prompt to `search ` for `-list` |
| `search -list [--all\|--history\|--bookmark\|--page] [<pattern>]` | Open a search picker column. **`--all`** (default when you run **`search -list `** with no scope token) searches history, bookmarks, and open http(s) tab text in parallel; single-scope flags limit to one source. Scan progress shows inside the picker (batched updates). **→** opens a **detail list** (subdivided hits) or **`[history]`** **open-target** tree; **←** returns to results. Case-insensitive substring (no regex in v1) |
| `search -exit -list` | Close search list picker column in this session (cancels an in-flight **`search-list`** job via the session job runner) |
| `nav` | Print usage and restore the prompt to `nav ` (trailing space) for `-enter` or `-exit` |
| `nav -enter` | Arm **nav mode** in this BMXt pane (see **[Nav mode](#nav-mode)**); does not show the page overlay until you press **Alt** on the prompt |
| `nav -exit` | Fully disarm nav in this pane (**Alt** must have turned the overlay **OFF** first) |
| `translate` | Print usage and restore the prompt to `translate ` for `-on`, `-off`, or `-setting` |
| `translate -on` | Enable translation assist (nav typing preview under the prompt; see **[`translate`](#translate)**) |
| `translate -off` | Disable translation assist |
| `translate -setting` | Restore `translate -setting ` and show `--ja-en` / `--en-ja` choices (Tab menu) |
| `translate -setting --ja-en` | Save **ja → en** pair (default); round-trip preview and nav commit use English on Alt hold |
| `translate -setting --en-ja` | Save **en → ja** pair; round-trip preview and nav commit use Japanese on Alt hold |
| `setting` | Print usage and restore the prompt to `setting ` for `-list` |
| `setting -list` | Open the **settings picker** column (UI locale, terminal appearance, optional per-picker appearance, export/import zip); changes apply only after **`> save setting`** in the picker |
| `setting -exit -list` | Close the settings picker column in this session |
| `session` | Print usage and restore the prompt to `session ` for second tokens (see **[`session`](#session)**) |
| `session -new [name]` | Create a new **terminal session** and switch to it; optional display name |
| `session -list` | Inline session picker on the prompt (↑↓ · **Enter** / **1–9** switches immediately by index) |
| `session -switch [name]` | Inline session picker by **display name** (type to filter · **Enter** inserts `session -switch <name>` · **Enter** again runs switch); direct `session -switch <name>` also works |
| `session -next` / `session -prev` | Cycle the active terminal session |
| `session -setting-name [name]` | Rename the current session (bare: prompt pre-filled with current display name) |
| `session <n>` | Switch to terminal session number **n** (1-based) |
| `close` / `c <tabId>` | Close tab |
| `group new` / `group new <tabId> …` | Create tab group — interactive tab picker when no tab ids, or non-interactive with explicit ids |

**Note — `clear` vs `exit` vs closing the window:** `clear` only clears the **on-screen log of the active terminal session**; the BMXt window and all other persisted process state stay as they are. **Closing the BMXt window** (× button) or **`exit`** on the **last** session closes the window and **clears process-scoped storage** (terminal sessions, picker UI, tab-picker fold state). **Command history is kept** unless you use the **`reset-bmxt`** shortcut. **`exit`** with **multiple sessions** removes only the active session and switches to another. See **[BMXt process lifecycle](#bmxt-process-lifecycle)**.

<a id="bmxt-process-lifecycle"></a>

### BMXt process lifecycle (`clear` / window close / `exit`)

**Closing the BMXt window** (×) or **`exit`** on the **last** terminal session clears **process-scoped** session state from **`chrome.storage.local`** (terminal sessions, picker UI, tab-picker fold). **Prompt command history** (`bmxt_cmd_history`) survives and is available in the next session. Use the **`reset-bmxt`** shortcut to clear history too. Reopening BMXt (toolbar, **`launch-bmxt`**, etc.) starts a **fresh empty terminal** while history remains.

| Action | Session logs | Open picker columns & `paneFocus` | Tab picker tree fold | Command history |
|--------|--------------|-------------------------------------|----------------------|-----------------|
| **`clear`** | Cleared (active session) | Kept | Kept | Kept |
| **Close BMXt window** | **All cleared** | **Cleared** | **Cleared** | **Kept** |
| **Reopen BMXt window** | Fresh empty | Cleared | Cleared | **Restored** |
| **`exit`** (multiple sessions) | Active session removed; switches to another | That session’s pickers cleared | Kept | Kept |
| **`exit`** (last session) | **All cleared** | **Cleared** | **Cleared** | **Kept** |
| **`reset-bmxt` shortcut** | Cleared | Cleared | Cleared | **Cleared** |

**Process-scoped storage keys** (removed when the **last** pane **`exit`**s or the BMXt window is closed):

| Key | Contents |
|-----|----------|
| `bmxt_terminal_sessions_v1` | Terminal sessions (v5): per-session logs, `order`, `activeId`, display `namesById` |
| `bmxt_process_ui_v1` | Open picker slots per session (`tabs` / `search` / `dom` / `setting`) and `paneFocus` |
| `bmxt_tab_picker_fold_v1` | Collapsed window / tab-group rows in the tab picker |

**Not cleared on process exit** (user / browser metadata): prompt command history (`bmxt_cmd_history`) — cleared only by **`reset-bmxt`** — custom window display names, UI settings (`bmxt_ui_settings_v1` — locale and appearance), translation assist settings, tab/search picker settings (`page-active`), search metadata cache (`bmxt_search_cache_db_v1` — **`--history`** / **`--bookmark`** titles and URLs only; **`--page`** body text is **not** stored), optional job audit log (`bmxt_job_db_v1`), last normal window id, welcome/version tracking keys.

**Implementation:** `removeAllTerminalSessionsFromStorage` in **`lib/features/bmxt-window/terminal-sessions/state-storage.ts`**; UI persistence in **`lib/features/bmxt-window/process-ui-state-storage.ts`** and **`lib/features/tabs/tab-picker-fold-state.ts`**.

**Note:** **`tabs -exit -list`** (and other **`* -exit -list`**) only closes a picker column in the current session; it does **not** end the BMXt process or clear tab-picker fold state.

**Terminal sessions and picker columns:** With **two or more** terminal sessions, **Ctrl+← / Ctrl+→** (BMXt window focused) cycles the active session. Inside the active session, **Ctrl+Left / Ctrl+Right** moves focus along **terminal → tabs → search → dom → setting** (only among open columns). See **[Picker UI (side columns)](#picker-ui)** and **[`session`](#session)**.

<a id="aboutbmxt"></a>

### `aboutbmxt`

**`aboutbmxt`** is a single-token built-in command (no second command). Run it from the BMXt prompt to open the **GitHub Pages welcome page** ([`https://unrsports.github.io/bmxt/welcome.html`](https://unrsports.github.io/bmxt/welcome.html)) in a **new browser tab** (same URL and tab behavior as install/update auto-open).

| Input | Effect |
|-------|--------|
| **`aboutbmxt`** | Opens the welcome page via **`open_welcome_page`** (Service Worker → **`openWelcomePageTab`** / **`chrome.tabs.create`**). UI locale is passed as **`lang`**; manifest version as **`v`**. The terminal logs a short confirmation line. |

**Page content:** static **`docs/welcome.html`** on GitHub Pages. Version history bullets come from **`lib/features/welcome/welcome-content.json`** (each entry: **`version`**, **`ja`**, **`en`** string arrays). **`scripts/sync-welcome-docs.mjs`** copies that JSON to **`docs/welcome-content.json`** on **`dev` / `build` / `package` / `postinstall`**. Optional hero/screenshots live under **`docs/welcome/`** (referenced from **`docs/welcome.html`**, e.g. **`welcome/manual_howToUseBMXt.png`**).

**Related behavior (not this command):** on extension **install** or **update**, **`openWelcomePageOnUpdateIfNeeded`** opens the same URL **once per version** in a **normal tab** (tracked by **`LAST_SEEN_WELCOME_VERSION_KEY`**). **Manual preview:** `https://unrsports.github.io/bmxt/welcome.html?lang=en&v=0.6.0` (omit **`v`** → all versions in JSON; invalid **`v`** is ignored). See **[Version upgrade banner & release notes](#version-upgrade-banner)** for the in-window upgrade block (separate from this page).

**Implementation:** **`lib/features/bmxt-core/cmd/aboutbmxt.ts`**, **`lib/features/dispatch/handlers/effects/open-welcome-page.ts`**, **`lib/features/welcome/open-welcome-page-tab.ts`**, **`lib/features/welcome/welcome-external-url.ts`**, static page **`docs/welcome.html`**.

<a id="dom-command"></a>

### `dom`

- Bare `dom` + **Enter** prints the usage block and restores the prompt to **`dom `** so you can type `-list` (same continuation pattern as other first commands with manifest `subcommands`).
- **`dom -list` only** + **Enter** opens the **`--html` / `--react` flavor menu** (third token required before the picker runs); see **[How columns open](#picker-ui)**.
- **`dom -list --html` …** / **`dom -list --react` …** resolve the **active tab of the last-focused normal browser window**, inject a read-only helper via `chrome.scripting`, and stream a flattened DOM outline into the picker. **Scriptable http(s)** pages only (`chrome://`, the Chrome Web Store, `chrome-extension://`, etc. are rejected with an error line). **Optional host permission** may be requested before injection, like other page-reading commands.
- **`--html`** (default) vs **`--react`** only changes how nodes are labeled in the picker UI.
- Any tokens after the optional flavor flag are joined into a single **substring** filter on the printed lines (ASCII case fold); **not** a regular expression. ASCII `"…"` / `'…'` around the pattern are stripped once.

<a id="search-command"></a>

### `search`

- Bare `search` + **Enter** prints the usage block and restores **`search `**.
- **`search -list` only** (no trailing space) + **Enter** restores the prompt to **`search -list `** (continuation). **`search -list `** + **Enter** runs a cross-scope search (**`--all`**: history + bookmarks + open http(s) tab text). Tab after **`search -list `** completes **`--all`**, **`--history`**, **`--bookmark`**, or **`--page`** if you want a single scope (see **[How columns open](#picker-ui)**).
- **`search -list [--all|--history|--bookmark|--page] [<pattern>]`** opens the same list picker chrome as `dom -list`. **`--all`** dispatches all three effect scopes in parallel. Repeat **`--history`** / **`--bookmark`** scans may use local SQLite metadata cache (`bmxt_search_cache_db_v1`). **`--page`** (and the page leg of **`--all`**) reads each open http(s) tab **live** — page body text is **not** cached or auto-prefetched. Progress lines appear **inside the picker** (rAF-batched in the active shell) and are hidden when results arrive.
- **`Ctrl+C`** on the prompt or **`search -exit -list`** cancels an in-flight **`search-list`** job for this session (see **[Job execution](#job-execution)**).
- In the results list, **`→`** opens **detail** when the URL is **already open** in a tab and the row has subdivided hits; otherwise **`→`** on **`[history]`** rows opens **open-target** when the tab is **not** open (regardless of detail hits). **`←`** or **`Esc`** steps back one level. **`Enter`** on a results row opens in a new tab (or jumps when a page hit applies); **`Enter`** on a detail row activates the source tab and scrolls to the hit; **`Enter`** on an open-target row opens the URL at the chosen target.
- **Open-tab rows only:** **`Ctrl+↑` / `Ctrl+↓`** jump among rows whose URL is already open in a tab (with animated list scroll). In **`--auto`** page-active mode, preview runs on each jump.
- **`Alt+↑` / `Alt+↓`** ( **`--manual`** page-active only): preview the highlighted row in the background tab without changing normal **`↑`/`↓`** highlight rules.
- **Detail bar** (status strip under the prompt while the search picker is open): with the caret at **end-of-line**, **`→`** selects the bar; **`←`** returns to the prompt; **`Tab`** / **`Shift+Tab`** cycle visible detail bars; **`Alt`** toggles **`--auto` / `--manual`** page-active (saved in **`chrome.storage.local`**); **`→`** from the bar enters the search picker column. Open-tab result rows show **favicons** when available.
- Patterns use the same **case-insensitive substring** rules as `dom` (no regex v1); optional ASCII quotes are stripped. **`search -list … --page`** walks non-discarded **http(s)** tabs on demand (visible `innerText` per tab via content script / `executeScript`; **not** persisted to the search SQLite cache) and may trigger the extension’s **optional host permission** prompt the first time.

<a id="nav-mode"></a>

### Nav mode (`nav -enter` / `nav -exit`)

**Nav mode** drives a **virtual pointer overlay** on the **active tab of the last-focused normal browser window** (same target resolution as **`dom -list`**). It is **not** a side picker column; state lives in the BMXt window UI and a **tmux-style status strip** under the prompt shows **`nav`**, **ON/OFF**, and the **target tab title**.

**Commands (second token required)**

| Input | Effect |
|-------|--------|
| Bare `nav` + **Enter** | Prints usage and restores the prompt to **`nav `** (continuation; Tab completes **`-enter`** / **`-exit`** only — no short aliases). |
| **`nav -enter`** | **Arms** nav in this session pane. May request **optional http(s) host permission** (same family as `dom -list`). The page overlay is **not** shown yet. |
| **`nav -exit`** | **Disarms** nav (clears per-tab position memory and removes overlays). Fails with an error if the overlay is still **ON** — press **Alt** to turn it **OFF** first. |

**After `nav -enter` — Alt toggles overlay ON/OFF**

- Requires the **BMXt window** to be active and **keyboard focus on the terminal prompt column** (`paneFocus === "terminal"`). **Ctrl+← / Ctrl+→** to a **tabs / search / dom** picker column **suspends** nav keys until you return focus to the prompt.
- Each **Alt** press toggles overlay **ON** or **OFF**.
- **ON:** injects or updates the overlay on the target tab. The cursor appears at the **viewport center** on each **ON** (not at the OS mouse position). **↑ / ↓ / ← / →** move the virtual cursor (default **12px** per step; configurable later in `lib/features/nav/nav-config.ts`). **Enter** performs a **left-click** on the element under the cursor, or enters **typing mode** when the target is an editable field (see below).
- **OFF:** removes the overlay from the current tab; nav stays **armed** until **`nav -exit`**.

**Overlay keys (ON, terminal prompt focused)**

| Key | Effect |
|-----|--------|
| **↑ / ↓ / ← / →** | Move virtual cursor (viewport auto-scrolls near edges) |
| **Enter** | Left-click at cursor; on **input**, **textarea**, or **contenteditable**, open **typing mode** instead (type on the BMXt command line) |
| **Ctrl** (tap) | Open the on-page **context menu** at the cursor |
| **Alt** (tap) | Toggle overlay **OFF** (ignored while **typing mode** is active) |

**Context menu** (**Ctrl**): **↑ / ↓** choose a row, **Enter** run, **← / →** browser **back** / **forward**, **Ctrl** or **Esc** close without running.

| Item | Action |
|------|--------|
| Select text | Range pick: **↑ / ↓** move, **Enter** set **start**, move again, **Enter** set **end**; selection is applied and a **Copy** row appears |
| Save image under cursor | Download the image at the pointer (http(s) URL) |
| Reload page | Reload the target tab |

After text selection, **Copy** + **Enter** writes the selection to the system clipboard. **Esc** clears the selection (and closes the copy menu when open).

**Typing mode** (after **Enter** on an editable field): the BMXt prompt shows a typing hint; text is mirrored into the page field. **Alt** **hold** (~500ms) **commits**; **Esc** **hold** **cancels** and restores the previous value. Multiline fields allow newlines (**Shift+Enter** on the prompt). Short **Alt** does not toggle the overlay while typing.

When **`translate -on`** is active, typing mode also shows a **source → target → source** round-trip preview strip under the prompt (completed sentences end with `。` `.` `!` `?` `！` `？`, etc.). **Alt hold** commit sends the **target language** for the saved pair (**English** with **`--ja-en`**, **Japanese** with **`--en-ja`**) assembled from translation blocks (see **[`translate`](#translate)**), not the raw buffer.

The status strip under the prompt shows modes such as **`nav`**, **ON/OFF**, **typing**, **menu**, **sel-start** / **sel-end**, **copy**, plus the target tab title or a short error.

**Tab changes while armed**

- Switching the active tab in the normal browser window **keeps nav armed**. The overlay is recreated on the new tab. **Position is remembered per tab**; switching back restores the last position. **Alt ON** on a tab always starts from the **center** again.

**Pages and permissions**

- **Scriptable http(s)** only (`chrome://`, Chrome Web Store, `chrome-extension://`, etc. are rejected). The status strip shows a short error (for example **`site access denied`**) when injection fails.
- After installing or reloading the extension, **reload the target page once** so the WXT **content script** (`entrypoints/bmxt-nav-overlay.content.ts`) is registered; if the script is not loaded yet, the Service Worker falls back to **`chrome.scripting.executeScript`**.

**Implementation**

- **`lib/features/nav/`** — prompt parsing, status bar, session hook (`useNavMode`), inject snippet, Service Worker runner (`run-nav-inject.ts`).
- **`lib/features/bmxt-window/bmxt-shell.tsx`** — handles **`nav -enter` / `nav -exit`** before `RUN_CMD`; **Alt** / nav **Enter** / arrow keys on the prompt.
- **`entrypoints/background.ts`** — `NAV_CONTROL` message runs inject on the target tab.
- **`entrypoints/bmxt-nav-overlay.content.ts`** — content script listener on http(s) pages.

<a id="translate"></a>

### `translate` (`translate -on` / `translate -off` / `translate -setting`)

**`translate`** enables Chrome’s built-in **`Translator` API** (Japanese ↔ English) for **nav typing mode** assist (preview under the BMXt prompt). The active direction is stored as a **translation pair** in **`chrome.storage.local`** (**`TYPING_TRANSLATE_KEY`**: `{ enabled, pair }`).

| Input | Effect |
|-------|--------|
| Bare `translate` + **Enter** | Prints usage and restores **`translate `** (continuation). Tab completes **`-on`** / **`-off`** / **`-setting`** only — no short aliases. |
| **`translate -on`** | Enables translation assist. Log line includes the current pair token (e.g. **`--ja-en`**). Nav typing shows a preview strip under the prompt. |
| **`translate -off`** | Disables assist. |
| **`translate -setting`** + **Enter** | Prints pair choices and restores **`translate -setting `** (continuation). Tab completes third tokens **`--ja-en`** / **`--en-ja`**. |
| **`translate -setting --ja-en`** | Saves pair **`ja-en`** (source **JA** → target **EN**, back-translation to **JA**). Resets in-flight translation blocks. |
| **`translate -setting --en-ja`** | Saves pair **`en-ja`** (source **EN** → target **JA**, back-translation to **EN**). Resets in-flight translation blocks. |

**Translation pair (`-setting`)**

- Pairs are defined in **`lib/features/translate/translation-pair.ts`** (`TRANSLATION_PAIRS`). Adding a language later means extending that table and manifest **`trailingTokens`** — not hard-coding ja/en in UI components.
- **`--ja-en`** (default): round-trip **ja → en → ja**; nav **Alt hold** commit sends **English** (`forward` field).
- **`--en-ja`**: round-trip **en → ja → en**; nav **Alt hold** commit sends **Japanese**.

**Panel labels (原文 / 訳 / 再訳)**

- Nav typing preview uses three sections: **source**, **forward** (訳), **back** (再訳). Headings are **bilingual** (Japanese line + English subline) and reflect the active pair, e.g. **`原文（JA）`** / **`Source (Japanese)`**, **`訳（EN）`** / **`Translation (English)`**, **`再訳（JA）`** / **`Back-translation (Japanese)`** for **`--ja-en`**; tags swap for **`--en-ja`** (`getTranslationFieldLabels`).

**Status bar**

- While assist is **ON**, the translate status strip shows the current pair token (e.g. **`--ja-en`**) plus mode hints (nav typing / busy). Commit hint text follows the pair (English vs Japanese on Alt hold).

**Nav typing**

- With assist **ON**, **nav typing mode** shows the preview strip under the BMXt prompt. Each **completed sentence** (closing punctuation such as `。` `.` `!` `?` `！` `？`) triggers **round-trip** preview blocks (訳 / 再訳) for the saved pair.
- Requires a Chrome build with the **`Translator`** API and availability for the pair’s **source→target** languages; otherwise a short status line is shown.
- **Alt hold** commit injects text built from completed blocks via **`buildEnglishCommitText`** (uses **`translateForward`** for the active pair — target language on commit).

**Implementation:** **`lib/features/translate/`** (`translation-pair.ts`, `translator-service.ts`, `parse-translate-command.ts`), **`lib/features/bmxt-core/cmd/translate.ts`**, UI in **`bmxt-shell.tsx`** (handled before `RUN_CMD`; no side picker column).

<a id="setting"></a>

### `setting` (`setting -list` / `setting -exit -list`)

UI locale and **terminal + picker appearance** are edited in a dedicated **settings picker** side column. Persisted in **`chrome.storage.local`** under **`bmxt_ui_settings_v1`** (`lib/features/extension-storage/keys.ts`). The Service Worker **`run`** for **`setting`** prints usage only; open/close and all edits are **UI-handled** in **`bmxt-shell.tsx`** before **`RUN_CMD`**.

| Input | Effect |
|-------|--------|
| Bare **`setting`** + **Enter** | Prints usage and restores **`setting `** (continuation). Tab completes **`-list`** / **`-exit`** (then **`-list`** for exit). |
| **`setting -list`** + **Enter** | Opens the **setting** picker column with a draft copy of current settings. |
| **`setting -exit -list`** + **Enter** | Closes the setting picker column in this session (does not write storage). |

**Draft, preview, commit**

- Edits in the picker update a **draft** only. The live BMXt UI keeps the **last saved** settings until you commit.
- The **Preview** panel at the bottom of the picker reflects the draft (split **Terminal** / **Picker** panes when **`edit-picker: on`**).
- **`> save setting`** — writes draft to **`bmxt_ui_settings_v1`** and applies immediately.
- **`> cancel setting`** — discards the draft and restores values from storage.

**Main list (picker)**

| Row | Action |
|-----|--------|
| **language** | `--japanese` / `--english` (UI display language) |
| **edit-picker** | **`on`** — show extra rows to customize picker columns separately; **`off`** — picker columns follow global appearance |
| **fg**, **bg-color**, **size**, **font**, **bg-image** | Global appearance (terminal **and** picker when `edit-picker` is **off**) |
| **fg (picker)**, … | Shown only when **`edit-picker: on`**; override picker column theme (unset fields inherit global) |
| **reset-default** | Confirm, then reset appearance draft to defaults |
| **export** | Download zip (`settings.json` v2 + `background-image.*`; optional `picker-background-image.*` when set) |
| **import** | Load zip into draft (commit with **`> save setting`**) |
| **`> save setting`** / **`> cancel setting`** | Commit or discard draft |

**Appearance rules**

- **`edit-picker: off` (default):** one **global** theme. Background image is painted once on the **terminal + picker split row** so it **spans both columns** continuously (`data-bmxt-unified-bg` on `html`).
- **`edit-picker: on`:** terminal and picker columns may differ (text/background/size/font/image). Preview shows **Terminal** and **Picker** side by side.

**Picker keyboard (setting column)**

| Key | Main list | Choice sub-lists (language, size, …) | Detail / edit (fg, colors, font) |
|-----|-----------|--------------------------------------|----------------------------------|
| **↑** / **↓** | Move highlight | Move highlight (current value pre-highlighted) | — |
| **→** / **Enter** | Enter sub-view or run immediate action (export/import) | Apply choice to draft + return to main | Start inline edit |
| **←** / **Esc** | — | Back to main | Cancel edit, or back to main |
| **Enter** (editing) | — | — | Apply typed value to draft preview |
| **Esc** (column) | Return focus to **prompt** (column stays open) | | |

Hex colors support live preview while typing in edit mode.

**Implementation:** **`lib/features/setting/`** (`settings.ts`, `appearance.ts`, `apply-appearance.ts`, `setting-picker-*.tsx`, `settings-export.ts`), picker slot **`setting`** in **`lib/features/side-picker/`**, UI wiring in **`bmxt-shell.tsx`**.

<a id="session"></a>

### `session` (terminal sessions)

BMXt supports **tmux-style terminal sessions** inside one BMXt window: several independent terminal contexts exist, but **only one is visible** at a time. Background sessions keep their own **log lines**, **open picker columns**, **nav armed** state, **detail bars**, and related per-session UI. **Command history** (`bmxt_cmd_history`) is **shared** across all terminal sessions so you can recall `session -switch <name>` lines with ↑/↓.

Persistence is **`bmxt_terminal_sessions_v1`** (v5: `logsById`, `order`, `activeId`, `namesById`) in **`lib/features/bmxt-window/terminal-sessions/state-storage.ts`**. The Service Worker **`run`** for **`session -list`**, **`session -switch`**, and **`session -setting-name`** prints guidance only; switching and rename UX are **UI-handled** in **`bmxt-shell.tsx`** before **`RUN_CMD`**.

| Input | Effect |
|-------|--------|
| Bare **`session`** + **Enter** | Prints usage and restores **`session `** (continuation). Tab completes second tokens. |
| **`session -new [name]`** + **Enter** | Effect **`session_new`**: create session, switch to it. Name omitted → auto from open pickers or last non-session command in the source log. |
| **`session -list`** + **Enter** | Opens an **inline floating candidate menu** on the prompt (not a side column). Labels `*n  displayName`. **↑↓** · **Enter** / **1–9** switch **immediately** (command recorded as `session -list`). |
| **`session -switch`** (or Tab-pick **`-switch`**) | Opens the **inline name menu** with all sessions (`*displayName`). **Does not** auto-insert the active session name. |
| **`session -switch`** menu | **Type** to filter (incremental **contains**, same model as the second-command token picker). Menu stays until **Enter** or **Esc** (even while filtering). **Enter** inserts the canonical line `session -switch <name>` into the prompt (picker closes). **Enter** again executes the switch and appends the full line to history. **Esc** dismisses the menu. |
| **`session -switch <name>`** + **Enter** | Direct switch by display name (duplicate names use `name (index)` in the command line). |
| **`session <n>`** + **Enter** | Direct switch by 1-based index. |
| **`session -next`** / **`session -prev`** + **Enter** | Effects **`session_next`** / **`session_prev`**. |
| Bare **`session -setting-name`** + **Enter** | Inline rename on the prompt (pre-filled with current display name). |
| **`session -setting-name <name>`** + **Enter** | One-line rename. |

**Session bar and shortcuts**

- When **two or more** terminal sessions exist, a **session bar** at the top of the BMXt window lists them (`index` + display name). Click a tab to switch.
- **Ctrl+←** / **Ctrl+→** (BMXt window focused, **2+** sessions) cycles the active session without closing background sessions.

**Performance (switch / create):** Only the **active** session and **previously visited** sessions mount a full **`BmxtShell`**; never-visited background sessions use a lightweight placeholder until first visit. **`activeId`** updates optimistically on switch; **`chrome.storage.onChanged`** applies the incoming snapshot without an extra read. Unchanged log arrays are reused so inactive panes skip redundant re-renders (**`lib/features/bmxt-window/terminal-sessions/sessions-ui-equality.ts`**). Long-running picker work in one session does not block prompt input in another (separate job runners per session id — see **[Job execution](#job-execution)**).

**Implementation:** **`lib/features/session/`** (`session-input.ts`, `session-summary.ts`, `session-list-candidate-panel.tsx`, `session-bar.tsx`), UI in **`bmxt-shell.tsx`** / **`bmxt-terminal.tsx`**, effects **`session_new`** / **`session_next`** / **`session_prev`** in **`lib/features/dispatch/handlers/effects/`**.

<a id="picker-ui"></a>

### Picker UI (side columns)

When a list picker is opened from the prompt, **`lib/features/bmxt-window/bmxt-shell.tsx`** lays out the focused session leaf as a horizontal strip:

**Terminal (log + prompt)** | **tabs** (if open) | **search** (if open) | **dom** (if open) | **setting** (if open)

Several picker columns may be open at once in the same pane. Session state is **`sessionPickers`** per leaf (`tabs` / `search` / `dom` / `setting` slots). While the BMXt process is alive, **open columns, `paneFocus`, tab-picker highlight/marks, and tree fold state** are persisted to **`chrome.storage.local`** and restored after closing and reopening the BMXt window (see **[BMXt process lifecycle](#bmxt-process-lifecycle)**). **`SessionPickerColumns`** in **`lib/features/side-picker/wrappers/session-picker-columns.tsx`** renders open columns (`PICKER_SLOT_ORDER`: tabs → search → dom → setting).

**Four layers (side picker)**

| Layer | Role | Main paths |
|-------|------|------------|
| ① Parent terminal | Log, prompt, picker launch/close | `lib/features/bmxt-window/bmxt-shell.tsx`, `bmxt-terminal.tsx` |
| ② Panel host | Column chrome, blue focus border, click-to-activate | `lib/features/side-picker/panel/picker-panel-host.tsx` |
| ③ Command wrapper | Slot entry + keyboard wiring | `url-list-picker-wrapper.tsx`, `dom-picker-wrapper.tsx`, `tabs-picker-wrapper.tsx`, `setting-picker-wrapper.tsx` |
| ④ Command body | Flat lines vs hierarchical tab rows vs dom prompt vs settings | `PlainTextPickerBody` (search/dom lines), `TabsUrlListPicker` + `TabPickerRowList` (tabs), `dom/dom-prompt-render.tsx`, `setting-picker-body.tsx` |

**Shared keyboard:** **`usePlainPickerKeyboard`** in `lib/features/side-picker/hooks/` drives `/`, `:`, `n`/`N`, **`Esc` → prompt**, vertical navigation, and **Ctrl+←/→** pane-strip navigation via the interaction kernel (`lib/features/side-picker/interaction/picker-*.ts`). **search** and **dom** line columns use it directly; **tabs** adds **`useTabPickerPlainExtensions`** (`lib/features/tabs/use-tab-picker-plain-extensions.ts`) for bulk/edit, `#` / `Tab`, Shift range, and layered **`Esc`**.

**Shared list chrome:** **`PickerListShell`** (`chrome/picker-list-shell.tsx`) — headline, invisible IME `textarea`, list slot, search/command footers. **tabs** render through **`TabsUrlListPicker`** on this shell. **search** / **dom** line lists still use **`PlainTextPickerBody`** (same CSS classes, optional virtualization; may move to `PickerListShell` later).

**`PickerEntry` (search)**

Search hits are normalized to **`PickerEntry`** (`url`, `source`, display line) before render. **`[history]`** rows: **`→`** opens the in-picker **open-target** tree; **`Enter`** on a results row dispatches **`open_url_new_tab`** (or in-tab jump when a page hit applies). Implementation: **`lib/features/search/search-open-destination.ts`**, **`open-search-picker-entry.ts`**, wired from **`bmxt-shell.tsx`**.

**Focus and blue border**

- **`paneFocus`** selects the active column: `terminal` → `tabs` → `search` → `dom` → `setting` (skipping columns that are not open).
- The active column gets a **blue outline** (`.bmxt-split-pane--focused`).
- When a column **newly opens** or receives focus from the **detail bar**, keyboard focus and the outline move to that column; the focused picker column **animates to the left** of other open columns (`usePickerColumnFlip`).
- **Ctrl+Left / Ctrl+Right** walk the strip inside the active session. With **two or more** terminal sessions, **Ctrl+← / Ctrl+→** also cycles the active session (see **[`session`](#session)**).
- Clicking a column activates it the same way.

**Detail bars (mode status strips under the prompt)**

While a picker is open (or nav / translate assist is active), a **detail bar** appears under the prompt for that mode (`tabs`, `search`, `dom`, `setting`, `nav`, `translate`). Common keys when the **terminal** column is focused:

| Key | Effect |
|-----|--------|
| **`→`** (caret at **end-of-line**) | Select the leftmost visible detail bar |
| **`←`** (from a detail bar) | Return focus to the prompt |
| **`Tab`** / **`Shift+Tab`** | Cycle among visible detail bars |
| **`Alt`** (tabs / search detail bar) | Toggle **`--auto` / `--manual`** page-active (persisted) |
| **`→`** (from a detail bar) | Enter the matching picker column (column moves left with animation) |

Each bar shows mode-specific hints (e.g. tabs/search: `EOL → focus · ← prompt · Alt page-active · → picker · tab ←/→ detail bar`). **`useDetailBarKeyboard`** in **`lib/features/bmxt-window/use-detail-bar-keyboard.ts`** wires these keys.

**`Esc` vs closing**

- **`Esc` does not close a picker column.** At the top level of any picker, **`Esc` returns focus to the BMXt prompt** in the session that launched the picker; columns stay visible.
- **Tab picker only:** nested submodes unwind with **`Esc`** first (`#` marks → `:` command mode → `/` search → bulk submode → then **return to prompt**). See [Tab Picker (`tabs -list`)](#tabs-tab-picker).
- **Close a column** from the prompt in the **same session**:

| Command | Closes |
|---------|--------|
| `tabs -exit -list` | Tab picker (including interactive **`group new`**) |
| `search -exit -list` | Search list picker |
| `dom -exit -list` | DOM list picker (including the permission confirmation panel) |
| `setting -exit -list` | Settings picker |

Service Worker **`run`** for `*-exit -list` prints usage hints only; the window UI performs the actual close.

**How columns open (UI-first)**

| Input | Behavior |
|-------|----------|
| `tabs -list` / `tabs -list -u` | Opens the tab picker column |
| `group new` (no tab ids) | Opens the tab picker in **group-new** variant |
| `search -list` only (no trailing space) + **Enter** | Restores the prompt to **`search -list `** (continuation) |
| `search -list ` + **Enter** | Runs cross-scope **`--all`** search (progress in picker), then shows results in the search column |
| `search -list [--all|--history|--bookmark|--page] [<pattern>]` + **Enter** | Runs search for the chosen scope (or all three with **`--all`**) |
| `dom -list` only + **Enter** | Shows the `--html` / `--react` flavor menu |
| `dom -list --html` or `--react` … + **Enter** | Fetches DOM output, opens the dom column |
| `setting -list` + **Enter** | Opens the settings picker column (see **[`setting`](#setting)**) |
| `translate -on` + **Enter** | Enables translation assist (prompt stays focused) |

**Settings picker column (`setting -list`)**

- Draft / preview / **`> save setting`** / **`> cancel setting`** — see **[`setting`](#setting)**.
- **`Esc`** at the column top level returns to the **prompt** (column stays open); **`setting -exit -list`** closes it.
- Keyboard: **`useSettingPickerKeyboard`** (`lib/features/setting/use-setting-picker-keyboard.ts`); not the plain-list `/` / `n` / `N` model.

**Plain list columns (search / dom lines)**

- **`/`** — incremental filter; **`Enter`** ends search mode (search: **`Enter`** on a row also opens the URL, or jumps to a page match when detail navigation applies).
- **`:`** then **`nohlsearch`** — clear filter and search highlight.
- **`n`** / **`N`** — jump among matches on the **results** row (when a row has multiple page matches).
- **`→`** / **`←`** — **search only:** **`→`** opens **detail** when the tab is open (subdivided hits), else **`[history]`** **open-target** when the tab is closed; **`←`** steps back. **`Esc`** in detail or open-target returns to results first.
- **`Ctrl+Left` / `Ctrl+Right`** — move along the pane strip (see above).
- **dom only:** **`↑` / `↓`** (or **`j` / `k`**) move focus among **jumpable** element rows; the **target tab scrolls** to the highlighted node (debounced). Header/metadata lines without a DOM path are skipped.

**Common picker keys (authoritative)**

Headline strings in the UI come from **`lib/features/side-picker/interaction/picker-headlines.ts`** (search/dom) and **`lib/features/bmxt-core/tabs-picker/headline.ts`** (tabs, mode-dependent). Keep this table aligned when changing shortcuts.

| Key / gesture | search / dom lines | Tab picker (`tabs -list`) |
|---------------|------------------|---------------------------|
| `j` / `k`, `↑` / `↓` | Move highlight; search **`--auto`**: preview open-tab rows on move | Move highlight (reducer `moveHi`); **`--auto`**: also activates tab in background window |
| `Ctrl+↑` / `Ctrl+↓` | **search only:** jump among **open-tab** result/detail rows (animated scroll; **`--auto`** previews) | — |
| `Alt+↑` / `Alt+↓` | **search only, `--manual` page-active:** preview highlighted row in background tab | **`--manual` only:** activate highlighted tab in background window |
| `/` | Search mode; `@` prefix matches URL substring | Same; filters visible rows |
| `Enter` in `/` mode | End search (commit highlight pattern) | End search |
| `Enter` in normal mode | search results: open URL or jump; search detail: jump; search open-target: open at chosen target | Focus highlighted tab (picker stays open) |
| `:` → `nohlsearch` | Clear filter + highlight | Clear search highlight |
| `n` / `N` | Next / previous match on results row | Next / previous match row |
| `→` / `←` | search: detail (open tab) or **`[history]`** open-target (closed tab); dom: **detail bar** when at prompt EOL | Collapse / expand highlighted **window** or **tab group** row (tab row: parent group) |
| `Ctrl+←` / `Ctrl+→` | Pane strip (terminal ↔ open columns) | Same |
| `Esc` | Prompt, or search detail → results first | Unwind `#` → `:` → `/` → bulk → prompt |
| `#` / `Tab` | — | Toggle mark / multi-select |
| `:` + bulk commands | — | `move`, `close`, `group`, `nw`, `nt`, `edit` (see [Tab Picker](#tabs-tab-picker)) |
| `Shift+↑` / `Shift+↓` | — | Extend `#` range on tab rows |
| `Ctrl+Shift+↑` / `Ctrl+Shift+↓` | — | Move highlight and force-activate tab in background window |
| Close column | `search -exit -list` / `dom -exit -list` | `tabs -exit -list` |

**Translate assist (prompt / nav typing)**

- **`translate -on`** enables assist only (no side editor column). **`translate -off`** disables it.
- In **nav typing mode**, the prompt shows a live **原文 / 訳 / 再訳** preview strip under the input (bilingual headings; language tags follow **`translate -setting`**). See **[`translate`](#translate)**.

**Adding a new side picker column**

1. Add a slot id to `PickerSlotId` in `lib/features/side-picker/session/session-pickers.ts` and session state fields.
2. Register a renderer in `lib/features/side-picker/wrappers/picker-slot-registry.tsx` (order in `PICKER_SLOT_ORDER`).
3. Add manifest subcommands: `<command> -list` to open, `<command> -exit -list` to close (UI-handled in `bmxt-shell.tsx`; Service Worker prints hints only).
4. Wire open/close in `bmxt-shell.tsx` and `setSessionPickerSlot` in `bmxt-terminal.tsx`.
5. Add a headline constant in `picker-headlines.ts` when using `PlainTextPickerBody` / `UrlListPickerWrapper` / `PickerListShell`.
6. For tabs-like bulk modes, extend **`PlainPickerKeyboardExtensions`** and keep reducer/execute logic in the feature module (see `use-tab-picker-plain-extensions.ts`).

<a id="tabs-man-tabs"></a>

### `tabs` (subcommands)

- `tabs` alone prints available options and restores the prompt to `tabs ` so users can continue with the next token.
- `tabs -list [-u]`: open tab picker column (`-u` includes URL rows).
- `tabs -exit -list`: close tab picker column in this session.
- `tabs -setting -page-active --auto | --manual`: configure tab preview on highlight. **`--auto`** (default): moving highlight activates the tab in the background window. **`--manual`**: only **Alt+↑↓** (or holding **Alt**) activates; **Enter** still jumps to the highlighted tab and brings its window forward. Persisted in **`chrome.storage.local`**; a **tabs** status strip under the prompt shows the current mode while the tab picker is open.
- `tabs -nowurl`: print current tab URL.
- `tabs -moveurl <url>`: activate matching http(s) tab and bring its window to front, or open a new tab if none matches. After `tabs -moveurl ` (trailing space), **Tab** cycles open http(s) tab URLs as completion candidates.

<a id="tabs-tab-picker"></a>

### Tab Picker (`tabs -list` / `tabs -list -u`)

**Tree layout**

- Rows are hierarchical: **`[window]`** → **`[tab group]`** (real Chrome tab groups only) → **tab rows**. **Tab rows** show a **favicon** when Chrome can resolve one for the page URL.
- Tabs **not** in a Chrome group are listed **directly under their window** (there is no “(no group)” header row).
- **Initially every window and group is expanded.** **←** on the highlighted row collapses that window or tab group (**→** expands). On a **tab** row, **←** / **→** affect the **parent tab group** (ungrouped tabs have no group to fold).
- Collapse/expand state is kept for the **BMXt process** lifetime (survives closing the BMXt window; cleared only on **`exit`** of the last pane — see [BMXt process lifecycle](#bmxt-process-lifecycle)).

**Navigation and bulk**

- On launch, highlight starts at the active tab of the last focused normal browser window.
- Move with `j`/`k` (or `↑`/`↓`), toggle `#` on highlighted tab with `Tab` (multi-select supported). **Shift + `↑`/`↓`** extends a range selection anchored at the first mark.
- **Bulk operations** — press `:` to open the command line, type a command, and press `Enter` to confirm. `Tab` cycles through completions from the current prefix. If no tab is marked yet, the highlighted tab is auto-marked when the command is confirmed.
  - Tab rows: `move` (`m`), `close` (`c`), `group` (`g`), `newwindow` (`nw`)
  - Window rows: `close` (`c`), `newtab` (`nt`), `edit`
  - Group rows: `move` (`m`), `close` (`c`), `newwindow` (`nw`), `edit`
- In `:` command mode, pressing `Tab` or `Enter` with an empty command shows a dim placeholder of available commands for the current target (tab/window/group).
- **[MOVE]** — navigate to destination with `↑`/`↓`, then `Enter` to move. **[CLOSE]** — `Enter` to close. **[GROUP]** — select target group with `↑`/`↓`, then `Enter` to add `#` tabs (choose **new group** to open the name/color panel; **`Enter`** confirms creation; **`Esc`** returns to the tab list; **`Tab`** switches between name and color). **[NEW WINDOW]** / **[NEW TAB]** — `Enter` to execute. **[EDIT]** — see [Tab picker `:edit`](#tabs-tab-picker-edit) below.
- **Interactive `group new`** (prompt command, no tab ids): opens the tab picker in **group-new** variant — `Tab` marks tabs, **`Enter`** opens the same name/color panel as **[GROUP]** → new group; **`Enter`** again creates the group.
- Use `/` for incremental search (`@` prefix for URL match). While filtering, **keyboard focus stays on the filter field**; the list highlights matches without taking typing focus. `Enter` focuses the highlighted tab while keeping the picker column open. **`Esc`** unwinds submodes in order: clear `#` → cancel `:` command mode → end `/` search → exit bulk submode → **return to the BMXt prompt** (column stays open). Close the column with **`tabs -exit -list`**.


<a id="tabs-tab-picker-edit"></a>

### Tab picker `:edit` (window & tab group)

`:edit` runs only inside the tab picker opened by **`tabs -list`** / **`tabs -list -u`**. Press **`:`**, type **`edit`**, then **`Enter`** (no short alias; `Tab` cycles completions including `edit` when the current target is a window or tab group row).

**Valid targets**

- Exactly **one window row** or **one tab group row** (a real Chrome tab group).
- **Tab rows** and **ungrouped tabs** (no group header) are not supported.
- Either mark the row with **`#`** on the window/group header, or highlight that row with **no `#` marks** — on confirm, the highlighted window/group row is auto-marked if needed.

If the selection is invalid (tabs only, multiple windows/groups, etc.), an **`error:`** line is appended to the BMXt log and edit mode does not open.

**Window — custom display name**

- Opens **[EDIT] window name**. The field is prefilled with the saved custom name, or the **active tab title** in that window when no custom name exists.
- **`Enter`** saves to **`chrome.storage.local`** (per-window display names; empty string clears the custom name and the list falls back to Chrome’s default title).
- **`Esc`** cancels and returns to the picker list.

**Tab group — menu, then rename or Chrome actions**

- Opens **[EDIT] operation menu** with **`↑`/`↓`** and **`Enter`**:
  - **Rename** — title field; **`Enter`** applies via **`chrome.tabGroups.update`**; **`Esc`** returns to the menu.
  - **Ungroup tabs** — runs immediately on **`Enter`** (`chrome.tabGroups.ungroup`).
  - **Delete tab group** — runs immediately on **`Enter`** (closes tabs in the group).
- After a successful save or group action, marks are cleared, edit mode ends, and the picker rows refresh.

<a id="tabs-tab-picker-impl"></a>

### Tab picker — implementation (keyboard & reducer)

**Entry:** **`TabsPickerWrapper`** → **`useTabPickerController`** → **`TabsUrlListPicker`** (`PickerListShell` + **`TabPickerRowList`** + bulk/edit panels). **`TabPickerOverlay`** remains a deprecated alias of the same stack.

- **Global capture**: **`usePlainPickerKeyboard`** registers **`useWindowKeydownCapture`** so **↑/↓/j/k**, `/`, `:`, `n`/`N`, and **Enter** work even when focus is not on the picker’s invisible IME `textarea` (e.g. after clicking the list). The same chain runs from the textarea’s **`onInputKeyDown`** when the event reaches it.
- **Tabs-only keys**: **`useTabPickerPlainExtensions`** supplies **`PlainPickerKeyboardExtensions`** — custom vertical nav (bulk move/group, Shift range, Ctrl+Shift preview), layered **`Esc`**, **`Tab`** / `#` toggle, **`:`** bulk commands (`parsePickerCommand` in `use-tab-picker-plain-extensions.ts`; short aliases e.g. `m` → `move`; **`edit`** has no alias), and tab-specific **Enter** intents (including **new-group meta** name/color confirmation via window capture **`onNormalEnter`**). Wired from **`use-tab-picker-keyboard.ts`**.
- **Reducer (TypeScript)**: Transitions go through **`runTabsPickerReduce`** in **`lib/features/bmxt-core/tabs-picker/reducer.ts`**. State and events use **camelCase** keys (e.g. `kind: "moveHi"`, `visibleLen`).
- **Shift + arrows**: **Range selection** applies **`moveHi` then `selectRange`** in one synchronous chain (**`applyReducedStateSequence`** in the controller/keyboard path). Two separate React updates in the same handler would read a **stale `hi`** for the second call and could break range extension.
- **`:edit` UI**: target resolution and error messages live in **`lib/features/tabs/resolve-edit-entry.ts`**; panels and Chrome/storage effects in **`use-tab-picker-edit.ts`**, **`controller/edit-actions.ts`**, and **`extension-storage/window-display-names.ts`** (see [Tab picker `:edit`](#tabs-tab-picker-edit)).
- **Prompt coexisting with picker**: While the tab picker is open, **`lib/features/bmxt-window/bmxt-terminal.tsx`** suppresses **↑/↓/j/k** on the main prompt so they do **not** drive **command history**; navigation is handled only by the picker.

<a id="url-lines"></a>

### URL Lines (`http` / `https`)

- `https://example.com` — Open in a new tab
- `https://example.com .` — Open in current tab (active tab in front window)
- `https://example.com -nw` — Open in a new window

<a id="command-execution-architecture"></a>

## Command Execution Architecture (Current)


**Registry, help text, tokenization, URL-only lines, and built-in command `run` handlers** are implemented in **`lib/features/bmxt-core/`** (TypeScript). Authoritative lists live in **`manifest/bmxt-codegen.json`**; **`npm run codegen`** regenerates **`lib/features/bmxt-core/registry/table.gen.ts`**, **`effect-types.ts`**, **`apply-dispatch.gen.ts`**, **`completion-fallback.ts`**, and **`command-subcommands.gen.ts`** (completion + continuation helpers). Hand-written per-effect logic lives in **`lib/features/dispatch/handlers/effects/`**. At runtime, **`runDispatch`** / **`dispatchFull`** return terminal **`lines`** or JSON **`effects`**; **`apply-one`** dispatches to those handlers (`apply-effects.ts`). Tab completion names come from **`allCompletionTokens()`** in the registry (same manifest as **`completion-fallback.ts`**).

The tab picker’s **`runTabsPickerReduce`** lives in **`lib/features/bmxt-core/tabs-picker/reducer.ts`** (see **Tab picker — implementation** under **`tabs`**).

**Exception — UI-handled first:** some inputs are handled in the BMXt window UI (`lib/features/bmxt-window/bmxt-shell.tsx`) *before* `RUN_CMD` reaches the Service Worker—e.g. **`tabs -list` / `tabs -list -u`**, **`* -exit -list`** (close picker columns), **`dom -list`**, **`search -list`**, **`setting -list` / `setting -exit -list`**, **`session -list` / `session -switch` / `session -setting-name`**, **`translate -on` / `translate -off` / `translate -setting`**, **`nav -enter` / `nav -exit`**, and **interactive `group new`** (no tab ids). For **`nav -enter`** and **`translate -on` / `-setting`**, arming / pair save and overlay or typing assist are UI-side; for **`setting -list`**, open/close and all draft edits are UI-side; for **`session -list` / `-switch` / `-setting-name`**, inline pickers and rename are UI-side; the Service Worker **`run`** for those commands only returns usage hints. Other subcommands and the rest of the command set go through **`runDispatch`** in the background. Picker layout, focus, **`Esc` → prompt**, and **`-exit -list`** are documented under **[Picker UI (side columns)](#picker-ui)**; terminal sessions are under **[`session`](#session)**; UI settings are under **[`setting`](#setting)**; nav overlay behavior is under **[Nav mode](#nav-mode)**; translation assist is under **[`translate`](#translate)**.

**`exit`:** returns an **`exit_pane`** effect; the Service Worker closes the **active terminal session**. When it is the **last** session, it closes the BMXt window and clears **all process-scoped storage** (see [BMXt process lifecycle](#bmxt-process-lifecycle)).

**Main directories:**

- **`manifest/bmxt-codegen.json`** — single source for command registry + **`commands[].subcommands`** (second/third fixed tokens, tail kinds) + Effect schema + TS handler wiring (see **`npm run codegen`**)
- **`lib/features/bmxt-core/`** — `dispatch.ts`, `registry/`, `cmd/*.ts` (one module per built-in command: **`export const CMD`** + **`run`**; **`registry/table.gen.ts`** is **generated**), `tabs-picker/` (reducer and picker domain logic)
- **`lib/features/bmxt-window/`** — main BMXt window UI (log, prompt, IME, picker launch)
- **`lib/features/side-picker/`** — shared side-column picker UI (panel host, `PickerListShell`, `usePlainPickerKeyboard`, interaction kernel, wrappers)
- **`lib/features/extension-storage/`** — `chrome.storage.local` keys and log/history caps
- **`lib/features/page-dom/`** — injected DOM helpers and formatters (`dom -list`)
- **`lib/features/nav/`** — nav overlay (`nav -enter` / Alt toggle); see **[Nav mode](#nav-mode)**
- **`lib/features/translate/`** — translation assist (`translate -on` / `-off` / `-setting`, nav typing commit); see **[`translate`](#translate)**
- **`lib/features/setting/`** — UI locale and appearance (`setting -list`, export/import zip, `bmxt_ui_settings_v1`); see **[`setting`](#setting)**
- **`lib/features/session/`** — terminal sessions (`session -list` / `-switch` inline pickers, session bar); see **[`session`](#session)**
- **`lib/features/job/`** — per-scope **`JobRunner`**, cancel handles, optional SQLite audit log; see **[Job execution](#job-execution)**
- **`entrypoints/bmxt-nav-overlay.content.ts`** — WXT content script on http(s) pages for nav overlay
- **`lib/features/dispatch/`** — **`effect-types.ts`** / **`apply-dispatch.gen.ts`** (generated) + hand-written **`handlers/effects/*`**
- **`lib/features/builtin-commands/`** — generated **`completion-fallback.ts`**, **`command-subcommands.gen.ts`**
- **`entrypoints/background.ts`** — `RUN_CMD` wrapped in a **`run-cmd`** job (`persist: false`); `runDispatch` → lines / `applyChromeEffects` (`exit` → `exit_pane`; closes the pane or the tracked window when it is the last pane, then clears all process-scoped storage)

<a id="job-execution"></a>

### Job execution (background work)


Long-running or cancelable work runs through **`lib/features/job/`** — a **`JobRunner` per scope id** (each terminal session id in the BMXt UI, plus reserved scopes **`__background__`** for Service Worker dispatch and **`__terminal__`** for global tab-picker refresh).

| Job kind | Typical scope | Supersede policy | Where started |
|----------|---------------|------------------|---------------|
| `search-list` | session id | cancel-previous | `bmxt-shell.tsx` (`search -list`) |
| `dom-list` | session id | cancel-previous | `bmxt-shell.tsx` (`dom -list`) |
| `run-cmd` | `__background__` | parallel | `entrypoints/background.ts` (most `RUN_CMD` lines) |
| `tab-picker-refresh` | `__terminal__` | coalesce-latest | tab-picker follow-tab refresh |

**Cancel:** **`Ctrl+C`** on the prompt, **`* -exit -list`** while a picker job is loading, or starting a new job of the same kind in the same scope (for **cancel-previous** kinds).

**Optional audit log:** In the BMXt UI tab only, completed job records may be appended to a local SQLite blob in **`chrome.storage.local`** under **`bmxt_job_db_v1`** (pruned per scope). The Service Worker never loads this module — background **`run-cmd`** jobs use **`persist: false`**.

**Search loading progress:** Progress lines for **`search -list`** are batched with **`requestAnimationFrame`** in the active shell (`use-batched-search-loading-progress.ts`) so heavy scans do not force every session pane to re-render; merged into the search picker when results arrive.

**Implementation:** **`job-types.ts`**, **`job-runner.ts`**, **`job-handle.ts`**, **`use-session-job-runner.ts`**, **`dispatch-context-from-job.ts`**, optional DB under **`lib/features/job/db/`**.

<a id="add-new-built-in-command"></a>

### Add a New Built-in Command

For a consolidated checklist (scaffold, manifest, new effects, verification), see **[Command add procedure](#command-add-procedure)** below.


1. Edit **`manifest/bmxt-codegen.json`** (`commands` / `effects` as needed). Optionally run **`npm run new:command -- <module> <name> [aliases...]`** to scaffold **`lib/features/bmxt-core/cmd/<module>.ts`** and manifest rows.
2. Implement **`run`** in **`lib/features/bmxt-core/cmd/<module>.ts`**. Keep **`export const CMD`** in sync with the manifest (**`npm run verify:manifest`**).
3. For new Chrome effects, add a **`handlers/effects/<file>.ts`** implementation and **`npm run codegen`**, then fill the handler referenced in the manifest.
4. Run **`npm run codegen`** (if not already), then **`npm run verify:manifest`** and **`npm run check:generated`** (CI runs both).

<a id="command-add-procedure"></a>

### Command add procedure


- **Command-line token model:** When adding or changing commands, follow **[Command-line token model (first / second commands)](#command-line-token-model)** and **`.cursorrules`** (first → second ordering, **no** short aliases for first/second tokens, **Enter** → placeholder + prompt restore `first ` when a second command is required). Continuation and second-token Tab lists come from generated **`command-subcommands.gen.ts`** (from manifest **`subcommands`**).

- **Single source of truth:** **`manifest/bmxt-codegen.json`**. Do **not** edit generated files by hand: **`lib/features/bmxt-core/registry/table.gen.ts`**, **`lib/features/dispatch/effect-types.ts`**, **`lib/features/dispatch/handlers/apply-dispatch.gen.ts`**, **`lib/features/builtin-commands/completion-fallback.ts`**, **`lib/features/builtin-commands/command-subcommands.gen.ts`**. Regenerate them with **`npm run codegen`**.
- **Recommended:** `npm run new:command -- <module> <canonical_name> [aliases...]` — creates **`lib/features/bmxt-core/cmd/<module>.ts`**, updates **`commands[]`** in the manifest, then runs **codegen**. Replace the stub in **`run`** and align **`usagePrimary`** in manifest and **`CMD.usagePrimary`** if the usage line should differ from the canonical name.
- **Manual path:** Add a row under **`commands[]`** in the manifest, add **`lib/features/bmxt-core/cmd/<module>.ts`**, then **`npm run codegen`**.
- **Chrome / new `Effect`:** Add an entry under **`effects[]`** in the manifest → **`npm run codegen`** → implement **`lib/features/dispatch/handlers/effects/<tsHandlerFile>.ts`** using the **`tsHandlerExport`** name from the manifest → return effects from **`run`** via **`effectsDispatch([...])`** as needed.
- **Checks:** **`npm run verify:manifest`** (manifest vs every **`export const CMD`**) and **`npm run check:generated`** (no uncommitted drift in generated paths). CI runs both. Then **`npx tsc --noEmit`** and **`npm run build`** for a full extension build.

#### Manifest `commands[].subcommands` (second / third tokens)

Every command row **must** include **`subcommands`**: use **`[]`** when the command has no fixed second-token family (e.g. `clear`). Non-empty arrays declare **canonical second tokens** (`head`, starting with `-`), optional **fixed third tokens** after that head (`trailingTokens`, e.g. `-u` after `tabs -list`), and an optional **`tail`** hint for tooling: **`none`** | **`rest_http_url`** | **`rest`** (dispatch semantics and argument parsing remain in **`lib/features/bmxt-core/cmd/<module>.ts`**; keep literals in sync—**`npm run verify:manifest`** checks each `head` appears in the TypeScript file).

**`npm run codegen`** emits **`lib/features/builtin-commands/command-subcommands.gen.ts`** (Tab completion + lone-first-token continuation; includes **`isSecondToken`**). Copy from **`manifest/templates/command-with-subcommands.example.json`** when adding a new first+second family.

##### How to add second/third tokens (checklist)

1. Edit **`manifest/bmxt-codegen.json`**: set **`subcommands`** to **`[]`** or a list of **`{ head, trailingTokens?, tail? }`** (see **`manifest/templates/command-with-subcommands.example.json`**).
2. Run **`npm run codegen`** (regenerates **`command-subcommands.gen.ts`** and **`table.gen.ts`**).
3. In **`lib/features/bmxt-core/cmd/<module>.ts`**, implement **`run`** and reference **each `head` as the same string literal** as in the manifest (required for **`npm run verify:manifest`**).
4. If the prompt should Tab-complete **third** fixed tokens after a head, use generated **`listThirdTokenCandidates`** (and add a completion zone in the shell if needed).
5. Run **`npm run verify:manifest`**, **`npm run check:generated`**, **`npx tsc --noEmit`**, then **`npm run build`** as needed.

**Hand-written browser logic (`handlers/effects/*.ts`) vs codegen:** Those files are **not** regenerated. After you change **`effects[]`** in the manifest and run codegen, **keep the corresponding handler** (`tsHandlerFile` / `tsHandlerExport`) aligned with the generated **`ChromeEffect`** types and **`apply-dispatch.gen.ts`** imports.

<a id="prompt-key-bindings"></a>

## Prompt Key Bindings


Applies when the prompt `textarea` is focused.

- **Left / Right / Home / End** — Move cursor in line
- **Tab** — Command completion (cycle candidates; IME-style token picker for fixed tokens; after **Enter** leaves a lone first command such as `tabs `, a **second-command candidate list** may appear — ↑/↓, Tab, Enter, Esc)
- **Up / Down** — Command history
- **Ctrl+R** — Reverse incremental search
- **Enter** — Execute command (when **nav** overlay is **ON** and the terminal prompt column has focus, **Enter** sends a **click** to the page instead — see **[Nav mode](#nav-mode)**)
- **Shift+Enter** — Insert newline
- **Esc** — Cancel reverse search

**While nav is armed** (`nav -enter`):

- **Alt** — Toggle nav overlay **ON** / **OFF** on the target browser tab (BMXt window active; terminal prompt column focused). Short **Alt** is ignored during **typing mode**; **Alt hold** (~500ms) commits typed text instead.
- **↑ / ↓ / ← / →** — When overlay is **ON**, move the virtual cursor (not command history). When a **tabs / search / dom** picker column has focus (**Ctrl+← / Ctrl+→**), arrows operate the picker instead.
- **Enter** — When overlay is **ON**, left-click at the virtual cursor, or enter **typing mode** on editable fields.
- **Ctrl** (tap, overlay **ON**) — Open the nav **context menu** at the cursor (**↑ / ↓** choose, **Enter** run, **← / →** history, **Ctrl** / **Esc** close). See **[Nav mode](#nav-mode)**.
- **Esc hold** (~500ms, **typing mode**) — Cancel typing and restore the previous field value.

During IME composition, composition events are prioritized to avoid conflicts with shortcuts until commit.

<a id="development"></a>

## Development


After installing dependencies, start the development build (see **Development startup** below for the full flow).

```bash
npm ci        # preferred when package-lock.json is present
npm run dev   # or pnpm dev
```

`npm run dev` runs **`wxt`**: a watch build that updates **`.output/chrome-mv3-dev`**. Keep the terminal process running while you work.

If you change **`manifest/bmxt-codegen.json`**, run **`npm run codegen`** before reloading the extension so generated TypeScript stays in sync.

<a id="development-startup"></a>

### Development startup (step-by-step)


1. **Install JS dependencies:** **`npm ci`** when **`package-lock.json`** is present (preferred). Use **`npm install`** only when you are updating dependencies and will refresh the lockfile. See **[npm dependencies and security](#npm-dependencies)**.
2. **Codegen (when needed):** After editing **`manifest/bmxt-codegen.json`**, run **`npm run codegen`** once so generated files under **`lib/features/bmxt-core/registry/`**, **`lib/features/dispatch/`**, and **`lib/features/builtin-commands/`** match the manifest.
3. **Start dev:** From the repo root, run **`npm run dev`**. Leave this process running; it rebuilds the extension on file changes.
4. **Load in Chrome:** Open `chrome://extensions`, enable **Developer mode**, **Load unpacked**, and select **`.output/chrome-mv3-dev`** (created by WXT dev).
5. **Open BMXt:** Click the extension toolbar icon to open the BMXt window.
6. **After edits:** When WXT finishes rebuilding, click **Reload** on the extension card in `chrome://extensions`, then reopen the BMXt window so the Service Worker and UI pick up changes.

<a id="main-sources"></a>

### Main Sources

- **`wxt.config.ts`** — Manifest V3, CSP, global shortcuts, Vite/React build
- **`entrypoints/background.ts`** — Service worker (window launch, `runDispatch`, effects)
- **`entrypoints/bmxt/index.html`**, **`entrypoints/bmxt/main.tsx`** — BMXt window entry (thin wrapper around `BmxtTerminal`; output **`bmxt.html`**)
- **`entrypoints/bmxt-nav-overlay.content.ts`** — Nav content script (http(s))
- **`bmxt-ui.css`** — Window styles at repo root (imported from `entrypoints/bmxt/main.tsx`; **`#root`** full-bleed layout)
- **`public/_locales/`** — Extension name/description i18n for the manifest
- **`public/assets/search-cache/`** — WASM for SQLite search cache
- **`lib/features/bmxt-window/`** — Main BMXt window UI (`bmxt-terminal.tsx`, session log/history hooks, etc.)
- **`lib/features/side-picker/`** — Shared side-column picker UI (panel host, `PickerListShell`, `usePlainPickerKeyboard`, interaction kernel, wrappers)
- **`lib/features/release-notes/release-notes.json`** — In-app upgrade banner text (keys must match `package.json` `version`)
- **`lib/features/welcome/`** — Welcome tab URL builder, install/update auto-open, **`welcome-content.json`**
- **`docs/welcome.html`**, **`docs/welcome-content.json`** — GitHub Pages welcome page (JSON synced from `lib/features/welcome/`)
- **`lib/features/extension-storage/`** — Storage keys and caps (used by Service Worker and UI)
- **`lib/features/tabs/`** — Tab picker (`tabs-picker-wrapper.tsx`, `tabs-url-list-picker.tsx`, `use-tab-picker-controller.ts`, `picker-rows.ts`, keyboard extensions, etc.)
- **`lib/features/bmxt-core/`** — Command registry, dispatch, `cmd/*.ts`, tab picker reducer (**`registry/table.gen.ts`** is generated)
- **`lib/features/dispatch/`** — Generated dispatch + hand-written **`handlers/effects/`**
- **`lib/features/builtin-commands/`** — Generated **`completion-fallback.ts`**, **`command-subcommands.gen.ts`**
- **`manifest/bmxt-codegen.json`** — Codegen manifest (run **`npm run codegen`** after edits)
- **`lib/features/page-dom/`** — DOM injection helpers (`dom -list`)
- **`lib/features/search/`** — Search mode (`search -list`), cross-scope **`--all`**, SQLite metadata cache (`bmxt_search_cache_db_v1` for **`--history`** / **`--bookmark`** only)
- **`lib/features/job/`** — Per-scope **`JobRunner`**, cancel handles, optional SQLite audit log (`bmxt_job_db_v1`)
- **`lib/features/nav/`** — Nav overlay feature package
- **`lib/features/translate/`** — Translation assist (`translate -on` / `-off` / `-setting`, `translation-pair.ts`)
- **`lib/features/setting/`** — UI settings picker (`setting -list`, `appearance.ts`, `settings-export.ts`)
- **`lib/features/session/`** — Terminal sessions (`session-input.ts`, inline pickers, `session-bar.tsx`)

In development mode, edits trigger rebuilds. Reload the extension to verify updates.

<a id="version-upgrade-banner"></a>

### Version upgrade banner & release notes


**Welcome page on extension update** (normal browser tab on GitHub Pages, separate from the in-window block)

When Chrome reports **`install`** or **`update`**, **`entrypoints/background.ts`** calls **`openWelcomePageOnUpdateIfNeeded`**, which opens **`https://unrsports.github.io/bmxt/welcome.html`** **once per version** via **`openWelcomePageTab`** (tracked by **`LAST_SEEN_WELCOME_VERSION_KEY`** in `lib/features/extension-storage/keys.ts`). Copy comes from **`lib/features/welcome/welcome-content.json`** (synced to **`docs/welcome-content.json`** for GitHub Pages).

**Manual / preview URL:** `https://unrsports.github.io/bmxt/welcome.html?lang=en&v=0.6.0` shows entries through that version from **`welcome-content.json`** (query **`v`** omitted → all versions; invalid **`v`** is ignored). Auto-open on update does not append query parameters beyond locale/version from runtime settings.

**In-window upgrade block** (first BMXt open after upgrade)

When the extension **`version`** in **`package.json`** (and the built manifest) **does not match** the value stored in **`chrome.storage.local`** under **`bmxt_last_seen_extension_version`** (**`LAST_SEEN_EXTENSION_VERSION_KEY`**), the BMXt window shows **once**, on the **first open after that upgrade**:

1. The usual **welcome** copy (unchanged).
2. A **version upgrade** block with the version number and bilingual release notes from **`release-notes.json`**.

Existing **session log** lines are still rendered **below** that block.

**Maintainer workflow**

1. Bump **`package.json`** → **`version`**.
2. Add a matching entry to **`lib/features/release-notes/release-notes.json`**. Keys must equal the version string exactly. Each entry has **`ja`** and **`en`** string arrays (used by the in-window upgrade banner).
3. Optionally add a matching object to **`lib/features/welcome/welcome-content.json`** for the GitHub Pages welcome page (**`version`**, **`ja`**, **`en`** arrays). Run **`npm run build`** or **`npm run dev`** so **`scripts/sync-welcome-docs.mjs`** updates **`docs/welcome-content.json`**. Commit both JSON files and deploy **`docs/`** to GitHub Pages. Optional screenshots go under **`docs/welcome/`** (edit **`docs/welcome.html`** if the hero image changes).
4. Build and ship.

If no **`release-notes.json`** entry exists for the current version, placeholder copy is shown that points maintainers at that file.

**Implementation:** welcome tab — **`open-welcome-page-tab.ts`**, **`open-welcome-on-update.ts`**, **`welcome-external-url.ts`**, **`docs/welcome.html`**. **`aboutbmxt`** — **`cmd/aboutbmxt.ts`**, **`handlers/effects/open-welcome-page.ts`** (same **`openWelcomePageTab`**). In-window banner — **`use-version-upgrade-banner.ts`**; **`bmxt-terminal.tsx`** waits until the check finishes before rendering the shell (avoids a flash of log-only UI); **`bmxt-shell.tsx`** renders the blocks; styles in **`bmxt-ui.css`** (`.bmxt-version-upgrade*`).

<a id="production-build"></a>

## Production Build

```bash
npm run build
```

Artifacts are output under **`.output/chrome-mv3`**. Load that folder unpacked in `chrome://extensions` for manual testing of a production build.

Store submission zip:

```bash
npm run package
```

This runs a production build, then writes **`.output/bmxtdemo-<version>-chrome.zip`** (version from **`package.json`**). CI submit workflow (**.github/workflows/submit.yml`**) uses the same zip path with [bpp](https://bpp.browser.market).

<a id="store-submission"></a>

## Store Submission (Reference)


You can automate submission with [WXT zip](https://wxt.dev/guide/essentials/config/build-mode.html) or [bpp](https://bpp.browser.market). Typical flow: register extension in store, prepare credentials, then connect CI.

<a id="license"></a>

## License


This project is licensed under [Apache License 2.0](./LICENSE).

<a id="roadmap"></a>

## Roadmap

1. UI and behavior: design, implementation, and testing
2. Refine key operations in the core tabs mode
3. Add history and bookmark operations
4. Improve multi-terminal behavior
5. Support pure command-line operation and additional automation flows

---

<a id="japanese"></a>

# BMXt（日本語）

> 英語版は上記 [English](#introduction) セクションを参照してください。

## 目次

- [はじめに](#introduction-ja)
- [🛠 シードプロジェクト](#seed-project-ja)
- [📺 デモ動画](#demo-video-ja)
- [♿️ ユニバーサルデザインの意図](#universal-design-intent-ja)
- [技術概要](#technical-overview-ja)
  - [WXT プロジェクト構成](#wxt-project-layout-ja)
- [主要仕様](#key-specs-ja)
  - [権限（`wxt.config.ts` の manifest）](#permissions-manifest-ja)
  - [再現可能なビルド](#reproducible-builds-ja)
  - [npm 依存関係とセキュリティ](#npm-dependencies-ja)
- [コマンドラインのトークン仕様（第一・第二コマンド）](#command-line-token-model-ja)
- [コマンド一覧](#command-list-ja)
  - [BMXt プロセスのライフサイクル（`clear` / ウィンドウ閉じ / `exit`）](#bmxt-process-lifecycle-ja)
  - [`aboutbmxt`](#aboutbmxt-ja)
  - [Nav モード（`nav -enter` / `nav -exit`）](#nav-mode-ja)
  - [`translate`（`translate -on` / `translate -off` / `translate -setting`）](#translate-ja)
  - [`setting`（`setting -list` / `setting -exit -list`）](#setting-ja)
  - [`session`（ターミナルセッション）](#session-ja)
  - [`tabs`（サブコマンド）](#tabs-man-tabs-ja)
  - [ピッカー UI（横並び列）](#picker-ui-ja)
  - [タブピッカー（`tabs -list` / `tabs -list -u`）](#tabs-tab-picker-ja)
  - [タブピッカー `:edit`（ウィンドウ名・タブグループ）](#tabs-tab-picker-edit-ja)
  - [タブピッカー — 実装（キー配信とリデューサ）](#tabs-tab-picker-impl-ja)
  - [URL（`http` / `https` 行）](#url-lines-ja)
- [コマンド実行アーキテクチャ（現状）](#command-execution-architecture-ja)
  - [ジョブ実行（バックグラウンド処理）](#job-execution-ja)
  - [組み込みコマンドの追加](#add-new-built-in-command-ja)
  - [コマンド追加手順](#command-add-procedure-ja)
- [プロンプトのキーバインド](#prompt-key-bindings-ja)
- [開発](#development-ja)
  - [開発時の起動](#development-startup-ja)
  - [npm 依存関係とセキュリティ](#npm-dependencies-ja)
  - [主なソース](#main-sources-ja)
  - [バージョンアップバナーとリリースノート](#version-upgrade-banner-ja)
- [本番ビルド](#production-build-ja)
- [ストア提出（参考）](#store-submission-ja)
- [ライセンス](#license-ja)
- [ロードマップ](#roadmap-ja)

<a id="introduction-ja"></a>

## はじめに


**BMXt** は、Chrome 上で **キーボード中心のブラウザ操作** を実現するための UI です。
これを作ったのは、作者自身が既存のブラウザ体験に満足していないためです。

プロンプトとログという**ターミナル風**の見た目を持ちますが、古典的なターミナルエミュレータそのものというより、**ブラウザ全体を操るためのコマンド面**として幅広いイメージをもって設計しているものであり、楽な姿勢で手をキーボードに置いたまま、タブやウィンドウへ手を伸ばす回数を減らすことを目指しています。

**名称** — **Browser Manipulator X Terminal** をもじった **BMXt**：

- **X**
  - **UX** の改善
  - さまざまな人がクロスオーバーに扱える願い
  - コマンドの組み合わせによる倍々的拡張・無限性
- **t**
  - **T**erminal の頭文字
  - ユーザーのブラウザにプラスされる拡張機能、という意味を **t** に込める

いまはまだ道を作り始めたばかりですが、**[Chrome ウェブストア](https://chromewebstore.google.com/detail/bmxtdemo/ljadfdncbodcdkmhfneeopomipanafil)** からインストールできます。
目の前のキーボードから「どこへでも行ける」と信じ、これからも機能を積み上げて、しかし人間に寄り添う道具として作り続けていきたいと考えています。

ではまず、いまできることをご説明します。
ぜひ動作デモのビデオもご覧になってください。

<a id="seed-project-ja"></a>

## 🛠 シードプロジェクト


このリポジトリは **Chrome 拡張（Manifest V3）＋ [WXT](https://wxt.dev/)** で動く専用シェルです。BMXt は **タブバーなしの独立 popup ウィンドウ**（`chrome.windows.create({ type: "popup" })`）で動作します（ツールバーアイコン直下の action popup ではありません）。技術選定の判断と確認／設計／テストは作者自身が、実装には AI アシスタント（Cursor）を100%使用して進めており、現段階では「動作の破綻をなくし、手触りを磨く」ための検証・種まきのフェーズと位置づけています。

<a id="demo-video-ja"></a>

## 📺 デモ動画


※デモムービーには全機能のうち、グループ作成に関する部分を収録しています。



https://github.com/user-attachments/assets/2e418356-cfce-479a-9880-185e542c5fad







<a id="universal-design-intent-ja"></a>

## ♿️ ユニバーサルデザインの意図


BMXt は、エンジニア向けの効率ツールであるとともに、**できるだけ軽い操作負担で確実に操作できる導線**（マウス指向 UI への依存を減らす、キー操作の一貫性、IME との両立など）を重ねていくことを目指しています。

<a id="technical-overview-ja"></a>

## 技術概要


以下は技術仕様の概要です。ツールバーの拡張アイコンから BMXt ウィンドウを開き（既に開いていれば前面へ）、タブ・ウィンドウ・タブグループの操作や URL 一行ナビゲーションをコマンドラインから行えます。[WXT](https://wxt.dev/)（Manifest V3）でビルドしています。

**配置:** コマンドのレジストリ・ディスパッチ・組み込みコマンド実装は **`lib/features/bmxt-core/`**（TypeScript）、Chrome API の実行や機能別 UI は **`lib/features/<feature>/`** に置く方針です（リポジトリ直下の **`.cursorrules`** も参照）。**ターミナルセッション**（tmux 風・1 つ表示・複数バックグラウンド）は 1 つの BMXt ウィンドウ内で共有 — **[`session`](#session-ja)** 参照。リストピッカーは同一ペイン内でターミナルの右に **横並び列** として開きます（**[ピッカー UI](#picker-ui-ja)**）。

**コマンドラインの約束事**（第一・第二コマンド、Tab 補完、第二必須時の Enter 挙動）は **[コマンドラインのトークン仕様](#command-line-token-model-ja)** にまとめています。

<a id="wxt-project-layout-ja"></a>

### WXT プロジェクト構成

[WXT](https://wxt.dev/) の規約に従います。Manifest V3 と Vite/React のビルド設定は **`wxt.config.ts`**（`package.json` ではない）にあります。エントリは **`entrypoints/`**、機能ロジックは **`lib/features/`**、静的ファイルは **`public/`**（ビルド出力へそのままコピー）です。

| パス | 役割 |
|------|------|
| **`wxt.config.ts`** | manifest（権限・CSP・commands）、React/Vite 設定 |
| **`entrypoints/background.ts`** | Service Worker |
| **`entrypoints/bmxt/`** | BMXt ウィンドウ — `index.html` + `main.tsx` → 出力 **`bmxt.html`** |
| **`entrypoints/bmxt-nav-overlay.content.ts`** | Nav オーバーレイ用コンテンツスクリプト（http/https） |
| **`public/_locales/`** | 拡張 manifest 用 i18n（`__MSG_*__`） |
| **`public/assets/search-cache/`** | `sql-wasm.wasm`（**`scripts/copy-sql-wasm.mjs`**） |
| **`bmxt-ui.css`** | ウィンドウ全体のターミナルスタイル（React は **`#root`** にマウント） |
| **`manifest/bmxt-codegen.json`** | コマンドレジストリ／dispatch codegen の単一ソース |
| **`.output/chrome-mv3/`** | 本番ビルド — 手動テスト用に unpacked 読み込み |
| **`.output/chrome-mv3-dev/`** | dev ウォッチビルド |
| **`.output/bmxtdemo-<version>-chrome.zip`** | **`npm run package`** のストア zip |

**ビルドスクリプト:** **`npm run dev`** / **`build`** / **`package`** はいずれも WXT の前に **`scripts/copy-sql-wasm.mjs`** と **`scripts/sync-welcome-docs.mjs`** を実行します。**`postinstall`** も同様に加え **`wxt prepare`**（**`.wxt/types/`** 生成）を走らせます。

**TypeScript / JSX:** **`tsconfig.json`** は **`"jsx": "react-jsx"`**（automatic JSX runtime）。WXT は **`wxt.config.ts`** で **`@wxt-dev/module-react`** を **`jsxRuntime: "automatic"`** で読み込みます。

<a id="key-specs-ja"></a>

## 主要仕様

- **UI**: タブバーなしの独立 popup ウィンドウで動く拡張ページ（WXT エントリ **`entrypoints/bmxt/`** → **`bmxt.html`**、`chrome.windows.create({ type: "popup" })`）。React は **`entrypoints/bmxt/index.html`** の **`#root`** にマウント。実装本体は **`lib/features/bmxt-window/`**（`BmxtTerminal`）、**`entrypoints/bmxt/main.tsx`** は薄いエントリ。スタイルはリポジトリ直下の **`bmxt-ui.css`**。
- **入力**: プロンプト行は **透明な `textarea` + 下層ミラー** で描画。日本語 IME（変換・確定）に対応。**キーボード中心**でコマンド・ピッカー・nav を操作しつつ、ログ・プロンプトミラー・ピッカー一覧・ヒント・バージョンアップブロックなどは **マウスで範囲選択・コピー**可能（**`bmxt-ui.css`** の `user-select: text`）。タブピッカーでは `/` 絞り込み中も **フィルタ入力にフォーカスが残り**、一覧が入力フォーカスを奪わない。
- **状態**: コマンド出力ログとコマンド履歴は `chrome.storage.local` に保持。キーと上限は **`lib/features/extension-storage/keys.ts`** で定義（**ログ 500 行** `bmxt_log`、**履歴 300 件** `bmxt_cmd_history`）。
- **バックグラウンド**: Service Worker（`entrypoints/background.ts`）がアイコンクリックでウィンドウを開き、コマンド実行・タブ操作を処理します。
- **グローバルショートカット**（`chrome://extensions/shortcuts` で変更可）: **`launch-bmxt`**（既定 **Shift+Alt+C**）で BMXt を開く／既存ウィンドウを最前面へ。**`reset-bmxt`**（既定 **Shift+Alt+R**）でプロセススコープのセッション状態 **と** コマンド履歴を消去してから BMXt を開く／最前面へ（**[BMXt プロセスのライフサイクル](#bmxt-process-lifecycle-ja)** 参照）。

<a id="permissions-manifest-ja"></a>

### 権限（`wxt.config.ts` の manifest）


`favicon`, `tabs`, `tabGroups`, `storage`, `unlimitedStorage`, `windows`, `scripting`, `history`, `bookmarks`。ホストパターン **`http://*/*` / `https://*/*`** は **`optional_host_permissions`** とし、ページへ注入するコマンド（`dom`、`search -list --page`、**`nav -enter`** 等）実行時に **実行時** に要求します。拒否した場合はエラー行で `chrome://extensions` での許可方法を案内します。

**データの扱い（プライバシーポリシー・ストア説明と揃えた一文）:** コマンド出力・入力履歴は主に UI 用の**メモリ**で扱い、永続化は **`chrome.storage.local`** の上限付きフィールドのみ（キーは **`lib/features/extension-storage/keys.ts`**）。拡張ページ・SW から **`fetch()`** で任意の第三者 HTTPS に取りに行く設計にはしておらず、**`npm run check:no-fetch`** で CI からも固定し、パッケージ manifest の **CSP**（**`connect-src 'self'`** 等）は補助線です（ストア配信・ブラウザ更新は別）。

**`content_security_policy.extension_pages`** では **`default-src 'self'`**、**`script-src 'self' 'wasm-unsafe-eval'`**（search キャッシュの **`sql.js`** WebAssembly 用）、**`connect-src 'self'`**、**`object-src 'self'`**、**`style-src 'self'`**、**`img-src 'self' data: blob:`**、**`font-src 'self' data:`**、**`worker-src 'self'`** を宣言しています。拡張 UI の動的レイアウトは外部 CSS と Constructable Stylesheet で行い、`'unsafe-inline'` は使いません。正確な文字列は **`wxt.config.ts`** を参照してください。拡張の **version** と npm メタデータは **`package.json`** にあり、WXT がビルド時に **version** を読み取ります。

<a id="reproducible-builds-ja"></a>

### 再現可能なビルド


公式リリースは Git のタグで指します（`git tag`）。ストア提出物をソースから再現するには、そのタグを checkout し、**`npm ci`**（**`package-lock.json`** 固定。CI や厳密な再現では **`npm install`** を使わない）のあと **`npm run codegen`** と **`npm run build`**（または **`npm run package`**）を実行し、依存ツリーと codegen 経路を揃えます。lockfile 方針・監査・メンテ手順は **[npm 依存関係とセキュリティ](#npm-dependencies-ja)** を参照。

<a id="npm-dependencies-ja"></a>

### npm 依存関係とセキュリティ


**直接依存**（**`package.json`**）は **`react@18.2.0`**、**`react-dom@18.2.0`**、**`sql.js`**。ビルドは **`wxt@0.20.18`** と **`@wxt-dev/module-react@1.1.5`**（devDependencies、Vite ベース）を使用。

**再現性のあるインストール**

| コマンド | 用途 |
|---------|------|
| **`npm ci`** | **通常はこちら**（clone 後・CI・リリースビルド前）。**`package-lock.json`** どおりのツリーのみ入る。 |
| **`npm install`** | **`package.json`** を意図的に変えるとき（devDependency・直接依存の版上げなど）のみ。更新した lockfile をコミットする。 |

**依存の固定** — **`package.json`** では **`overrides` を使わない**。推移依存の版は **`package-lock.json`** に exact + integrity で固定する。再現が必要な場面は **`npm ci`** のみ使う。

lockfile 更新を pull したあとの推奨手順:

```bash
rm -rf node_modules
npm ci
npm run build
```

**Node.js 版** — **`.nvmrc`** を参照（このリポジトリの推奨 Node）。

**CI**（**.github/workflows/ci.yml`**）は **`npm ci`**、**`npm audit --audit-level=critical`**、テスト、**`npm run build`** を実行する。

**残る audit** — WXT ビルド専用ツールチェーン（Vite、esbuild 等）に **high** が残ることがある。いずれも **拡張機能バンドルには同梱されない**。CI は **critical** のみで fail する。

**依存関係を変更したら** **`npm ci`** → **`npm run build`** → **`npm test`** → **`npm audit --audit-level=critical`** を実行し、**`package.json`** と **`package-lock.json`** を **セットでコミット**する。

<a id="command-line-token-model-ja"></a>

## コマンドラインのトークン仕様（第一・第二コマンド）


BMXt は **コマンドライン方式**で動作する。仕様・実装・ドキュメントでは次を徹底する。

1. **第一コマンド → 第二コマンド** — 先頭の **第一コマンド**（例: `tabs`, `session`）に続き、サブコマンドやフラグ形式の **第二コマンド**（例: `-list`, `-new`）がある場合は、その順で表記・解釈する。
2. **第一・第二とも短縮形を設けない** — いずれの段でも `-list` を `-l` のように省略した別名は設けない。**Tab 補完**の対象は **正式な表記のトークン**に限る。README にある従来のトップレベル別名（例: `help`/`?`）は後方互換で残りうるが、**新規**の第一＋第二コマンド族では第一・第二いずれにも短縮を増やさない。
3. **第二コマンドが必須のときの Enter** — 第二コマンドがないと第一コマンドを実質動かせない場合、**第一コマンドだけ**で **Enter** を押すと、不足している第二コマンドの **利用案内またはプレースホルダ**を表示したうえで、プロンプトを **`第一コマンド `**（末尾に半角スペース 1 つ）に戻し、**末尾にカーソル**を置いて続きの入力を待つ。これは **再利用可能な continuation** で実装する（リポジトリ直下の **`.cursorrules`** および **[コマンド追加手順](#command-add-procedure-ja)** の先頭箇条と整合させる）。

<a id="command-list-ja"></a>

## コマンド一覧


`help` または `?` で拡張内ヘルプと同内容が表示されます。概要だけ以下にまとめます。

| コマンド | 説明 |
|----------|------|
| `help` / `?` | ヘルプ |
| `aboutbmxt` | BMXt ウェルカムページを **新しいブラウザタブ** で開く（**[`aboutbmxt`](#aboutbmxt-ja)** 参照） |
| `clear` | ログをクリア |
| `exit` | **アクティブなターミナルセッション**を閉じる。**最後の 1 セッション**なら BMXt ウィンドウを閉じ **BMXt プロセスを終了**（永続化されたプロセス状態をすべて消去 — **[BMXt プロセスのライフサイクル](#bmxt-process-lifecycle-ja)** 参照） |
| `tabs` | 利用可能オプションを表示し、続けて `tabs `（末尾スペース付き）へ入力復元 |
| `tabs -list [-u]` | タブピッカー列を開き、検索・複数選択 `#`・バルクモードに対応。 |
| `tabs -exit -list` | 当該セッションのタブピッカー列を閉じる（`group new` 含む） |
| `tabs -setting -page-active --auto \| --manual` | タブピッカー：ハイライト移動時のタブ自動アクティブ化を切替（`--auto` 既定、`--manual` は Alt+↑↓）。`chrome.storage.local` に保存 |
| `tabs -moveurl <url>` | 指定 URL タブがあれば前面化、なければ新規タブを開く（http/https）。 |
| `tabs -nowurl` | 現在タブの URL を表示。 |
| `dom` | 利用案内を表示し、続けて `dom `（末尾スペース付き）へ入力復元（`-list` など第二トークン入力用） |
| `dom -list [--html\|--react] [<pattern>]` | アクティブタブの DOM を読み取り専用ピッカー列で閲覧（`search -list` と同系 UI）。`--html`（既定）／`--react`。任意の大文字小文字を区別しない部分一致フィルタ（正規表現なし）。scriptable な http(s) のみ。実行時にオプションのサイト権限を求めることがある |
| `dom -exit -list` | 当該セッションの DOM ピッカー列を閉じる |
| `search` | 利用案内を表示し、続けて `search ` へ入力復元（`-list`） |
| `search -list [--all\|--history\|--bookmark\|--page] [<pattern>]` | 検索ピッカー列。**`--all`**（スコープ無しで **`search -list `** を実行したときの既定）は履歴・ブックマーク・開いている http(s) タブ本文を並列走査。単一スコープフラグで限定可能。走査進捗はピッカー内表示（バッチ更新）。**→** で **詳細一覧** または **`[history]`** の **開き先** ツリー。**←** で結果一覧へ。部分一致（v1 正規表現なし） |
| `search -exit -list` | 当該セッションの search ピッカー列を閉じる（走査中ならセッション job runner 経由で **`search-list`** をキャンセル） |
| `nav` | 利用案内を表示し、続けて `nav `（末尾スペース付き）へ入力復元（`-enter` または `-exit` 用） |
| `nav -enter` | 当該 BMXt ペインで **nav モード**を起動（**[Nav モード](#nav-mode-ja)**）。ページ上のオーバーレイは **Alt** を押すまで表示しない |
| `nav -exit` | nav を完全終了（事前に **Alt** でオーバーレイを **OFF** にすること） |
| `translate` | 利用案内を表示し、続けて `translate ` へ入力復元（`-on` / `-off` / `-setting` 用） |
| `translate -on` | 翻訳アシストを有効化（nav typing 時はプロンプト下に訳プレビュー。**[`translate`](#translate-ja)** 参照） |
| `translate -off` | 翻訳アシストを無効化 |
| `translate -setting` | `translate -setting ` に復帰し、`--ja-en` / `--en-ja` を案内（Tab 補完） |
| `translate -setting --ja-en` | ペア **ja-en** を保存（既定）。往復プレビュー・nav Alt 確定は英語 |
| `translate -setting --en-ja` | ペア **en-ja** を保存。往復プレビュー・nav Alt 確定は日本語 |
| `setting` | 利用案内を表示し、続けて `setting ` へ入力復元（`-list` 用） |
| `setting -list` | **設定ピッカー**列を開く（UI 言語・外観・ピッカー個別外観・zip 入出力）。変更はピッカー内 **`> save setting`** で確定 |
| `setting -exit -list` | 当該セッションの設定ピッカー列を閉じる |
| `session` | 利用案内を表示し、続けて `session ` へ入力復元（第二トークン用。**[`session`](#session-ja)** 参照） |
| `session -new [name]` | 新しい **ターミナルセッション** を作成して切り替え。表示名は任意 |
| `session -list` | プロンプト上のインライン候補（↑↓ · **Enter** / **1–9** で番号指定の即時切り替え） |
| `session -switch [name]` | 表示名によるインライン候補（入力で絞り込み · **Enter** で `session -switch <name>` を挿入 · もう一度 **Enter** で実行）。`session -switch <name>` 直打ちも可 |
| `session -next` / `session -prev` | アクティブなターミナルセッションを循環 |
| `session -setting-name [name]` | 現在セッションの表示名を変更（裸コマンドは現在名をプロンプトに事前入力） |
| `session <n>` | ターミナルセッション番号 **n**（1 始まり）へ切り替え |
| `close` / `c <tabId>` | タブを閉じる |
| `group new` / `group new <tabId> …` | タブグループ作成 — タブ ID なしは対話的タブピッカー、ID 列挙ありは非対話 |

**補足 — `clear` と `exit` とウィンドウを閉じる操作:** `clear` は **アクティブなターミナルセッションの画面ログだけ**を消します。**BMXt ウィンドウを閉じる**（× ボタン）または **最後の 1 セッション**で **`exit`** すると、**プロセススコープの storage** を消去します（ターミナルセッション、ピッカー UI、タブツリー開閉）。**コマンド履歴は保持**され、**`reset-bmxt`** ショートカットを使ったときだけ消えます。**`exit`**（複数セッション）はアクティブなセッションだけを除去し、別セッションへ切り替えます。詳細は **[BMXt プロセスのライフサイクル](#bmxt-process-lifecycle-ja)**。

<a id="bmxt-process-lifecycle-ja"></a>

### BMXt プロセスのライフサイクル（`clear` / ウィンドウ閉じ / `exit`）

**BMXt ウィンドウを閉じる**（×）または **最後の 1 セッション**で **`exit`** すると、**プロセススコープ**のセッション状態（ターミナルセッション、ピッカー UI、タブツリー開閉）が **`chrome.storage.local`** から消えます。**プロンプトのコマンド履歴**（`bmxt_cmd_history`）は残り、次回起動後も ↑/↓ で辿れます。履歴も消すには **`reset-bmxt`** ショートカットを使います。BMXt を再度開くと **空のターミナル** で始まり、履歴だけ復元されます。

| 操作 | セッションログ | 開いているピッカー列・`paneFocus` | タブツリー開閉 | コマンド履歴 |
|------|----------------|-----------------------------------|----------------|--------------|
| **`clear`** | 消去（アクティブセッション） | 保持 | 保持 | 保持 |
| **BMXt ウィンドウを閉じる** | **すべて消去** | **消去** | **消去** | **保持** |
| **BMXt ウィンドウを再度開く** | 空の新規 | 消去 | 消去 | **復元** |
| **`exit`**（複数セッション） | アクティブセッション除去・別セッションへ切替 | 当該セッションのピッカー消去 | 保持 | 保持 |
| **`exit`**（最後の 1 セッション） | **すべて消去** | **消去** | **消去** | **保持** |
| **`reset-bmxt` ショートカット** | 消去 | 消去 | 消去 | **消去** |

**プロセススコープの storage キー**（**最後の 1 ペイン**の **`exit`** または BMXt ウィンドウ × 閉じで削除）:

| キー | 内容 |
|------|------|
| `bmxt_terminal_sessions_v1` | ターミナルセッション（v5）: セッションごとのログ、`order`、`activeId`、表示名 `namesById` |
| `bmxt_process_ui_v1` | セッションごとの開いているピッカー（`tabs` / `search` / `dom` / `setting`）と `paneFocus` |
| `bmxt_tab_picker_fold_v1` | タブピッカーのウィンドウ／タブグループ行の開閉 |

**プロセス終了時も消さないもの**（ユーザー／ブラウザメタデータ）: コマンド履歴（`bmxt_cmd_history` — **`reset-bmxt`** 時のみ消去）、ウィンドウ表示名、UI 設定（`bmxt_ui_settings_v1` — 言語・外観）、翻訳アシスト設定、タブ／search ピッカー設定（`page-active`）、検索メタデータキャッシュ（`bmxt_search_cache_db_v1` — **`--history`** / **`--bookmark`** の URL・タイトルのみ。**`--page`** 本文は**保存しない**）、任意のジョブ監査ログ（`bmxt_job_db_v1`）、最後の通常ウィンドウ id、welcome／バージョン追跡キー。

**実装:** **`lib/features/bmxt-window/terminal-sessions/state-storage.ts`** の `removeAllTerminalSessionsFromStorage`、UI 永続化は **`lib/features/bmxt-window/process-ui-state-storage.ts`** と **`lib/features/tabs/tab-picker-fold-state.ts`**。

**補足:** **`tabs -exit -list`**（および他の **`* -exit -list`**）は当該ピッカー列を閉じるだけで、BMXt プロセスを終了したりタブツリー開閉状態を消したりしません。

**ターミナルセッションとピッカー列:** **2 つ以上**のターミナルセッションがあるとき、BMXt ウィンドウにフォーカスがあれば **Ctrl+← / Ctrl+→** でアクティブセッションを循環します。アクティブセッション内では **Ctrl+← / Ctrl+→** で **ターミナル → tabs → search → dom → setting**（開いている列のみ）を移動します。詳細は **[ピッカー UI（横並び列）](#picker-ui-ja)** と **[`session`](#session-ja)**。

<a id="aboutbmxt-ja"></a>

### `aboutbmxt`

**`aboutbmxt`** は第一コマンドのみの組み込みコマンド（第二コマンドなし）です。BMXt プロンプトから実行すると、**GitHub Pages のウェルカムページ**（[`https://unrsports.github.io/bmxt/welcome.html`](https://unrsports.github.io/bmxt/welcome.html)）を **新しいブラウザタブ** で開きます（インストール／更新時の自動表示と同じ URL・タブ）。

| 入力 | 動作 |
|------|------|
| **`aboutbmxt`** | **`open_welcome_page`** 経由でウェルカムページを開く（Service Worker → **`openWelcomePageTab`** / **`chrome.tabs.create`**）。UI ロケールは **`lang`**、manifest 版は **`v`** クエリで渡す。ターミナルには短い確認行が出る。 |

**ページ内容:** GitHub Pages 上の静的 **`docs/welcome.html`**。バージョン履歴の箇条書きは **`lib/features/welcome/welcome-content.json`**（各エントリ: **`version`**, **`ja`**, **`en`** の文字列配列）。**`scripts/sync-welcome-docs.mjs`** が **`dev` / `build` / `package` / `postinstall`** で JSON を **`docs/welcome-content.json`** にコピーする。hero 等の画像は **`docs/welcome/`**（**`docs/welcome.html`** から参照。例: **`welcome/manual_howToUseBMXt.png`**）。

**関連（本コマンド以外）:** 拡張機能 **インストール** または **更新** 時は **`openWelcomePageOnUpdateIfNeeded`** が同じ URL を **バージョンごとに 1 回** **通常タブ** で開きます（**`LAST_SEEN_WELCOME_VERSION_KEY`** で記録）。**手動プレビュー:** `https://unrsports.github.io/bmxt/welcome.html?lang=ja&v=0.6.0`（**`v`** 省略 → JSON 全版、不正な **`v`** は無視）。ウィンドウ内アップグレードバナーは別 — **[バージョンアップバナーとリリースノート](#version-upgrade-banner-ja)**。

**実装:** **`lib/features/bmxt-core/cmd/aboutbmxt.ts`**、Effect **`lib/features/dispatch/handlers/effects/open-welcome-page.ts`**、**`lib/features/welcome/open-welcome-page-tab.ts`**、**`lib/features/welcome/welcome-external-url.ts`**、静的ページ **`docs/welcome.html`**。

<a id="nav-mode-ja"></a>

### Nav モード（`nav -enter` / `nav -exit`）

**Nav モード**は、**直前にフォーカスした通常ウィンドウのアクティブタブ**上に **仮想ポインタのオーバーレイ**を出し、キーで操作します（タブ解決は **`dom -list`** と同系）。横並びのピッカー列ではなく、BMXt ウィンドウ UI 内の状態と、プロンプト下の **tmux 風ステータス帯**（**`nav`**・**ON/OFF**・対象タブ名）で状態を示します。

**コマンド（第二トークン必須）**

| 入力 | 動作 |
|------|------|
| 単独 `nav` + **Enter** | 利用案内を表示し、プロンプトを **`nav `** に復元（continuation）。Tab 補完は **`-enter`** / **`-exit`** のみ（短縮別名なし）。 |
| **`nav -enter`** | 当該セッションペインで nav を **起動（armed）**。**オプションの http(s) ホスト権限**を求めることがある（`dom -list` と同系）。この時点ではページ上にオーバーレイは出ない。 |
| **`nav -exit`** | nav を **完全終了**（タブごとの位置記憶を消し、オーバーレイを除去）。オーバーレイがまだ **ON** のときはエラー — 先に **Alt** で **OFF** にする。 |

**`nav -enter` 後 — Alt でオーバーレイ ON/OFF**

- **BMXt ウィンドウがアクティブ**で、**ターミナル列（プロンプト）にフォーカス**があるときのみ（`paneFocus === "terminal"`）。**Ctrl+← / Ctrl+→** で **tabs / search / dom** ピッカー列に移ると、nav のキーは無効（ピッカー操作に戻る）。
- **Alt** のたびにオーバーレイを **ON** / **OFF** 切替。
- **ON:** 対象タブにオーバーレイを注入・更新。カーソルは毎回 **ビューポート中央**から開始（OS のマウス位置ではない）。**↑ / ↓ / ← / →** で仮想カーソルを移動（既定 **12px**／ステップ。`lib/features/nav/nav-config.ts` で将来調整可）。**Enter** でカーソル下を **左クリック**相当、または編集可能要素なら **typing モード**へ（下記）。
- **OFF:** 当該タブのオーバーレイを除去。nav は **armed** のまま **`nav -exit`** まで継続。

**オーバーレイ ON 時のキー（ターミナル列・プロンプトにフォーカス）**

| キー | 動作 |
|------|------|
| **↑ / ↓ / ← / →** | 仮想カーソル移動（端付近でビューポート自動スクロール） |
| **Enter** | カーソル位置で左クリック相当。**input** / **textarea** / **contenteditable** では **typing モード**（BMXt コマンドラインから入力） |
| **Ctrl**（タップ） | カーソル位置に **コンテキストメニュー**を表示 |
| **Alt**（タップ） | オーバーレイ **OFF**（**typing** 中は無視） |

**コンテキストメニュー**（**Ctrl**）: **↑ / ↓** で項目選択、**Enter** で実行、**← / →** でブラウザ **戻る** / **進む**、**Ctrl** または **Esc** で閉じる。

| 項目 | 動作 |
|------|------|
| テキスト選択 | **↑ / ↓** で移動、**Enter** で **開始**、再度移動して **Enter** で **終了** → 範囲選択後 **コピー** 行 |
| カーソル下の画像を保存 | ポインタ下の画像をダウンロード（http(s) URL） |
| ページを再読み込み | 対象タブを再読み込み |

テキスト選択後は **コピー** + **Enter** でクリップボードへ。**Esc** で選択解除（コピーメニュー表示中も同様）。

**typing モード**（編集可能要素で **Enter** 後）: BMXt プロンプトにヒント表示。入力はページ側フィールドへ反映。**Alt 長押し**（約 500ms）で **確定**、**Esc 長押し**で **取消**（元の値に戻す）。複数行フィールドは **Shift+Enter** で改行可。typing 中の短い **Alt** はオーバーレイ切替にならない。

**`translate -on`** 中は typing でもプロンプト下に **原文 → 訳 → 再訳** の往復プレビューが出ます（文の終わりは `。` `.` `!` `?` `！` `？` など）。**Alt 長押し**確定では生の入力ではなく、保存ペアの **訳（target 言語）** をブロックから組み立てて送ります（**`--ja-en`** は英語、**`--en-ja`** は日本語。詳細は **[`translate`](#translate-ja)**）。

プロンプト下のステータス帯は **`nav`**・**ON/OFF**・**typing**・**menu**・**sel-start** / **sel-end**・**copy** などと、対象タブ名または短いエラーを表示。

**armed 中のタブ切替**

- 通常ウィンドウでアクティブタブを変えても **armed は維持**。新タブにオーバーレイを再作成。**タブごとに位置を記憶**し、戻ったタブでは最後の位置を復元。**Alt で ON** したときはそのタブでは毎回 **中央**から開始。

**ページと権限**

- **scriptable な http(s)** のみ（`chrome://`・ウェブストア・`chrome-extension://` 等は拒否）。注入失敗時はステータス帯に短い理由（例: **`site access denied`**）。
- 拡張のインストール／再読み込み後は、対象ページを **一度再読み込み**して WXT **コンテンツスクリプト**（`entrypoints/bmxt-nav-overlay.content.ts`）を登録することを推奨。未登録時は Service Worker が **`chrome.scripting.executeScript`** にフォールバック。

**実装**

- **`lib/features/nav/`** — プロンプト解析、ステータス帯、セッションフック（`useNavMode`）、注入スニペット、SW ランナー（`run-nav-inject.ts`）。
- **`lib/features/bmxt-window/bmxt-shell.tsx`** — **`nav -enter` / `nav -exit`** を `RUN_CMD` より前に処理。**Alt** / nav 用 **Enter** / 矢印キー。
- **`entrypoints/background.ts`** — `NAV_CONTROL` メッセージで対象タブへ注入。
- **`entrypoints/bmxt-nav-overlay.content.ts`** — http(s) ページ上のリスナー。

<a id="translate-ja"></a>

### `translate`（`translate -on` / `translate -off` / `translate -setting`）

**`translate`** は Chrome 内蔵の **`Translator` API**（日本語 ↔ 英語）を **nav typing** 向けアシスト（BMXt プロンプト下のプレビュー）に使います。向きは **翻訳ペア** として **`chrome.storage.local`** の **`TYPING_TRANSLATE_KEY`**（`{ enabled, pair }`）に保存します。

| 入力 | 動作 |
|------|------|
| 単独 `translate` + **Enter** | 利用案内を表示し、**`translate `** に復元（continuation）。Tab 補完は **`-on`** / **`-off`** / **`-setting`** のみ（短縮別名なし）。 |
| **`translate -on`** | 翻訳アシストを有効化。ログに現在のペア（例 **`--ja-en`**）を表示。nav typing 時はプロンプト下に訳プレビュー。 |
| **`translate -off`** | アシストを無効化。 |
| **`translate -setting`** + **Enter** | ペア候補を表示し、**`translate -setting `** に復帰。Tab で第三トークン **`--ja-en`** / **`--en-ja`** を補完。 |
| **`translate -setting --ja-en`** | ペア **`ja-en`** を保存（原文 **JA** → 訳 **EN** → 再訳 **JA**）。進行中ブロックをリセット。 |
| **`translate -setting --en-ja`** | ペア **`en-ja`** を保存（原文 **EN** → 訳 **JA** → 再訳 **EN**）。進行中ブロックをリセット。 |

**翻訳ペア（`-setting`）**

- 定義は **`lib/features/translate/translation-pair.ts`**（`TRANSLATION_PAIRS`）。言語追加時は同テーブルと manifest の **`trailingTokens`** を拡張する想定。
- **`--ja-en`**（既定）: 往復 **ja → en → ja**。**nav Alt 長押し**確定は **英語**（`forward`）。
- **`--en-ja`**: 往復 **en → ja → en**。**nav Alt 長押し**確定は **日本語**。

**パネル見出し（原文 / 訳 / 再訳）**

- nav 下プレビューは **原文・訳・再訳** の3段。見出しは **日英併記**（日本語行＋英語サブ行）で、ペアに応じた言語タグ（例 **`--ja-en`**: **`原文（JA）`** / **`Source (Japanese)`**、`getTranslationFieldLabels`）。

**ステータスバー**

- アシスト **ON** 中、translate 帯に現在ペア（例 **`--ja-en`**）とモード（nav typing 等）を表示。Alt 確定のヒントはペアに追従（英訳送信 / 和訳送信）。

**nav typing**

- アシスト **ON** 時、**nav typing** でプロンプト下にプレビューを表示。**文が完結**（`。` `.` `!` `?` `！` `？` など）ごとに、保存ペアに応じた **訳 / 再訳** ブロックを更新。
- **`Translator` API** と、ペアの **source→target** の利用可否が必要。未対応の Chrome では短いステータス行を表示。
- **Alt 長押し**確定では **`buildEnglishCommitText`**（内部で **`translateForward`**）により、ペアの target 言語文を組み立てて注入。

**実装:** **`lib/features/translate/`**（`translation-pair.ts`、`translator-service.ts`、`parse-translate-command.ts`）、**`lib/features/bmxt-core/cmd/translate.ts`**、UI は **`bmxt-shell.tsx`**（`RUN_CMD` より前に処理）。

<a id="setting-ja"></a>

### `setting`（`setting -list` / `setting -exit -list`）

UI 表示言語と **ターミナル＋ピッカー列の外観**は、専用の **設定ピッカー**列で編集します。確定値は **`chrome.storage.local`** の **`bmxt_ui_settings_v1`**（`lib/features/extension-storage/keys.ts`）に保存。Service Worker の **`setting`** **`run`** は利用案内のみ；開閉と編集はすべて **`bmxt-shell.tsx`** が **`RUN_CMD`** より前に処理します。

| 入力 | 動作 |
|------|------|
| 単独 **`setting`** + **Enter** | 利用案内を表示し、**`setting `** に復帰（continuation）。Tab 補完は **`-list`** / **`-exit`**（exit は続けて **`-list`**）。 |
| **`setting -list`** + **Enter** | 現在設定の **draft** を持った **setting** ピッカー列を開く。 |
| **`setting -exit -list`** + **Enter** | 当該セッションの設定ピッカー列を閉じる（storage には書かない）。 |

**draft・プレビュー・確定**

- ピッカー内の変更は **draft** のみ更新。ライブ UI は **`> save setting`** まで **最後に保存した**設定のまま。
- ピッカー下部の **Preview** が draft を反映（**`edit-picker: on`** 時は **Terminal** / **Picker** を分割表示）。
- **`> save setting`** — draft を **`bmxt_ui_settings_v1`** に書き込み即時反映。
- **`> cancel setting`** — draft を破棄し storage の値に戻す。

**メイン一覧（ピッカー）**

| 行 | 内容 |
|----|------|
| **language** | `--japanese` / `--english`（UI 表示言語） |
| **edit-picker** | **`on`** — ピッカー列専用の行を追加；**`off`** — ピッカー列は全体外観に従う |
| **fg**, **bg-color**, **size**, **font**, **bg-image** | 全体外観（`edit-picker` **off** 時はターミナル＋ピッカー共通） |
| **fg (picker)** など | **`edit-picker: on`** のみ表示；ピッカー列の上書き（未設定は全体を継承） |
| **reset-default** | 確認後、外観 draft を既定に戻す |
| **export** | zip ダウンロード（`settings.json` v2 + `background-image.*`；設定時は `picker-background-image.*` も） |
| **import** | zip を draft に読み込み（**`> save setting`** で確定） |
| **`> save setting`** / **`> cancel setting`** | 確定／破棄 |

**外観のルール**

- **`edit-picker: off`（既定）:** **全体**テーマ1つ。背景画像は **ターミナル＋ピッカー列の split 行**に1枚で描画し、**両列をまたいで連続**（`html` の `data-bmxt-unified-bg`）。
- **`edit-picker: on`:** ターミナルとピッカー列で別テーマ可。プレビューは **Terminal** と **Picker** を横並び。

**ピッカーキー（setting 列）**

| キー | メイン一覧 | 選択サブ一覧（言語・サイズ等） | 詳細／編集（fg・色・font） |
|------|-----------|------------------------------|---------------------------|
| **↑** / **↓** | ハイライト移動 | ハイライト移動（現在値を事前ハイライト） | — |
| **→** / **Enter** | サブ画面へ／即時実行（export/import） | 選択を draft に反映してメインへ | インライン編集開始 |
| **←** / **Esc** | — | メインへ戻る | 編集キャンセルまたはメインへ |
| **Enter**（編集中） | — | — | 入力値を draft プレビューに反映 |
| **Esc**（列） | **プロンプト**へ（列は開いたまま） | | |

色（hex）は編集中にリアルタイムプレビュー。

**実装:** **`lib/features/setting/`**（`settings.ts`、`appearance.ts`、`apply-appearance.ts`、`setting-picker-*.tsx`、`settings-export.ts`）、ピッカースロット **`setting`**（**`lib/features/side-picker/`**）、配線は **`bmxt-shell.tsx`**。

<a id="session-ja"></a>

### `session`（ターミナルセッション）

BMXt は **tmux 風のターミナルセッション**を1つの BMXt ウィンドウ内で扱います。複数の独立したターミナル文脈が存在しますが、**同時に表示されるのは1つだけ**です。非表示のセッションはそれぞれ **ログ行**・**開いているピッカー列**・**nav 起動**・**詳細バー** などの UI 状態を保持します。**コマンド履歴**（`bmxt_cmd_history`）は全ターミナルセッションで **共有** され、`session -switch <name>` のような行を ↑/↓ で呼び出せます。

永続化は **`bmxt_terminal_sessions_v1`**（v5: `logsById`、`order`、`activeId`、`namesById`）。実装は **`lib/features/bmxt-window/terminal-sessions/state-storage.ts`**。Service Worker の **`run`** は **`session -list`** / **`session -switch`** / **`session -setting-name`** について利用案内のみ返し、切り替え・改名は **`RUN_CMD` より前**の **`bmxt-shell.tsx`** UI で処理します。

| 入力 | 動作 |
|------|------|
| 裸の **`session`** + **Enter** | 利用案内を表示し **`session `** に復帰（continuation）。Tab で第二トークンを補完。 |
| **`session -new [name]`** + **Enter** | Effect **`session_new`**：セッション作成後に切り替え。名前省略時は元セッションの開いているピッカーまたは最後の非 session コマンドから自動命名。 |
| **`session -list`** + **Enter** | プロンプト上の **インライン浮動候補**（横並び列ではない）。表示は `*n  表示名`。**↑↓** · **Enter** / **1–9** で **即時切り替え**（履歴には `session -list`）。 |
| **`session -switch`**（または Tab で **`-switch`** 選択） | 全セッションの **名前候補メニュー**を表示（`*表示名`）。**アクティブセッション名の自動挿入はしない**。 |
| **`session -switch` 候補メニュー** | **入力で絞り込み**（インクリメンタル **contains**。第二コマンドピッカーと同系）。**Enter** または **Esc** まで表示を維持（絞り込み中も同様）。**Enter** で `session -switch <name>` をプロンプトに挿入（メニュー閉じ）。**もう一度 Enter** で切り替え実行・履歴に完全行を記録。**Esc** でメニュー閉じ。 |
| **`session -switch <name>`** + **Enter** | 表示名で直接切り替え（重複名はコマンド行で `名前 (番号)`）。 |
| **`session <n>`** + **Enter** | 1 始まりの番号で直接切り替え。 |
| **`session -next`** / **`session -prev`** + **Enter** | Effect **`session_next`** / **`session_prev`**。 |
| 裸の **`session -setting-name`** + **Enter** | プロンプト上で改名（現在の表示名を事前入力）。 |
| **`session -setting-name <name>`** + **Enter** | 1 行で改名。 |

**セッションバーとショートカット**

- **2 つ以上**のターミナルセッションがあるとき、BMXt ウィンドウ上部に **セッションバー**（番号 + 表示名）が表示されます。クリックで切り替え。
- **Ctrl+←** / **Ctrl+→**（BMXt ウィンドウにフォーカス、**2+** セッション）でアクティブセッションを循環（バックグラウンドのセッションは維持）。

**パフォーマンス（切り替え／作成）:** **アクティブ**なセッションと **一度でも表示した** セッションだけがフル **`BmxtShell`** をマウントする。未訪問のバックグラウンドセッションは軽量プレースホルダーのみ。切り替え時は **`activeId`** を楽観的に更新し、**`chrome.storage.onChanged`** は追加 **`get`** なしでスナップショットを反映する。変更のないログ配列は再利用し、非アクティブペインの再描画を抑える（**`lib/features/bmxt-window/terminal-sessions/sessions-ui-equality.ts`**）。1 セッションの重いピッカー処理が別セッションのプロンプト入力をブロックしない（セッション id ごとの job runner — **[ジョブ実行](#job-execution-ja)** 参照）。

**実装:** **`lib/features/session/`**（`session-input.ts`、`session-summary.ts`、`session-list-candidate-panel.tsx`、`session-bar.tsx`）、UI は **`bmxt-shell.tsx`** / **`bmxt-terminal.tsx`**、Effect は **`session_new`** / **`session_next`** / **`session_prev`**（**`lib/features/dispatch/handlers/effects/`**）。

<a id="picker-ui-ja"></a>

### ピッカー UI（横並び列）

プロンプトからリストピッカーを開いたとき、**`lib/features/bmxt-window/bmxt-shell.tsx`** はフォーカス中のセッションリーフを次の横並びにします。

**ターミナル（ログ＋プロンプト）** | **tabs**（表示時） | **search**（表示時） | **dom**（表示時） | **setting**（表示時）

同一ペイン内で複数のピッカー列を同時に開けます。セッション状態はリーフごとの **`sessionPickers`**（`tabs` / `search` / `dom` / `setting` スロット）。BMXt プロセスが存続する間、**開いている列・`paneFocus`・タブピッカーのハイライト／マーク・ツリー開閉**は **`chrome.storage.local`** に保存され、BMXt ウィンドウを閉じて開き直しても復元されます（**[BMXt プロセスのライフサイクル](#bmxt-process-lifecycle-ja)**）。列の描画は **`lib/features/side-picker/wrappers/session-picker-columns.tsx`** の **`SessionPickerColumns`**（**`PICKER_SLOT_ORDER`**: tabs → search → dom → setting）。

**4 層（サイドピッカー）**

| 層 | 役割 | 主なパス |
|----|------|----------|
| ① 親ターミナル | ログ・プロンプト・ピッカー起動／閉じる | `lib/features/bmxt-window/bmxt-shell.tsx`, `bmxt-terminal.tsx` |
| ② パネルホスト | 列クロム・青枠・クリックでアクティブ化 | `lib/features/side-picker/panel/picker-panel-host.tsx` |
| ③ コマンドラッパ | スロット入口・keyboard 配線 | `url-list-picker-wrapper.tsx`, `dom-picker-wrapper.tsx`, `tabs-picker-wrapper.tsx`, `setting-picker-wrapper.tsx` |
| ④ コマンド本体 | フラット行 / 階層タブ行 / dom 確認 / 設定 | `PlainTextPickerBody`（search/dom 行）, `TabsUrlListPicker` + `TabPickerRowList`（tabs）, `dom/dom-prompt-render.tsx`, `setting-picker-body.tsx` |

**共有 keyboard:** **`usePlainPickerKeyboard`**（`lib/features/side-picker/hooks/`）が `/`, `:`, `n`/`N`, **`Esc` → プロンプト**, 縦移動, **Ctrl+←/→** 列ストリップを interaction kernel 経由で処理。**search** / **dom** 行一覧はそのまま利用。**tabs** は **`useTabPickerPlainExtensions`**（`lib/features/tabs/use-tab-picker-plain-extensions.ts`）で bulk/edit・`#` / `Tab`・Shift 範囲・段階 **`Esc`** を追加。

**共有リスト chrome:** **`PickerListShell`**（`chrome/picker-list-shell.tsx`）— headline・不可視 IME・リストスロット・検索/コマンドフッタ。**tabs** は **`TabsUrlListPicker`** 経由。**search** / **dom** 行一覧は現状 **`PlainTextPickerBody`**（同一 CSS・仮想スクロールあり。将来 `PickerListShell` に寄せ可能）。

**`PickerEntry`（search）**

search のヒットは描画前に **`PickerEntry`**（`url`, `source`, 表示行）に正規化します。**`[history]`** 行は **`→`** でピッカー内 **開き先** ツリー、結果行の **`Enter`** は **`open_url_new_tab`**（または page ジャンプ）。実装は **`lib/features/search/search-open-destination.ts`**、**`open-search-picker-entry.ts`**、配線は **`bmxt-shell.tsx`**。

**フォーカスと青枠**

- **`paneFocus`** がキー入力を受け取る列を表します: `terminal` → `tabs` → `search` → `dom` → `setting`（未表示の列は飛ばす）。
- フォーカス中の列に **青い枠**（`.bmxt-split-pane--focused`）が付きます。
- 列が **新しく開いた** とき、または **詳細バー** からフォーカスが移ったとき、キーボードフォーカスと青枠がその列へ移ります。フォーカスされたピッカー列は他列より **左へアニメーション** します（`usePickerColumnFlip`）。
- **Ctrl+← / Ctrl+→** でアクティブセッション内の列を移動します。**2 つ以上**のターミナルセッションがあるときは **Ctrl+← / Ctrl+→** でアクティブセッションも循環します（**[`session`](#session-ja)** 参照）。
- 列をクリックしても同様にアクティブ化されます。

**詳細バー（プロンプト下のモードステータス列）**

ピッカーが開いている間（または nav / 翻訳アシストが有効な間）、各モード用の **詳細バー**（`tabs` / `search` / `dom` / `setting` / `nav` / `translate`）がプロンプト下に表示されます。**ターミナル**列フォーカス時の共通キー:

| キー | 動作 |
|------|------|
| **`→`**（キャレットが **行末**） | 左端の表示中詳細バーを選択 |
| **`←`**（詳細バーから） | プロンプトへ戻る |
| **`Tab`** / **`Shift+Tab`** | 表示中の詳細バーを循環 |
| **`Alt`**（tabs / search 詳細バー） | **`--auto` / `--manual`** page-active を切替（保存される） |
| **`→`**（詳細バーから） | 対応するピッカー列へ入る（列は左へアニメーション） |

各バーにはモード別ヒント（例: tabs/search: `末尾→で選択 · ← でプロンプト · Alt で page-active · → でピッカー · タブ←/→で詳細バー`）が出ます。配線は **`lib/features/bmxt-window/use-detail-bar-keyboard.ts`** の **`useDetailBarKeyboard`**。

**`Esc` と閉じる操作**

- **`Esc` ではピッカー列は閉じません。** 各ピッカーの最上位で **`Esc` を押すと、起動したセッションの BMXt プロンプトへ戻ります**（列は表示されたまま）。
- **タブピッカーのみ:** サブモードは **`Esc` で段階的に解除**（`#` → `:` コマンドモード → `/` 検索 → バルクサブモード → **プロンプトへ**）。詳細は [タブピッカー](#tabs-tab-picker-ja)。
- **列を閉じる**（同一セッションのプロンプトから）:

| コマンド | 閉じる対象 |
|----------|------------|
| `tabs -exit -list` | タブピッカー（対話的 **`group new`** 含む） |
| `search -exit -list` | search リストピッカー |
| `dom -exit -list` | DOM リストピッカー（権限確認パネル含む） |
| `setting -exit -list` | 設定ピッカー |

Service Worker の **`run`** は `*-exit -list` で案内行を返すだけで、実際の閉じる処理はウィンドウ UI が行います。

**列の開き方（UI 優先）**

| 入力 | 動作 |
|------|------|
| `tabs -list` / `tabs -list -u` | タブピッカー列を開く |
| `group new`（タブ ID なし） | **group-new** variant のタブピッカー列 |
| `search -list` のみ（末尾スペースなし）+ **Enter** | **`search -list `** に復帰（continuation） |
| `search -list ` + **Enter** | 横断検索 **`--all`** を実行（進捗はピッカー内）後、search 列に結果表示 |
| `search -list [--all|--history|--bookmark|--page] [<pattern>]` + **Enter** | 選択スコープ（**`--all`** は 3 スコープ並列）で検索実行 |
| `dom -list` のみ + **Enter** | `--html` / `--react` の flavor メニュー |
| `dom -list --html` または `--react` … + **Enter** | DOM 取得後、dom 列を開く |
| `setting -list` + **Enter** | 設定ピッカー列を開く（**[`setting`](#setting-ja)** 参照） |
| `translate -on` + **Enter** | 翻訳アシストを有効化（プロンプトにフォーカス維持） |

**設定ピッカー列（`setting -list`）**

- draft / プレビュー / **`> save setting`** / **`> cancel setting`** — **[`setting`](#setting-ja)** 参照。
- 列最上位の **`Esc`** は **プロンプト**へ（列は開いたまま）。閉じるは **`setting -exit -list`**。
- キー配信は **`useSettingPickerKeyboard`**（`lib/features/setting/use-setting-picker-keyboard.ts`）。search/dom の `/` / `n` / `N` モデルとは別。

**プレーンリスト列（search / dom の行一覧）**

- **`/`** — インクリメンタル絞り込み。**`Enter`** で検索モード終了（search では行上の **`Enter`** で URL を開く、または詳細ジャンプが可能なときはページ内一致へ移動）。
- **`:`** → **`nohlsearch`** — フィルタと検索ハイライトを解除。
- **`n`** / **`N`** — 結果行上の複数マッチ間を移動（1 行に複数 page ヒットがあるとき）。
- **`→`** / **`←`** — **search のみ:** タブが開いていれば **詳細一覧**、閉じていれば **`[history]`** の **開き先**（詳細ヒットの有無は不問）。**`←`** で戻る。詳細・開き先の **`Esc`** は先に結果一覧へ戻る。
- **`Ctrl+←` / `Ctrl+→`** — ペイン内の列ストリップ移動（上記フォーカス節）。
- **dom のみ:** **`↑` / `↓`**（または **`j` / `k`**）で **ジャンプ可能な要素行**にフォーカスを移すと、**対象タブがハイライトノードへスクロール**（debounce）。DOM path のない行はスキップ。

**共通キー（正）**

UI の一行ヒントは **`lib/features/side-picker/interaction/picker-headlines.ts`**（search/dom）と **`lib/features/bmxt-core/tabs-picker/headline.ts`**（tabs・モード別）。ショートカットを変えたらこの表も更新する。

| キー / 操作 | search / dom 行一覧 | タブピッカー（`tabs -list`） |
|-------------|-------------------|------------------------------|
| `j` / `k`, `↑` / `↓` | ハイライト移動；search **`--auto`**: 開き済みタブ行を移動時プレビュー | ハイライト移動（`moveHi`）；**`--auto`**: 背面ウィンドウ内タブもアクティブ化 |
| `Ctrl+↑` / `Ctrl+↓` | **search のみ:** **開き済みタブ**の結果／詳細行のみジャンプ（アニメーションスクロール；**`--auto`** でプレビュー） | — |
| `Alt+↑` / `Alt+↓` | **search のみ、`--manual` page-active:** 背面タブをプレビュー（通常の **`↑`/`↓`** ハイライトは維持） | **`--manual` のみ:** 背面ウィンドウ内でハイライトタブをアクティブ化 |
| `/` | 検索モード（`@` で URL 部分一致） | 同左（可視行を絞る） |
| `/` 中の `Enter` | 検索終了（ハイライト確定） | 検索終了 |
| 通常時の `Enter` | search 結果: URL を開くまたは page ジャンプ；search 詳細: ページ内ジャンプ；search 開き先: 選択先へ開く | ハイライトタブをアクティブ化（列は開いたまま） |
| `:` → `nohlsearch` | フィルタ・ハイライト解除 | 検索ハイライト解除 |
| `n` / `N` | 結果行上の次／前マッチ | 次／前のマッチ行 |
| `→` / `←` | search: タブ開=詳細／閉+history=開き先；dom: プロンプト行末で **詳細バー** | ハイライト中の **ウィンドウ** または **タブグループ** 行を閉じる／開く（タブ行は所属グループ） |
| `Ctrl+←` / `Ctrl+→` | 列ストリップ（ターミナル ↔ 開列） | 同左 |
| `Esc` | プロンプトへ、または search 詳細／開き先 → 結果一覧 | `#` → `:` → `/` → バルク → プロンプト |
| `#` / `Tab` | — | マーク付け／複数選択 |
| `:` + バルク | — | `move`, `close`, `group`, `nw`, `nt`, `edit`（[タブピッカー](#tabs-tab-picker-ja)） |
| `Shift+↑` / `Shift+↓` | — | タブ行の `#` 範囲拡張 |
| `Ctrl+Shift+↑` / `Ctrl+Shift+↓` | — | ハイライト移動＋背面ウィンドウ内タブを強制アクティブ化 |
| 列を閉じる | `search -exit -list` / `dom -exit -list` | `tabs -exit -list` |

**翻訳アシスト（プロンプト / nav typing）**

- **`translate -on`** でアシストのみ有効化（横並びエディタ列は開かない）。**`translate -off`** で無効化。nav typing 時はプロンプト下に **原文 / 訳 / 再訳** プレビュー。詳細は **[`translate`](#translate-ja)**。

**新しいサイド列ピッカーの追加**

1. `lib/features/side-picker/session/session-pickers.ts` の `PickerSlotId` とセッション状態にスロットを追加。
2. `lib/features/side-picker/wrappers/picker-slot-registry.tsx` にレンダラを登録（`PICKER_SLOT_ORDER` の順序）。
3. manifest に `<command> -list`（開く）と `<command> -exit -list`（閉じる）を追加（閉じる処理は `bmxt-shell.tsx` が実行；SW は案内のみ）。
4. `bmxt-shell.tsx` の起動処理と `bmxt-terminal.tsx` の `setSessionPickerSlot` を配線。
5. `PlainTextPickerBody` / `UrlListPickerWrapper` / `PickerListShell` を使う場合は `picker-headlines.ts` に headline 定数を追加。
6. tabs 相当の bulk サブモードが要る列は **`PlainPickerKeyboardExtensions`** を拡張し、reducer/実行は機能モジュール側に置く（`use-tab-picker-plain-extensions.ts` 参照）。

### `dom`


- **`dom` 単体 + Enter** で利用案内を表示し、プロンプトを **`dom `** に戻して第二トークン入力を待つ（manifest の `subcommands` がある第一コマンドと同じ continuation）。
- **`dom -list` のみ** + **Enter** では **`--html` / `--react` の flavor メニュー**を開く（第三トークン確定後に picker 実行）。詳細は **[列の開き方](#picker-ui-ja)**。
- **`dom -list --html` …** / **`dom -list --react` …** は直前にフォーカスした通常ウィンドウの**アクティブタブ**を対象に、`chrome.scripting` で読み取り専用ヘルパーを注入し、DOM のフラットなアウトラインをピッカーに流し込む。**Chrome が拡張スクリプトを許可する通常の http(s) ページ**のみ（`chrome://`・ウェブストア・`chrome-extension://` 等はエラー）。注入前に**オプションのホスト権限**を確認し、必要なら実行時プロンプトが出る（`search -list --page` 系と同じ系統）。
- **`--html`**（既定）と **`--react`** はピッカー上のノード表示ラベルの違いのみ。
- flavor の後ろのトークンはすべて連結され、出力行に対する**部分一致**フィルタになる（大文字小文字は ASCII 範囲で折りたたみ）。**正規表現ではない**。パターンを ASCII の `"` / `'` で1重に囲んだ場合は外側を1回だけ除去する。

### `search`


- **`search` 単体 + Enter** で利用案内を表示し、**`search `** へ復帰する。
- **`search -list` のみ**（末尾スペースなし）+ **Enter** で **`search -list `** に復帰（continuation）。**`search -list `** + **Enter** で横断検索（**`--all`**: 履歴 + ブックマーク + 開いている http(s) タブ本文）。**`search -list `** のあと Tab で **`--all`** / **`--history`** / **`--bookmark`** / **`--page`** を補完して単一スコープに限定できる（**[列の開き方](#picker-ui-ja)**）。
- **`search -list [--all|--history|--bookmark|--page] [<pattern>]`** は `dom -list` と同系のリストピッカー。**`--all`** は 3 スコープを並列 dispatch する。**`--history`** / **`--bookmark`** の再走査は SQLite メタデータキャッシュ（`bmxt_search_cache_db_v1`）を利用することがある。**`--page`**（および **`--all`** の page 部分）は開いている http(s) タブから**都度 live 読み取り**（本文のキャッシュ・バックグラウンド先読みなし）。走査中の進捗はピッカー内に表示（アクティブシェルで rAF バッチ）し、結果確定後に非表示にする。
- プロンプトの **`Ctrl+C`** または **`search -exit -list`** で、当該セッションの走査中 **`search-list`** ジョブをキャンセルできる（**[ジョブ実行](#job-execution-ja)**）。
- 結果一覧で **`→`** は、該当 URL のタブが **開いていれば** 細分化ヒットがある行のみ **詳細一覧** へ。**タブが開いていなければ**（詳細ヒットの有無を問わず）**`[history]`** 行は **開き先** へ。**`←`** / **`Esc`** で 1 段戻る。結果行の **`Enter`** は新規タブ（または page ジャンプ）。詳細行の **`Enter`** はタブ前面化して該当箇所へスクロール。開き先行の **`Enter`** で選択先へ開く。
- **開き済みタブ行のみ:** **`Ctrl+↑` / `Ctrl+↓`** で URL が既に開いている行だけジャンプ（リストはアニメーションスクロール）。**`--auto`** page-active ではジャンプごとにプレビュー。
- **`Alt+↑` / `Alt+↓`**（**`--manual`** page-active のみ）: 通常の **`↑`/`↓`** ハイライトを変えず、背面タブをプレビュー。
- **詳細バー**（search ピッカー表示中のプロンプト下ステータス列）: キャレットが **行末** のとき **`→`** でバーを選択、**`←`** でプロンプトへ、**`Tab`** / **`Shift+Tab`** で詳細バーを循環、**`Alt`** で **`--auto` / `--manual`** page-active を切替（**`chrome.storage.local`** に保存）、詳細バーから **`→`** で search ピッカー列へ。開き済みタブの結果行には **ファビコン** を表示（取得可能な場合）。
- パターンの扱いは `dom` と同様（大文字小文字を区別しない部分一致、v1 は正規表現なし、ASCII 引用符の除去）。**`search -list … --page`** は非破棄の **http(s)** タブを**実行時に**走査する（タブごとの可視 `innerText`。**search SQLite には本文を保存しない**）。初回などに **オプションのホスト権限** を求めることがある。

<a id="tabs-man-tabs-ja"></a>

### `tabs` (subcommands)

- **`tabs` 単体**は利用可能オプションを表示し、続けて **`tabs `**（末尾スペース付き）へ入力を復元します。
- **`tabs -list [-u]`**：タブピッカー列を開きます（`-u` で URL 行付き）。
- **`tabs -exit -list`**：当該セッションのタブピッカー列を閉じます。
- **`tabs -setting -page-active --auto | --manual`**：ハイライト移動時のタブプレビューを設定。**`--auto`**（既定）: ハイライト移動で背面ウィンドウ内のタブをアクティブ化。**`--manual`**: **Alt+↑↓**（または **Alt** 押下）時のみアクティブ化。**Enter** は従来どおりハイライトタブへジャンプしてウィンドウを前面化。設定は **`chrome.storage.local`** に保存。タブピッカー表示中はプロンプト下の **tabs** ステータス列に現在モードを表示。
- **`tabs -nowurl`**：現在タブの URL を表示します。
- **`tabs -moveurl <url>`**：該当 http(s) タブをアクティブにしウィンドウを前面化。一致がなければ新規タブで開く。プロンプト上で `tabs -moveurl ` の直後に **Tab** を押すと、開いている http(s) タブの URL を補完候補として循環します。

<a id="tabs-tab-picker-edit-ja"></a>

### タブピッカー `:edit`（ウィンドウ名・タブグループ）

`:edit` は **`tabs -list`** / **`tabs -list -u`** で開いたタブピッカー内でのみ使えます。**`:`** → **`edit`** → **`Enter`**（短縮別名なし。`Tab` で補完候補を循環し、対象がウィンドウ行またはタブグループ行のとき `edit` が候補に入る）。

**有効な対象**

- **ウィンドウ行 1 つ**、または **タブグループ行 1 つ**（Chrome の実グループ）。
- **タブ行**および **未グループのタブ**（グループ見出しなし）は対象外。
- ウィンドウ／グループ見出しに **`#`** を付けるか、**`#` なし**でその行をハイライトして確定（未マーク時はハイライト行が自動マーク）。

選択が不正（タブのみ、複数ウィンドウ／グループなど）のときはログに **`error:`** 行が出て edit モードは開きません。

**ウィンドウ — 表示名**

- **[EDIT] window name** を開く。保存済みのカスタム名、なければそのウィンドウの **アクティブタブタイトル** を初期値にする。
- **`Enter`** で **`chrome.storage.local`** に保存（ウィンドウごとの表示名。空文字でカスタム名を消し、一覧は Chrome 既定に戻る）。
- **`Esc`** でキャンセルし一覧へ戻る。

**タブグループ — メニュー → リネームまたは Chrome 操作**

- **[EDIT] operation menu** を **`↑`/`↓`** + **`Enter`** で操作:
  - **Rename** — タイトル欄。**`Enter`** で **`chrome.tabGroups.update`**。**`Esc`** でメニューへ戻る。
  - **Ungroup tabs** — **`Enter`** で即実行（`chrome.tabGroups.ungroup`）。
  - **Delete tab group** — **`Enter`** で即実行（グループ内タブを閉じる）。
- 成功後はマーク解除、edit 終了、行を再取得。

<a id="tabs-tab-picker-ja"></a>
<a id="tabs-tab-picker-impl-ja"></a>

### タブピッカー（`tabs -list` / `tabs -list -u`）

**ツリー構造**

- 行は階層表示: **`[ウィンドウ]`** → **`[タブグループ]`**（Chrome の実グループのみ）→ **タブ行**。**タブ行**にはページ URL から解決できる **ファビコン** を表示します。
- Chrome グループに属さないタブは **ウィンドウ行の直下**に並びます（「(グループなし)」見出し行はありません）。
- **初期状態はすべて展開**。**←** でハイライト中のウィンドウまたはタブグループを閉じ、**→** で開きます。**タブ行**では **←** / **→** は **所属タブグループ**に対して効きます（未グループのタブには折りたたみ対象がありません）。
- 開閉状態は **BMXt プロセス**存続中保持されます（BMXt ウィンドウを閉じても保持。**最後の 1 ペイン**の **`exit`** で消去 — [BMXt プロセスのライフサイクル](#bmxt-process-lifecycle-ja)）。

**移動とバルク操作**

- 起動時は、直前にフォーカスしていた通常ブラウザウィンドウのアクティブタブ位置にハイライトを合わせます。
- `j`/`k`（または `↑`/`↓`）で移動、ピッカー内の `Tab` でハイライト中タブの `#` を付け外しします（複数選択可）。**Shift + `↑`/`↓`** で、ハイライトの移動に合わせて**連続したタブ行に `#` を一括付与**します（一覧上でアンカー行から現在行までの範囲）。**`#` が付いたタブは、同一ウィンドウ内では Chrome 本体のタブバー上でも複数選択（`chrome.tabs.highlight`）に合わせて表示**されます（BMXt を前面にしたまま操作できます）。
- **バルク操作の選択**: `:` を押してコマンドラインを開き、コマンドを入力して `Enter` で確定します。`Tab` でプレフィックスに一致する候補を循環補完できます。`#` が付いたタブがない場合、コマンド確定時にハイライト中のタブが自動的に `#` でマークされます。
  - タブ行: `move`（`m`）、`close`（`c`）、`group`（`g`）、`newwindow`（`nw`）
  - ウィンドウ行: `close`（`c`）、`newtab`（`nt`）、`edit`
  - グループ行: `move`（`m`）、`close`（`c`）、`newwindow`（`nw`）、`edit`
- `:` コマンドモードでは、コマンド未入力のまま `Tab` または `Enter` を押すと、現在の対象（タブ／ウィンドウ／グループ）に応じた利用可能コマンドを薄いプレースホルダーで表示します。
- **[MOVE]** は `↑`/`↓` で移動先タブを選び、`Enter` で `#` タブを一括移動します。
- **[CLOSE]** は `Enter` で `#` タブを一括で閉じます。**[GROUP]** は `↑`/`↓` でグループ選択後、`Enter` で `#` タブを追加します（**新しいグループ** を選ぶと名前・色パネルへ。**`Enter`** で作成確定、**`Esc`** でタブ一覧へ、**`Tab`** で名前↔色）。**[NEW WINDOW]** は `Enter` で `#` タブを新規ウィンドウへ一括移動します。**[NEW TAB]** は `Enter` で URL 入力パネルへ進みます。
- **対話的 `group new`**（プロンプトで tabId なし）: **group-new** variant のタブピッカー列を開く — `Tab` でタブ選択、**`Enter`** で **[GROUP]** → 新しいグループ と同じ名前・色パネルへ、再度 **`Enter`** で作成。
- `/` でインクリメンタル検索（`@` 接頭で URL 部分一致）。絞り込み中は **フィルタ欄にキーボードフォーカスが残り**、一覧側に入力フォーカスが移らない。**`Esc`** の解除順は `#` 全解除 → `:` コマンドモード終了 → `/` 検索終了 → バルクサブモード終了 → **BMXt プロンプトへ**（列は開いたまま）。列を閉じるには **`tabs -exit -list`**。
- バルクモードでない `Enter` は、ハイライト中タブをアクティブ化して対象ウィンドウを前面化します（ピッカーは維持）。


### タブピッカー — 実装（キー配信とリデューサ）

**入口:** **`TabsPickerWrapper`** → **`useTabPickerController`** → **`TabsUrlListPicker`**（`PickerListShell` + **`TabPickerRowList`** + bulk/edit パネル）。**`TabPickerOverlay`** は同一スタックの非推奨エイリアス。

- **ウィンドウキャプチャ**: **`usePlainPickerKeyboard`** が **`useWindowKeydownCapture`** で **↑/↓/j/k**, `/`, `:`, `n`/`N`, **Enter** を拾います（リストクリック後など IME `textarea` 以外にフォーカスがあっても動作）。textarea の **`onInputKeyDown`** でも同じチェーンを実行します。
- **tabs 固有キー**: **`useTabPickerPlainExtensions`** が **`PlainPickerKeyboardExtensions`** を供給 — バルク時の縦移動、Shift 範囲、Ctrl+Shift プレビュー、段階 **`Esc`**, **`Tab`** / `#`, **`:`** バルクコマンド（`use-tab-picker-plain-extensions.ts` の `parsePickerCommand`、短縮例 `m` → `move`、**`edit`** はエイリアスなし）、tabs 向け **Enter** 意図（**新規グループ meta** の名前・色確定は window capture の **`onNormalEnter`** 経由）。配線は **`use-tab-picker-keyboard.ts`**。
- **リデューサ（TypeScript）**: 状態遷移は **`lib/features/bmxt-core/tabs-picker/reducer.ts`** の **`runTabsPickerReduce`**。イベント／状態は **`kind: "moveHi"`** や **`visibleLen`** など **camelCase**。
- **Shift + 矢印**: **`moveHi` の直後に `selectRange`** を **`applyReducedStateSequence`** で **1 チェーン**にまとめています。同一ハンドラ内で `setState` を二度叩くと、2 回目が **古い `hi`** を見て範囲が正しく伸びないことがありました。
- **`:edit` UI**: 対象判定・エラー文は **`lib/features/tabs/resolve-edit-entry.ts`**。パネルと Chrome／storage 副作用は **`use-tab-picker-edit.ts`**、**`controller/edit-actions.ts`**、**`extension-storage/window-display-names.ts`**（仕様は [タブピッカー `:edit`](#tabs-tab-picker-edit-ja)）。
- **ピッカー表示中のプロンプト**: **`lib/features/bmxt-window/bmxt-terminal.tsx`** でピッカー表示中はメイン textarea の **↑/↓/j/k をコマンド履歴に使わない**ようにし、ピッカーと競合しないようにしています。

<a id="url-lines-ja"></a>

### URL（行全体が `http` / `https` で始まる場合）

- `https://example.com` — 新規タブで開く  
- `https://example.com .` — 現在のタブ（前面ウィンドウのアクティブタブ）で開く  
- `https://example.com -nw` — 新しいウィンドウで開く  

<a id="command-execution-architecture-ja"></a>

## コマンド実行アーキテクチャ（現状）


**一覧の真実**は **`manifest/bmxt-codegen.json`** です。**`npm run codegen`** で **`lib/features/bmxt-core/registry/table.gen.ts`**・**`effect-types.ts`**・**`apply-dispatch.gen.ts`**・**`completion-fallback.ts`**・**`command-subcommands.gen.ts`** を再生成します。組み込みコマンドの **`run`** は **`lib/features/bmxt-core/cmd/*.ts`**、Chrome 副作用は **`lib/features/dispatch/handlers/effects/`** に置きます。Service Worker では **`dispatchFull`** が **`lines` / `effects`** を返し、**`apply-one`** が効果をハンドラに振り分けます。Tab 補完はレジストリの **`allCompletionTokens()`**（manifest と同内容の **`completion-fallback.ts`** も生成）。

タブピッカーは **`lib/features/bmxt-core/tabs-picker/reducer.ts`** の **`runTabsPickerReduce`**（詳細は **`tabs`** の **タブピッカー — 実装**）。

**例外（先に UI 側）:** 一部の入力は Service Worker の `RUN_CMD` より前に BMXt ウィンドウ UI（**`lib/features/bmxt-window/bmxt-shell.tsx`**）で処理します。例: **`tabs -list` / `tabs -list -u`**、**`* -exit -list`**（ピッカー列を閉じる）、**`dom -list`**、**`search -list`**、**`setting -list` / `setting -exit -list`**、**`session -list` / `session -switch` / `session -setting-name`**、**`translate -on` / `translate -off` / `translate -setting`**、**`nav -enter` / `nav -exit`**、**対話的な `group new`**（タブ ID なし）。**`nav -enter`** と **`translate -on` / `-setting`** の起動・ペア保存・オーバーレイ／typing アシスト、**`setting -list`** の開閉と draft 編集、**`session -list` / `-switch` / `-setting-name`** のインライン候補・改名は UI 側；Service Worker の **`run`** は利用案内行のみ。それ以外はバックグラウンドで **`runDispatch`** します。ピッカー列は **[ピッカー UI（横並び列）](#picker-ui-ja)**、ターミナルセッションは **[`session`](#session-ja)**、UI 設定は **[`setting`](#setting-ja)**、nav は **[Nav モード](#nav-mode-ja)**、翻訳は **[`translate`](#translate-ja)** を参照。

**`exit`:** **`exit_pane`** Effect を返す。Service Worker は **アクティブなターミナルセッション**を閉じる。**最後の 1 セッション**のときは BMXt ウィンドウを閉じ、**プロセススコープの storage をすべて消去**する（**[BMXt プロセスのライフサイクル](#bmxt-process-lifecycle-ja)**）。

- **`manifest/bmxt-codegen.json`** — コマンド一覧・**`commands[].subcommands`**・Effect スキーマ・TS ハンドラ配線の単一ソース（**`npm run codegen`**）
- **`lib/features/bmxt-core/`** — `dispatch.ts`、`registry/`、`cmd/*.ts`（**`CMD` + `run`**；**`table.gen.ts`** は生成）、`tabs-picker/`
- **`lib/features/bmxt-window/`** — BMXt ウィンドウのメイン UI
- **`lib/features/extension-storage/`** — ストレージキーと上限
- **`lib/features/page-dom/`** — DOM 注入ヘルパー（`dom -list`）
- **`lib/features/nav/`** — nav オーバーレイ（**[Nav モード](#nav-mode-ja)**）
- **`lib/features/translate/`** — 翻訳アシスト（**[`translate`](#translate-ja)**）
- **`lib/features/setting/`** — UI 言語・外観（`setting -list`、zip 入出力、`bmxt_ui_settings_v1`）；**[`setting`](#setting-ja)** 参照
- **`lib/features/session/`** — ターミナルセッション（`session -list` / `-switch` インライン候補、セッションバー）；**[`session`](#session-ja)** 参照
- **`lib/features/job/`** — スコープ別 **`JobRunner`**、キャンセルハンドル、任意の SQLite 監査ログ；**[ジョブ実行](#job-execution-ja)** 参照
- **`entrypoints/bmxt-nav-overlay.content.ts`** — http(s) 向け nav 用 WXT コンテンツスクリプト
- **`lib/features/dispatch/`** — 生成ディスパッチ + **`handlers/effects/`**
- **`lib/features/builtin-commands/`** — 補完・continuation の生成物
- **`entrypoints/background.ts`** — **`run-cmd`** ジョブ（**`persist: false`**）で `RUN_CMD` を包む → `runDispatch` → lines / `applyChromeEffects`（`exit` → `exit_pane`；最後の 1 ペインなら追跡ウィンドウを閉じ、プロセススコープの storage をすべて消去）

manifest やコマンド実装を変えたら **`npm run codegen`** のあと **`npm run verify:manifest`** / **`npm run check:generated`** を実行し、必要なら **`npm run build`** してください。

<a id="job-execution-ja"></a>

### ジョブ実行（バックグラウンド処理）


キャンセル可能な長時間処理は **`lib/features/job/`** の **`JobRunner`**（スコープ id ごと）で実行します。BMXt UI では各ターミナルセッション id がスコープ、Service Worker では予約スコープ **`__background__`**（ほとんどの `RUN_CMD`）、タブピッカー追従更新は **`__terminal__`** です。

| ジョブ種別 | 典型スコープ | 上書き方針 | 起動箇所 |
|------------|--------------|------------|----------|
| `search-list` | セッション id | cancel-previous | `bmxt-shell.tsx`（`search -list`） |
| `dom-list` | セッション id | cancel-previous | `bmxt-shell.tsx`（`dom -list`） |
| `run-cmd` | `__background__` | parallel | `entrypoints/background.ts` |
| `tab-picker-refresh` | `__terminal__` | coalesce-latest | タブピッカー追従更新 |

**キャンセル:** プロンプトの **`Ctrl+C`**、走査中の **`* -exit -list`**、同一スコープで同種ジョブを再開始（**cancel-previous** 種別）。

**任意の監査ログ:** BMXt UI タブでのみ、完了ジョブを **`bmxt_job_db_v1`**（SQLite blob、スコープごとに間引き）へ追記することがある。Service Worker はこのモジュールを読み込まない — バックグラウンド **`run-cmd`** は **`persist: false`**。

**search 走査進捗:** **`search -list`** の進捗行はアクティブシェル内で **`requestAnimationFrame`** バッチ（`use-batched-search-loading-progress.ts`）し、全セッションペインの再描画を抑える。結果確定時に search ピッカーへマージする。

**実装:** **`job-types.ts`**、**`job-runner.ts`**、**`job-handle.ts`**、**`use-session-job-runner.ts`**、**`dispatch-context-from-job.ts`**、DB は **`lib/features/job/db/`**（任意）。

<a id="add-new-built-in-command-ja"></a>

### 組み込みコマンドの追加

手順の一覧（scaffold、manifest、新 Effect、検証）は下記 **[コマンド追加手順](#command-add-procedure-ja)** を参照。


1. **`manifest/bmxt-codegen.json`** を編集する。必要なら **`npm run new:command -- <module> <name> [aliases...]`** で **`lib/features/bmxt-core/cmd/<module>.ts`** と manifest を追加。
2. **`cmd/<module>.ts`** の **`run`** を実装。**`export const CMD`** を manifest と一致させる（**`npm run verify:manifest`**）。
3. Chrome 用の新 Effect なら manifest の **`effects`** を足し **`npm run codegen`** のあと **`handlers/effects/`** に **`tsHandlerFile`** 相当の実装を置く。
4. **`npm run codegen`** のあと **`verify:manifest`** / **`check:generated`** で確認（CI でも実行）。

<a id="command-add-procedure-ja"></a>

### コマンド追加手順


- **コマンドラインのトークン仕様:** 追加・変更時は **[コマンドラインのトークン仕様（第一・第二コマンド）](#command-line-token-model-ja)** と **`.cursorrules`** に従う。continuation と第二トークン Tab 候補は **`command-subcommands.gen.ts`**（manifest の **`subcommands`** から生成）。
- **真実のデータは 1 箇所:** **`manifest/bmxt-codegen.json`**。次は手編集しない: **`table.gen.ts`**、**`effect-types.ts`**、**`apply-dispatch.gen.ts`**、**`completion-fallback.ts`**、**`command-subcommands.gen.ts`**（いずれも **`npm run codegen`** で再生成）。
- **手順（推奨）:** **`npm run new:command -- <module> <canonical_name> [aliases...]`** — **`lib/features/bmxt-core/cmd/<module>.ts`** と manifest を更新し **codegen** まで実行。
- **手動で足す場合:** manifest の **`commands[]`** に追記 → **`lib/features/bmxt-core/cmd/<module>.ts`** → **`npm run codegen`**。
- **ブラウザ連携（新しい `Effect`）:** manifest の **`effects[]`** → **codegen** → **`handlers/effects/<tsHandlerFile>.ts`** → **`run`** から **`effectsDispatch`**。
- **検証:** **`verify:manifest`** / **`check:generated`** → **`npx tsc --noEmit`** → **`npm run build`**。

各 **`commands[]`** 行に **`subcommands`** を必ず含める。dispatch は **`lib/features/bmxt-core/cmd/<module>.ts`** に書き、各 **`head`** を manifest と**同一の文字列リテラル**で参照する（**`npm run verify:manifest`** が検査）。

**手書きの `handlers/effects/*.ts`:** codegen の対象外。manifest の **`effects[]`** 変更後は生成型・**`apply-dispatch.gen.ts`** に**揃える**。

**リファクタ前（Rust/WASM）との比較:** コマンド登録・補完・Effect・ディスパッチを **manifest + codegen** で揃え、**`bmxt-core/cmd/*.ts`** と **`handlers/effects/`** に実装を分ける。ビルドは **Node/TypeScript のみ**（Rust ツールチェーン不要）。

<a id="prompt-key-bindings-ja"></a>

## プロンプトのキーバインド


プロンプトの **`textarea` にフォーカス**があるときの操作です。

- **← / → / Home / End** — 行内カーソル移動（ブラウザ標準の挙動）
- **Tab** — コマンド補完（繰り返しで候補循環。固定トークン用 IME 風ピッカー。`tabs ` など第一コマンドのみで **Enter** したあとは **第二コマンド候補リスト** が出ることあり — ↑/↓・Tab・Enter・Esc）
- **↑ / ↓** — コマンド履歴
- **Ctrl+R** — 逆方向インクリメンタルサーチ（続けて押すと古い一致へ）
- **Enter** — コマンド実行（逆検索モードでは確定）。**nav** オーバーレイが **ON** でターミナル列にフォーカスがあるときは、ページ上の **クリック**（**[Nav モード](#nav-mode-ja)**）
- **Shift+Enter** — 改行を入力可能
- **Esc** — 逆検索のキャンセル

**nav 起動中**（`nav -enter` 後）:

- **Alt** — 対象ブラウザタブの nav オーバーレイ **ON** / **OFF**（BMXt ウィンドウがアクティブで、ターミナル列にフォーカス）。**typing** 中の短い **Alt** は無視。**Alt 長押し**（約 500ms）は入力確定。
- **↑ / ↓ / ← / →** — オーバーレイ **ON** 時は仮想カーソル移動（コマンド履歴ではない）。**tabs / search / dom** ピッカー列にフォーカスがあるときはピッカー操作。
- **Enter** — オーバーレイ **ON** 時、左クリック相当、または編集可能要素で **typing モード**。
- **Ctrl**（タップ、オーバーレイ **ON**）— カーソル位置の **コンテキストメニュー**（**↑ / ↓** 選択、**Enter** 実行、**← / →** 履歴、**Ctrl** / **Esc** で閉じる）。詳細は **[Nav モード](#nav-mode-ja)**。
- **Esc 長押し**（約 500ms、**typing** 中）— 入力取消（フィールドを元に戻す）。

変換中は IME 用の `composition` イベントを優先し、変換確定までショートカットと競合しないようにしています。

<a id="development-ja"></a>

## 開発


依存関係のインストール後、開発ビルドを起動します（手順の全体像は **Development startup** / **開発時の起動** を参照）。

```bash
npm ci        # package-lock.json があるときはこちら
npm run dev   # または pnpm dev
```

`npm run dev` は **`wxt`**（ウォッチ付き開発ビルド）で、**`.output/chrome-mv3-dev`** を更新します。作業中はターミナル上のプロセスを止めずに置いておきます。

**`manifest/bmxt-codegen.json`** を編集したときは、拡張を再読み込みする前に **`npm run codegen`** を実行し、生成 TypeScript を揃えてください。

<a id="development-startup-ja"></a>

### 開発時の起動

1. **依存関係:** リポジトリ直下で **`npm ci`**（**`package-lock.json`** があるときはこちらを優先）。依存を更新して lockfile を書き換えるときだけ **`npm install`**。**[npm 依存関係とセキュリティ](#npm-dependencies-ja)** を参照。
2. **Codegen:** **`manifest/bmxt-codegen.json`** を編集したときは、**`npm run codegen`** で **`lib/features/bmxt-core/registry/`**・**`lib/features/dispatch/`**・**`lib/features/builtin-commands/`** の生成物を揃える。
3. **開発サーバ:** リポジトリ直下で **`npm run dev`** を実行する。これは **`wxt`** で、`.output/chrome-mv3-dev` をウォッチビルドする。**プロセスは終了させず**ターミナルに置いておく。
4. **Chrome に読み込み:** `chrome://extensions` を開き、**デベロッパーモード**をオンにして「パッケージ化されていない拡張機能を読み込む」から **`.output/chrome-mv3-dev`** を指定する（WXT dev が出力するディレクトリ）。
5. **BMXt を開く:** ツールバーの拡張機能アイコンから BMXt ウィンドウを開く。
6. **変更の反映:** 保存後、WXT の再ビルドが終わったら `chrome://extensions` で拡張機能カードの **「再読み込み」** を押し、BMXt ウィンドウを開き直して Service Worker・UI の変更を取り込む。

<a id="main-sources-ja"></a>

### 主なソース

- **`wxt.config.ts`** — Manifest V3、CSP、グローバルショートカット、Vite/React ビルド
- **`entrypoints/background.ts`** — Service Worker（ウィンドウ起動・`runDispatch`・Effect 実行）
- **`entrypoints/bmxt/index.html`**, **`entrypoints/bmxt/main.tsx`** — BMXt ウィンドウエントリ（`BmxtTerminal` の薄いラッパ、出力 **`bmxt.html`**）
- **`entrypoints/bmxt-nav-overlay.content.ts`** — Nav コンテンツスクリプト（http(s)）
- **`bmxt-ui.css`** — リポジトリ直下。ウィンドウ用スタイル（`entrypoints/bmxt/main.tsx` から import、**`#root`** フルブリード）
- **`public/_locales/`** — 拡張名・説明の i18n（manifest の `__MSG_*__`）
- **`public/assets/search-cache/`** — SQLite search キャッシュ用 WASM
- **`lib/features/bmxt-window/`** — BMXt ウィンドウのメイン UI（`bmxt-terminal.tsx`、セッションログ／履歴フックなど）
- **`lib/features/side-picker/`** — 横並びピッカー列の共有 UI（パネルホスト・`PickerListShell`・`usePlainPickerKeyboard`・interaction kernel・ラッパ）
- **`lib/features/release-notes/release-notes.json`** — アプリ内バージョンアップ通知の変更内容（キーは `package.json` の `version` と一致させてメンテ）
- **`lib/features/welcome/`** — ウェルカムタブ URL 生成、install/update 自動表示、**`welcome-content.json`**
- **`docs/welcome.html`**, **`docs/welcome-content.json`** — GitHub Pages ウェルカムページ（JSON は `lib/features/welcome/` から同期）
- **`lib/features/extension-storage/`** — ストレージキーと上限（Service Worker と UI の両方から参照）
- **`lib/features/tabs/`** — タブピッカー（`tabs-picker-wrapper.tsx`、`tabs-url-list-picker.tsx`、`use-tab-picker-controller.ts`、`picker-rows.ts`、keyboard 拡張など）
- **`lib/features/bmxt-core/`** — コマンドレジストリ・ディスパッチ・`cmd/*.ts`・タブピッカーリデューサ（**`registry/table.gen.ts`** は codegen）
- **`lib/features/dispatch/`** — **`effect-types.ts`** / 生成ディスパッチ・**`handlers/effects/`** で Chrome 実行
- **`lib/features/builtin-commands/`** — **`completion-fallback.ts`**・**`command-subcommands.gen.ts`**（manifest から codegen）
- **`manifest/bmxt-codegen.json`** — codegen マニフェスト（編集後は **`npm run codegen`**）
- **`lib/features/page-dom/`** — DOM 注入ヘルパー（`dom -list`）
- **`lib/features/search/`** — search モード（`search -list`）、横断 **`--all`**、SQLite メタデータキャッシュ（`bmxt_search_cache_db_v1` — **`--history`** / **`--bookmark`** のみ）
- **`lib/features/job/`** — スコープ別 **`JobRunner`**、キャンセルハンドル、任意の SQLite 監査ログ（`bmxt_job_db_v1`）
- **`lib/features/nav/`** — Nav オーバーレイ機能パッケージ
- **`lib/features/translate/`** — 翻訳アシスト（`translate -on` / `-off` / `-setting`、`translation-pair.ts`）
- **`lib/features/setting/`** — 設定ピッカー（`setting -list`、`appearance.ts`、`settings-export.ts`）
- **`lib/features/session/`** — ターミナルセッション（`session-input.ts`、インライン候補、`session-bar.tsx`）

コードを編集すると、開発モードではビルドが更新されるので、拡張の「再読み込み」で反映を確認できます。

<a id="version-upgrade-banner-ja"></a>

### バージョンアップバナーとリリースノート


**拡張更新時のウェルカムページ**（GitHub Pages の通常タブ。ウィンドウ内ブロックとは別）

Chrome が **`install`** または **`update`** を報告したとき、**`entrypoints/background.ts`** が **`openWelcomePageOnUpdateIfNeeded`** を呼び、**`openWelcomePageTab`** で **`https://unrsports.github.io/bmxt/welcome.html`** を **バージョンごとに 1 回** 開きます（**`LAST_SEEN_WELCOME_VERSION_KEY`** で記録）。文言は **`lib/features/welcome/welcome-content.json`**（GitHub Pages 向けに **`docs/welcome-content.json`** へ同期）。

**手動・プレビュー URL:** `https://unrsports.github.io/bmxt/welcome.html?lang=ja&v=0.6.0` で **`welcome-content.json`** の該当版までを表示（**`v`** 省略 → 全版、不正な **`v`** は無視）。更新時の自動表示では実行時の locale/version 以外のクエリは付けない。

**ウィンドウ内のアップグレードブロック**（アップデート後、BMXt を初めて開いたとき）

拡張機能の **`version`**（**`package.json`**／ビルド後の manifest）が、**`chrome.storage.local`** の **`bmxt_last_seen_extension_version`**（**`LAST_SEEN_EXTENSION_VERSION_KEY`**）と **一致しない** とき、BMXt を開いた **そのバージョンへアップデートしたあとの初回だけ**、次を表示します。

1. 既存どおりの **ウェルカム** 文言（内容は変更しない運用）。
2. **バージョンアップ** 見出しと、**`release-notes.json`** の日英変更説明。

既存の **セッションログ** は、その **下** に続きます。

**リリース時の作業**

1. **`package.json`** の **`version`** を上げる。
2. **`lib/features/release-notes/release-notes.json`** に、**同じバージョン文字列** をキーとするオブジェクトを追加する（**`ja`** / **`en`** の文字列配列。ウィンドウ内アップグレードバナー用）。
3. 任意で **`lib/features/welcome/welcome-content.json`** に GitHub Pages 用エントリを追加（**`version`**, **`ja`**, **`en`** 配列）。**`npm run build`** または **`npm run dev`** で **`scripts/sync-welcome-docs.mjs`** が **`docs/welcome-content.json`** を更新する。両 JSON をコミットし **`docs/`** を GitHub Pages にデプロイ。画像は **`docs/welcome/`**（hero 変更時は **`docs/welcome.html`** も編集）。
4. ビルドして配布する。

**`release-notes.json`** に該当キーが無い場合は、メンテ向けプレースホルダが表示されます。

**実装:** ウェルカムタブ — **`open-welcome-page-tab.ts`**、**`open-welcome-on-update.ts`**、**`welcome-external-url.ts`**、**`docs/welcome.html`**。**`aboutbmxt`** — **`cmd/aboutbmxt.ts`**、**`handlers/effects/open-welcome-page.ts`**（同一 **`openWelcomePageTab`**）。ウィンドウ内バナー — **`use-version-upgrade-banner.ts`**、描画待ち **`bmxt-terminal.tsx`**、UI **`bmxt-shell.tsx`**、スタイル **`bmxt-ui.css`**（`.bmxt-version-upgrade*`）。

<a id="production-build-ja"></a>

## 本番ビルド

```bash
npm run build
```

成果物は **`.output/chrome-mv3`** 配下に出力されます。手動テストでは `chrome://extensions` からこのフォルダを unpacked 読み込みしてください。

ストア提出用 zip:

```bash
npm run package
```

本番ビルドのあと **`.output/bmxtdemo-<version>-chrome.zip`** を生成します（**`<version>`** は **`package.json`** の version）。CI の submit ワークフロー（**.github/workflows/submit.yml`**）も同じ zip パスで [bpp](https://bpp.browser.market) を利用します。

<a id="store-submission-ja"></a>

## ストア提出（参考）


[WXT zip](https://wxt.dev/guide/essentials/config/build-mode.html)や [bpp](https://bpp.browser.market) などの自動化を利用できます。初回はストア側で拡張を登録し、資格情報を整えてから CI 連携するのが一般的です。

<a id="license-ja"></a>

## ライセンス


このプロジェクトは [Apache License 2.0](./LICENSE) の下で公開しています。

<a id="roadmap-ja"></a>

## ロードマップ

1. UI および動作の設計／実装／テスト
2. 基本となる tabs モードでのキー操作見直し
3. 履歴、ブックマーク操作
4. 複数ターミナルでの動作
5. 純粋なコマンドラインでの動作や各種自動処理系への対応など
