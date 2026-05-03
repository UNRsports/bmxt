# BMXt

> Language guide: This README starts with **English**, followed by **Japanese**.  
> 言語案内: この README は **英語**を先に、その後に**日本語**を掲載しています。

## Table of contents / 目次

_Jump links use explicit anchors; language-only subheadings (`English` / `日本語`) are omitted here._  
_ジャンプ先は明示アンカーです。言語だけの小見出し（`English` / `日本語`）は目次に含めていません。_

- [Introduction](#introduction)
- [🛠 Seed Project](#seed-project)
- [📺 Demo Video](#demo-video)
- [♿️ Universal Design Intent](#universal-design-intent)
- [☕️ Support this Journey](#support-this-journey)
- [Technical Overview](#technical-overview)
- [Key Specs](#key-specs)
  - [Permissions (`manifest` in `package.json`)](#permissions-manifest)
- [Command List](#command-list)
  - [`tabs` (`man tabs`)](#tabs-man-tabs)
  - [English: Tab Picker (`tabs -l` / `tabs -l -u`)](#tabs-tab-picker-en)
  - [English: Tab picker — implementation (keyboard & reducer)](#tabs-tab-picker-impl-en)
  - [日本語: タブピッカー（`tabs -l` / `tabs -l -u`）](#tabs-tab-picker-ja)
  - [日本語: タブピッカー — 実装（キー配信とリデューサ）](#tabs-tab-picker-impl-ja)
  - [English: URL Lines (`http` / `https`)](#url-lines-en)
  - [日本語: URL（行全体が `http` / `https` で始まる場合）](#url-lines-ja)
- [Command Execution Architecture (Current)](#command-execution-architecture)
  - [Add a New Built-in Command](#add-new-built-in-command)
- [Prompt Key Bindings](#prompt-key-bindings)
- [Development](#development)
  - [Rust toolchain (WASM builds)](#rust-toolchain-wasm)
  - [Development startup (step-by-step)](#development-startup)
  - [日本語（開発時の起動）](#development-startup-ja)
  - [Main Sources / 主なソース](#main-sources)
- [Production Build](#production-build)
- [Store Submission (Reference)](#store-submission)
- [License](#license)
- [Roadmap](#roadmap)


<a id="introduction"></a>

## Introduction

### English

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

The project is still in its early days and is not yet on the Chrome Web Store. Even so, the author believes the keyboard can take you “anywhere,” will keep adding features, and wants to keep building BMXt as a **tool that stays human-centered**.

The sections below describe what BMXt can do today.
Please also take a look at the demo video.

### 日本語

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

いまはまだ道を作り始めたばかりでchromeウェブストアにも掲載する前の開発段階です。
しかし、目の前のキーボードから「どこへでも行ける」と信じ、これからも機能を積み上げて、しかし人間に寄り添う道具として作り続けていきたいと考えています。

ではまず、いまできることをご説明します。
ぜひ動作デモのビデオもご覧になってください。

<a id="seed-project"></a>

## 🛠 Seed Project

### English

This repository is a dedicated shell built with **Chrome Extension (Manifest V3) + [Plasmo](https://docs.plasmo.com/)**. It runs in its own normal browser window (not a popup) to support tab-group operations. The author handles technical decision-making and verification/design/testing, while implementation is done 100% with an AI assistant (Cursor). At this stage, the project is positioned as a validation and seeding phase focused on eliminating behavioral breakage and polishing UX.

### 日本語

このリポジトリは **Chrome 拡張（Manifest V3）＋ [Plasmo](https://docs.plasmo.com/)** で動く専用シェルです。タブグループ操作に対応するため、BMXt は popup ではなく **独立した通常ブラウザウィンドウ**で動作します。技術選定の判断と確認／設計／テストは作者自身が、実装には AI アシスタント（Cursor）を100%使用して進めており、現段階では「動作の破綻をなくし、手触りを磨く」ための検証・種まきのフェーズと位置づけています。

<a id="demo-video"></a>

## 📺 Demo Video

Note: The demo video currently covers the group creation part of the available features.

※デモムービーには全機能のうち、グループ作成に関する部分を収録しています。



https://github.com/user-attachments/assets/2e418356-cfce-479a-9880-185e542c5fad







<a id="universal-design-intent"></a>

## ♿️ Universal Design Intent

### English

BMXt is not only an efficiency tool for engineers; it also aims to build reliable, low-effort interaction paths by reducing mouse dependency, keeping key operations consistent, and coexisting well with IME input.

### 日本語

BMXt は、エンジニア向けの効率ツールであるとともに、**できるだけ軽い操作負担で確実に操作できる導線**（マウス指向 UI への依存を減らす、キー操作の一貫性、IME との両立など）を重ねていくことを目指しています。

<a id="support-this-journey"></a>

## ☕️ Support this Journey

### English

I have currently applied for GitHub Sponsors. Once there is progress and the support page is ready, I will add the official link here.

### 日本語

現在 GitHub Sponsors に申請中です。進展があり、支援ページの準備が整い次第、正式なリンクをここに掲載します。

---

<a id="technical-overview"></a>

## Technical Overview

### English

The following is a technical overview. From the toolbar icon, you can open/focus the BMXt window and run tab/window/group operations plus one-line URL navigation from the command line. Built with [Plasmo](https://docs.plasmo.com/) (Manifest V3).

**Layout:** Command registry and dispatch live in **`wasm/bmxt-core`**; Chrome API effects and feature UI live under **`lib/features/<feature>/`** (see also `.cursorrules` in the repo root).

### 日本語

以下は技術仕様の概要です。ツールバーの拡張アイコンから BMXt ウィンドウを開き（既に開いていれば前面へ）、タブ・ウィンドウ・タブグループの操作や URL 一行ナビゲーションをコマンドラインから行えます。[Plasmo](https://docs.plasmo.com/)（Manifest V3）でビルドしています。

**配置:** コマンドのレジストリとディスパッチは **`wasm/bmxt-core`**、Chrome API の実行や機能別 UI は **`lib/features/<feature>/`** に置く方針です（リポジトリ直下の **`.cursorrules`** も参照）。

<a id="key-specs"></a>

## Key Specs

### English
- **UI**: Extension page opened in a dedicated normal browser window (Plasmo route `tabs/bmxt`), not a popup. The window UI is implemented in **`lib/features/bmxt-window/`** (`BmxtTerminal`); **`tabs/bmxt.tsx`** is a thin entry that mounts it.
- **Input**: Prompt line is rendered with a transparent `textarea` + mirror layer. Supports Japanese IME composition/commit while keeping logs selectable/copyable with normal text nodes.
- **State**: Command output logs and command history are stored in `chrome.storage.local`. Keys and caps are defined in **`lib/features/extension-storage/keys.ts`**: **500** log lines (`bmxt_log`), **300** history entries (`bmxt_cmd_history`).
- **Background**: Service Worker (`background.ts`) opens the window on icon click and handles command execution and tab operations.

### 日本語
- **UI**: 独立した通常ブラウザウィンドウで動く拡張ページ（Plasmo のルート **`tabs/bmxt`**、popup ではない）。実装の本体は **`lib/features/bmxt-window/`**（`BmxtTerminal`）で、**`tabs/bmxt.tsx`** はそれをマウントする薄いエントリです。
- **入力**: プロンプト行は **透明な `textarea` + 下層ミラー** で描画。日本語 IME（変換・確定）に対応しつつ、**ログ領域は通常のテキストノード**のため、マウスでの**範囲選択・コピー**を妨げない構成にしています。
- **状態**: コマンド出力ログとコマンド履歴は `chrome.storage.local` に保持。キーと上限は **`lib/features/extension-storage/keys.ts`** で定義（**ログ 500 行** `bmxt_log`、**履歴 300 件** `bmxt_cmd_history`）。
- **バックグラウンド**: Service Worker（`background.ts`）がアイコンクリックでウィンドウを開き、コマンド実行・タブ操作を処理します。

<a id="permissions-manifest"></a>

### Permissions (`manifest` in `package.json`)

### English

`tabs`, `tabGroups`, `storage`, `windows`

The manifest also sets **`content_security_policy.extension_pages`** so extension pages can load WASM (**`wasm-unsafe-eval`**) and, for local development, scripts from **`http://localhost`** (see `package.json`).

### 日本語

`tabs`, `tabGroups`, `storage`, `windows`

拡張ページの CSP（**`content_security_policy.extension_pages`**）では、WASM 用に **`wasm-unsafe-eval`** を許可し、開発時は **`http://localhost`** からのスクリプトも許可しています（詳細は **`package.json`**）。
<a id="command-list"></a>

## Command List

### English

`help` or `?` shows the same command overview as in-app help.

| Command | Description |
|----------|------|
| `help` / `?` | Show help |
| `man <topic>` | Command manual |
| `echo <text>` | Print text |
| `clear` | Clear logs |
| `exit` | Close BMXt window and clear the session log |
| `tabs` | Requires subcommand (`man tabs`) |
| `tabs -l` / `tabs -list` | Open tab picker; supports search, multi-select marker `#`, and bulk modes |
| `tabs -mu` / `tabs -moveurl <url>` | Focus matching URL tab or open new tab (http/https) |
| `tabs -nu` / `tabs -nowurl` | Print current tab URL |
| `windows` / `wins` | List windows |
| `focus` | Show focus debug info |
| `activate` / `a <tabId>` | Activate tab and focus its window |
| `close` / `c <tabId>` | Close tab |
| `new [url]` | Open new tab |
| `back` / `b [tabId]` | Go back |
| `forward` / `fwd [tabId]` | Go forward |
| `move` / `mv <tabId> <windowId> [index]` | Move tab to another window |
| `groups` / `gls` | List tab groups |
| `group new <tabId> …` | Create group |

**Note — `clear` vs `exit`:** `clear` only clears the on-screen session log; the BMXt window stays open. `exit` clears that log and **closes the BMXt window** (via `chrome.windows.remove` on the window the extension tracks). **Neither** clears **command history** (up/down / Ctrl+R).

### 日本語

`help` または `?` で拡張内ヘルプと同内容が表示されます。概要だけ以下にまとめます。

| コマンド | 説明 |
|----------|------|
| `help` / `?` | ヘルプ |
| `man <topic>` | 各コマンドの簡易マニュアル |
| `echo <text>` | そのまま出力 |
| `clear` | ログをクリア |
| `exit` | BMXt ウィンドウを閉じ、セッションログを削除 |
| `tabs` | 単体では使えません。下位コマンドが必要です（`man tabs`）。 |
| `tabs -l` / `tabs -list` | タブピッカーを開き、検索・複数選択 `#`・バルクモードに対応。 |
| `tabs -mu` / `tabs -moveurl <url>` | 指定 URL タブがあれば前面化、なければ新規タブを開く（http/https）。 |
| `tabs -nu` / `tabs -nowurl` | 現在タブの URL を表示。 |
| `windows` / `wins` | ウィンドウ一覧 |
| `focus` | フォーカス情報（デバッグ） |
| `activate` / `a <tabId>` | タブをアクティブにして前面化 |
| `close` / `c <tabId>` | タブを閉じる |
| `new [url]` | 新規タブ |
| `back` / `b [tabId]` | 戻る |
| `forward` / `fwd [tabId]` | 進む |
| `move` / `mv <tabId> <windowId> [index]` | タブを別ウィンドウへ移動 |
| `groups` / `gls` | タブグループ一覧 |
| `group new <tabId> …` | グループ作成 |

**補足 — `clear` と `exit`:** `clear` は画面のセッションログだけを消し、BMXt ウィンドウは開いたままです。`exit` はそのログを消したうえで **BMXt ウィンドウを閉じます**（拡張が追跡しているウィンドウに対して `chrome.windows.remove`）。**どちらもコマンド履歴**（↑/↓ や Ctrl+R）**は消しません**。

<a id="tabs-man-tabs"></a>

### `tabs` (`man tabs`)

#### English
- `tabs` alone returns an error (subcommand required). Use `tabs -l` (`tabs -list`) for tab picker. Add `-u` to include URL rows.
- `tabs -nu` (`-nowurl`): print current tab URL.
- `tabs -mu <url>` (`-moveurl`): activate matching http(s) tab and bring its window to front, or open a new tab if none matches.

#### 日本語
- **`tabs` 単体**はエラー（サブコマンド必須）。**`tabs -l`**（または **`tabs -list`**）でタブピッカー。URL 行付きは **`tabs -l -u`**。
- **`tabs -nu`**（**`-nowurl`**）：現在タブの URL を表示。
- **`tabs -mu <url>`**（**`-moveurl`**）：該当 http(s) タブをアクティブにしウィンドウを前面化。一致がなければ新規タブで開く。プロンプト上で `tabs -mu ` の直後に **Tab** を押すと、開いている http(s) タブの URL を補完候補として循環します。

<a id="tabs-tab-picker-en"></a>

#### English: Tab Picker (`tabs -l` / `tabs -l -u`)

- On launch, highlight starts at the active tab of the last focused normal browser window.
- Move with `j`/`k` (or `↑`/`↓`), toggle `#` on highlighted tab with `Tab` (multi-select supported).
- When one or more tabs have `#`, press `Space` to cycle **[MOVE]** → **[CLOSE]** → **[GROUP]** → **[NEW WINDOW]**.
- Use `/` for incremental search (`@` prefix for URL match). `Enter` focuses the highlighted tab while keeping picker open; `Esc` exits according to picker state.

<a id="tabs-tab-picker-impl-en"></a>

#### English: Tab picker — implementation (keyboard & reducer)

- **Global capture**: `TabPickerOverlay` registers a **`window` `keydown` listener in the capture phase** so **↑/↓/j/k** are handled even when focus is not on the picker’s invisible filter `textarea` (e.g. after clicking the list). The same navigation logic also runs from the filter `textarea`’s `onKeyDown` when the event reaches it.
- **Reducer JSON (WASM)**: Transitions go through **`tabsPickerReduce`** (`lib/features/wasm-core/index.ts` → `wasm/bmxt-core`). State and events are JSON with **camelCase** keys matching Serde `rename_all = "camelCase"` in Rust (e.g. `kind: "moveHi"`, `visibleLen`).
- **Silent WASM failures**: If the WASM entrypoint fails to deserialize the **event** JSON, it returns the **input state unchanged** (no error surfaced). A **TypeScript fallback** in **`runTabsPickerReduce`** corrects **`moveHi`** and **`moveDest`** when the returned indices clearly did not advance (covers stale/mismatched bundled `.wasm`).
- **Shift + arrows**: **Range selection** applies **`moveHi` then `selectRange`** in one synchronous chain (**`applyReducedStateSequence`** in `picker-overlay.tsx`). Two separate React updates in the same handler would read a **stale `hi`** for the second call and could break range extension.
- **Prompt coexisting with picker**: While the tab picker is open, **`lib/features/bmxt-window/bmxt-terminal.tsx`** suppresses **↑/↓/j/k** on the main prompt so they do **not** drive **command history**; navigation is handled only by the picker.

<a id="tabs-tab-picker-ja"></a>

#### 日本語: タブピッカー（`tabs -l` / `tabs -l -u`）

- 起動時は、直前にフォーカスしていた通常ブラウザウィンドウのアクティブタブ位置にハイライトを合わせます。
- `j`/`k`（または `↑`/`↓`）で移動、ピッカー内の `Tab` でハイライト中タブの `#` を付け外しします（複数選択可）。**Shift + `↑`/`↓`** で、ハイライトの移動に合わせて**連続したタブ行に `#` を一括付与**します（一覧上でアンカー行から現在行までの範囲）。**`#` が付いたタブは、同一ウィンドウ内では Chrome 本体のタブバー上でも複数選択（`chrome.tabs.highlight`）に合わせて表示**されます（BMXt を前面にしたまま操作できます）。
- `#` が1つ以上あるとき、`Space` で **[MOVE]** → **[CLOSE]** → **[GROUP]** → **[NEW WINDOW]** を循環します。
- **[MOVE]** は `↑`/`↓` で移動先タブを選び、`Enter` で `#` タブを一括移動します。
- **[CLOSE]** は `Enter` で `#` タブを一括で閉じます。**[GROUP]** は `↑`/`↓` でグループ選択後、`Enter` で `#` タブを追加します。**[NEW WINDOW]** は `Enter` で `#` タブを新規ウィンドウへ一括移動します。
- `/` でインクリメンタル検索（`@` 接頭で URL 部分一致）。検索中でも `Tab` の `#` 切替と `Space` のモード切替は有効です。`Esc` は、**いずれかに `#` が付いていればまずすべて解除**（ピッカーは維持）。続いて「検索終了 → バルクサブモード終了 → ピッカー終了」の順です。
- バルクモードでない `Enter` は、ハイライト中タブをアクティブ化して対象ウィンドウを前面化します（ピッカーは維持）。

<a id="tabs-tab-picker-impl-ja"></a>

#### 日本語: タブピッカー — 実装（キー配信とリデューサ）

- **ウィンドウキャプチャ**: `TabPickerOverlay` は **`window` に `keydown`（キャプチャ）**を登録し、フィルタ用の不可視 `textarea` 以外にフォーカスがあっても **↑/↓/j/k** を拾います。フォーカスが textarea にあるときは `onInputKeyDown` でも同じナビ処理をします。
- **リデューサ JSON（WASM）**: 状態遷移は **`tabsPickerReduce`**（`lib/features/wasm-core` → `wasm/bmxt-core`）。JSON は Rust 側 Serde の **`rename_all = "camelCase"`** に合わせ、**`kind: "moveHi"`** や **`visibleLen`** など **camelCase** で渡します。
- **WASM が無言で失敗するとき**: イベント JSON のデシリアライズに失敗すると **入力 state がそのまま返る**ため、同梱 `.wasm` がソースとずれているとハイライトが進みません。**`moveHi` / `moveDest`** については、戻り値の添字が進んでいない場合に限り TypeScript 側で **折り返しと同じ計算**を補います。
- **Shift + 矢印**: **`moveHi` の直後に `selectRange`** を **`applyReducedStateSequence`** で **1 チェーン**にまとめています。同一ハンドラ内で `setState` を二度叩くと、2 回目が **古い `hi`** を見て範囲が正しく伸びないことがありました。
- **ピッカー表示中のプロンプト**: **`lib/features/bmxt-window/bmxt-terminal.tsx`** でピッカー表示中はメイン textarea の **↑/↓/j/k をコマンド履歴に使わない**ようにし、ピッカーと競合しないようにしています。

<a id="url-lines-en"></a>

#### English: URL Lines (`http` / `https`)

- `https://example.com` — Open in a new tab
- `https://example.com .` — Open in current tab (active tab in front window)
- `https://example.com -nw` — Open in a new window

<a id="url-lines-ja"></a>

#### 日本語: URL（行全体が `http` / `https` で始まる場合）

- `https://example.com` — 新規タブで開く  
- `https://example.com .` — 現在のタブ（前面ウィンドウのアクティブタブ）で開く  
- `https://example.com -nw` — 新しいウィンドウで開く  

<a id="command-execution-architecture"></a>

## Command Execution Architecture (Current)

### English

**Registry, `help` / `man` text, tokenization, and URL-only lines** are implemented in **`wasm/bmxt-core` (Rust / WASM)**. For lines sent to the Service Worker, **`dispatchFull`** returns either terminal **`lines`** or JSON **`effects`**. Effects that need **`chrome.*`** are applied in TypeScript (`lib/features/dispatch/handlers/apply-one.ts`, from `apply-effects.ts`). Tab completion candidate **names** come from **`completionCandidatesJson()`** in the same WASM module (with a small TS fallback in `lib/features/builtin-commands/` if WASM fails to load).

The tab picker’s **`tabsPickerReduce`** uses **camelCase JSON** for reducer events/state; after changing **`wasm/bmxt-core/src/features/tabs_picker/model.rs`**, rebuild **`assets/wasm/bmxt-core`** with **`npm run build:wasm`** (see **Tab picker — implementation** under **`tabs`**). The TS layer includes a narrow fallback for **`moveHi` / `moveDest`** when WASM returns an unchanged state.

**Exception — UI-handled first:** some inputs are handled in the BMXt window UI (`lib/features/bmxt-window/bmxt-terminal.tsx`) *before* `RUN_CMD` reaches the Service Worker—e.g. **`tabs -l` / `tabs -l -u`** (tab picker) and **interactive `group new`** (no tab ids). Other subcommands and the rest of the command set go through WASM dispatch in the background.

**`exit`:** returns an **`exit_bmxt`** effect; the Service Worker clears the session log and closes the BMXt window it tracks (`chrome.windows.remove`). If WASM fails to load, **`clear`** and **`exit`** still run equivalent logic in `background.ts` (log clear; **`exit`** also closes the window).

**Main directories:**

- **`lib/features/bmxt-window/`** — main BMXt window UI (log, prompt, IME, tab picker launch)
- **`lib/features/extension-storage/`** — `chrome.storage.local` keys and log/history caps
- **`wasm/bmxt-core/src/cmd/`** — one module per built-in command (`CMD` + `run`; listed in **`registry/table.rs`**)
- **`wasm/bmxt-core`** — `dispatch`, `registry`, `model` (Effect JSON), `tabs_man`
- **`assets/wasm/bmxt-core`** — `wasm-pack --target web` output (bundled with the extension)
- **`lib/features/wasm-core/index.ts`** — `ensureBmxtCore`, `runDispatch`, `getCompletionCandidates`
- **`lib/features/dispatch/`** — Effect types and Chrome handlers (`handlers/` per effect)
- **`lib/features/builtin-commands/`** — Tab completion fallback when WASM is unavailable
- **`background.ts`** — `runDispatch` → lines / `applyChromeEffects` (`exit` → `exit_bmxt` then closes the tracked window; WASM missing → **`clear` / `exit`** handled in `background.ts` only—see **`exit`** paragraph above)

### 日本語

**レジストリ・`help` / `man` 本文・トークン化・URL 専用行**は **`wasm/bmxt-core`（Rust / WASM）** に置いています。Service Worker に送られた行に対して **`dispatchFull`** は **`lines`** か JSON **`effects`** を返し、**`effects`** の `chrome.*` 操作は `lib/features/dispatch/handlers/apply-one.ts`（`apply-effects.ts` 経由）で行います。Tab 補完の**コマンド名候補**は WASM の **`completionCandidatesJson`**（WASM 未ロード時は `lib/features/builtin-commands/` のフォールバック）。

タブピッカーの **`tabsPickerReduce`** はリデューサのイベント／状態を **camelCase の JSON** でやり取りします。**`wasm/bmxt-core/src/features/tabs_picker/model.rs`** を変えたら **`npm run build:wasm`** で **`assets/wasm/bmxt-core`** を再ビルドしてください（詳細は **`tabs`** の **タブピッカー — 実装**）。**`moveHi` / `moveDest`** については、WASM が入力と同じ状態を返した場合に限り TypeScript 側で狭いフォールバックをかけています。

**例外（先に UI 側）:** 一部の入力は Service Worker の `RUN_CMD` より前に BMXt ウィンドウ UI（**`lib/features/bmxt-window/bmxt-terminal.tsx`**）で処理します。例: **`tabs -l` / `tabs -l -u`**（タブピッカー）、**対話的な `group new`**（タブ ID なし）。それ以外のサブコマンドと一般コマンドはバックグラウンドで WASM dispatch します。

- **`lib/features/bmxt-window/`** — BMXt ウィンドウのメイン UI（ログ・プロンプト・IME・タブピッカー起動など）
- **`lib/features/extension-storage/`** — `chrome.storage.local` のキー名とログ／履歴の上限定数
- **`wasm/bmxt-core/src/cmd/`** — 組み込みコマンドごとに `CMD` + `run`（`registry/table.rs` で一覧へ登録）  
- **`wasm/bmxt-core`** — `dispatch`, `registry`, `model`（Effect JSON）, `tabs_man`  
- **`assets/wasm/bmxt-core`** — `wasm-pack --target web` の生成物（ビルドに同梱）  
- **`lib/features/wasm-core/index.ts`** — `ensureBmxtCore`, `runDispatch`, `getCompletionCandidates`  
- **`lib/features/dispatch/`** — Effect 型と Chrome 実行（`handlers/` に effect ごとの処理）  
- **`lib/features/builtin-commands/`** — WASM 失敗時の Tab 補完フォールバックなど  
- **`background.ts`** — `runDispatch` → lines / `applyChromeEffects`（`exit` → `exit_bmxt` でセッションログ削除のあと BMXt ウィンドウを閉じる。WASM 未ロード時は **`clear` / `exit` だけ** `background.ts` 同等処理にフォールバック。詳細は上の英語「**`exit`:**」段落も参照）

Rust を変更したら **`npm run build:wasm`** で **`assets/wasm/bmxt-core`** を再生成してから `npm run build` してください。**タブピッカーの JSON 形式（`PickerEvent`）が WASM と一致している必要があります。** `npm run build:wasm` が `wasm-bindgen` の取得で失敗する環境では、`wasm/bmxt-core` で `cargo build --release --target wasm32-unknown-unknown` のあと、インストール済みの **`wasm-bindgen`** で `bmxt_core.wasm` から `assets/wasm/bmxt-core` へ生成し直してください。

<a id="add-new-built-in-command"></a>

### Add a New Built-in Command

Step-by-step template: **`wasm/bmxt-core/src/cmd/ADD_COMMAND.md`**.

#### English

1. In **`wasm/bmxt-core/src/cmd/`**, add a module with `CMD` + `run`, register it in **`cmd/mod.rs`**, and append **`your_module::CMD`** to **`registry/table.rs`**. Add a **`dispatch.rs`** arm calling `run` (and `model::Effect` if needed).  
2. If the command uses the browser, implement the effect in **`lib/features/dispatch/handlers/apply-one.ts`** (and **`effect-types.ts`** for a new JSON shape).  
3. If you add command names or aliases, update **`lib/features/builtin-commands/completion-fallback.ts`** so it stays aligned with Rust completion tokens.  
4. Run **`npm run build:wasm`**, then verify `help`, `man`, and Tab completion.

#### 日本語

1. **`wasm/bmxt-core/src/cmd/`** に `CMD` と `run` を持つモジュールを追加し、**`cmd/mod.rs`** に登録、**`registry/table.rs`** の `COMMANDS` に **`your_module::CMD`** を追加。必要なら **`model::Effect`** と **`dispatch.rs`** の分岐を追加。  
2. ブラウザ操作が要る場合は **`lib/features/dispatch/handlers/apply-one.ts`**（新しい JSON 形なら **`effect-types.ts`** も）。  
3. コマンド名・別名を増やしたら、Rust の補完トークンと揃えるため **`lib/features/builtin-commands/completion-fallback.ts`** も更新。  
4. **`npm run build:wasm`** のあと `help` / `man` / 補完を確認。

<a id="prompt-key-bindings"></a>

## Prompt Key Bindings

### English

Applies when the prompt `textarea` is focused.

- **Left / Right / Home / End** — Move cursor in line
- **Tab** — Command completion (cycle candidates)
- **Up / Down** — Command history
- **Ctrl+R** — Reverse incremental search
- **Enter** — Execute command
- **Shift+Enter** — Insert newline
- **Esc** — Cancel reverse search

During IME composition, composition events are prioritized to avoid conflicts with shortcuts until commit.

### 日本語

プロンプトの **`textarea` にフォーカス**があるときの操作です。

- **← / → / Home / End** — 行内カーソル移動（ブラウザ標準の挙動）
- **Tab** — コマンド補完（繰り返しで候補循環）
- **↑ / ↓** — コマンド履歴
- **Ctrl+R** — 逆方向インクリメンタルサーチ（続けて押すと古い一致へ）
- **Enter** — コマンド実行（逆検索モードでは確定）
- **Shift+Enter** — 改行を入力可能
- **Esc** — 逆検索のキャンセル

変換中は IME 用の `composition` イベントを優先し、変換確定までショートカットと競合しないようにしています。

<a id="development"></a>

## Development

<a id="rust-toolchain-wasm"></a>

### Rust toolchain (WASM builds)

#### English

Command dispatch and core logic live in **`wasm/bmxt-core`** and compile to WebAssembly via **`wasm-pack`** (`npm run build:wasm`). Install Rust with **[rustup](https://rustup.rs/)**:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"   # or restart your shell
rustc --version && cargo --version
```

Add the WebAssembly target:

```bash
rustup target add wasm32-unknown-unknown
```

This repo lists **`wasm-pack`** as a devDependency; after **`npm install`**, **`npm run build:wasm`** uses that local binary. To install **`wasm-pack`** globally: **`cargo install wasm-pack`**.

Verify from the repo root: **`npm install`** then **`npm run build:wasm`**.

If **`npm run build:wasm`** fails while fetching **`wasm-bindgen`**, build with **`cargo build --release --target wasm32-unknown-unknown`** under **`wasm/bmxt-core`**, then regenerate **`assets/wasm/bmxt-core`** with your installed **`wasm-bindgen`** CLI (same layout as **`wasm-pack`**). The **Command Execution Architecture** section above also describes this fallback.

Optional: install the **rust-analyzer** extension in your editor for Rust editing.

#### 日本語

コマンドのディスパッチやコアロジックは **`wasm/bmxt-core`** にあり、**`wasm-pack`** で WebAssembly にビルドします（**`npm run build:wasm`**）。Rust は **[rustup](https://rustup.rs/)** で入れるのが一般的です。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"   # またはシェルを開き直す
rustc --version && cargo --version
```

WASM 用ターゲットを追加します。

```bash
rustup target add wasm32-unknown-unknown
```

**`wasm-pack`** は本リポジトリの devDependency です。**`npm install`** のあと **`npm run build:wasm`** でローカルのバイナリが使われます。グローバルに入れる場合は **`cargo install wasm-pack`** でも構いません。

リポジトリ直下で **`npm install`** → **`npm run build:wasm`** まで通れば、このプロジェクト向けの Rust / WASM 準備は一通り揃います。

**`npm run build:wasm`** が **`wasm-bindgen`** の取得で失敗する場合は、`wasm/bmxt-core` で **`cargo build --release --target wasm32-unknown-unknown`** のあと、インストール済みの **`wasm-bindgen`** で **`assets/wasm/bmxt-core`** を生成し直してください（上の **Command Execution Architecture** / 日本語段落の説明と同じ回避策です）。

任意: エディタでは **rust-analyzer** 拡張があると Rust の編集が楽です。

### English

After installing dependencies, start the development build (see **Development startup** below for the full flow).

```bash
npm install   # or pnpm install / yarn
npm run dev   # or pnpm dev
# If WASM assets are missing or you changed Rust under wasm/bmxt-core/:
npm run dev:fresh   # runs build:wasm, then plasmo dev
```

`npm run dev` runs **`plasmo dev`**: a watch build that updates **`build/chrome-mv3-dev`**. Keep the terminal process running while you work. **`npm run dev:fresh`** runs **`npm run build:wasm`** first, then **`plasmo dev`**—use it when **`assets/wasm/bmxt-core/`** is absent or after editing **`wasm/bmxt-core/`**.

### 日本語

依存関係のインストール後、開発ビルドを起動します（手順の全体像は **Development startup** / **開発時の起動** を参照）。

```bash
npm install   # または pnpm install / yarn
npm run dev   # または pnpm dev
# WASM が無い／Rust を直した直後は:
npm run dev:fresh   # build:wasm のあと plasmo dev
```

`npm run dev` は **`plasmo dev`**（ウォッチ付き開発ビルド）で、**`build/chrome-mv3-dev`** を更新します。作業中はターミナル上のプロセスを止めずに置いておきます。**`npm run dev:fresh`** は先に **`npm run build:wasm`** を実行してから **`plasmo dev`** を起動します。**`assets/wasm/bmxt-core/`** が無いときや **`wasm/bmxt-core/`** を編集した直後に便利です。

<a id="development-startup"></a>

### Development startup (step-by-step)

#### English

1. **Install JS dependencies:** `npm install` (or `pnpm install` / `yarn`).
2. **Rust / WASM (when needed):** On a fresh machine, install the **Rust toolchain** and **`wasm32-unknown-unknown`** (see **Rust toolchain (WASM builds)** above). If `assets/wasm/bmxt-core/` is missing or you changed `wasm/bmxt-core/`, run **`npm run build:wasm`** once so `bmxt_core.js` / `.wasm` exist before or alongside dev. Alternatively, **`npm run dev:fresh`** runs **`build:wasm`** and then **`plasmo dev`** in one step.
3. **Start dev:** From the repo root, run **`npm run dev`**. Leave this process running; it rebuilds the extension on file changes.
4. **Load in Chrome:** Open `chrome://extensions`, enable **Developer mode**, **Load unpacked**, and select **`build/chrome-mv3-dev`** (created by Plasmo dev).
5. **Open BMXt:** Click the extension toolbar icon to open the BMXt window.
6. **After edits:** When Plasmo finishes rebuilding, use **Reload** on the extension card (or reload the BMXt tab) so the Service Worker and UI pick up changes.

<a id="development-startup-ja"></a>

#### 日本語（開発時の起動）

1. **依存関係:** リポジトリ直下で `npm install`（または `pnpm` / `yarn`）。
2. **Rust / WASM:** 初回環境では **Rust** と **`wasm32-unknown-unknown`** を入れる（**Rust toolchain (WASM builds)** を参照）。`assets/wasm/bmxt-core/` が無い場合や `wasm/bmxt-core/` を編集した場合は、**`npm run build:wasm`** を実行して `bmxt_core.js` / `.wasm` を生成する（初回や Rust 変更後に実施）。まとめて行うなら **`npm run dev:fresh`**（**`build:wasm`** のあと **`plasmo dev`**）。
3. **開発サーバ:** リポジトリ直下で **`npm run dev`** を実行する。これは **`plasmo dev`** で、`build/chrome-mv3-dev` をウォッチビルドする。**プロセスは終了させず**ターミナルに置いておく。
4. **Chrome に読み込み:** `chrome://extensions` を開き、**デベロッパーモード**をオンにして「パッケージ化されていない拡張機能を読み込む」から **`build/chrome-mv3-dev`** を指定する（Plasmo dev が出力するディレクトリ）。
5. **BMXt を開く:** ツールバーの拡張機能アイコンから BMXt ウィンドウを開く。
6. **変更の反映:** 保存後、Plasmo の再ビルドが終わったら、拡張機能カードの **「再読み込み」**、または BMXt のタブ／ウィンドウの再読み込みで Service Worker・UI の変更を取り込む。

<a id="main-sources"></a>

### Main Sources / 主なソース

- `tabs/bmxt.tsx` — 拡張ページのエントリ（`BmxtTerminal` を描画するだけの薄いラッパ）
- `bmxt-ui.css` — リポジトリ直下。ウィンドウ用スタイル（`tabs/bmxt.tsx` から import）
- `lib/features/bmxt-window/` — BMXt ウィンドウのメイン UI（`bmxt-terminal.tsx`、セッションログ／履歴フックなど）
- `lib/features/extension-storage/` — ストレージキーと上限（Service Worker と UI の両方から参照）
- `lib/features/tabs/` — タブピッカー・tabs 入力パースなど（`picker-overlay.tsx`、`picker-rows.ts`、`input.ts`、各種 hooks）
- `background.ts` — Service Worker（ウィンドウ起動・WASM dispatch・Effect 実行）
- `wasm/bmxt-core/` — Rust コア（`cmd/` にコマンド単位、`registry/table.rs` で一覧）
- `lib/features/wasm-core/` — WASM 初期化・`runDispatch`・補完候補
- `lib/features/dispatch/` — Effect 型・`handlers/apply-one.ts` で Chrome 実行
- `lib/features/builtin-commands/` — 補完フォールバック（WASM 未初期化時）
- `lib/tab-picker.ts` — 互換レイヤ（`lib/features/tabs/picker-rows.ts` を再エクスポート）
- `lib/bmxt-tabs-input.ts` — 互換レイヤ（`lib/features/tabs/input.ts` を再エクスポート）

### English

In development mode, edits trigger rebuilds. Reload the extension to verify updates.

### 日本語

コードを編集すると、開発モードではビルドが更新されるので、拡張の「再読み込み」で反映を確認できます。

<a id="production-build"></a>

## Production Build

```bash
npm run build
```

### English

Artifacts are output under `build/chrome-mv3-prod`. For store submission zip, you can also run `npm run package`.

### 日本語

成果物は `build/chrome-mv3-prod` 配下に出力されます。ストア提出用に zip する場合は `npm run package`（Plasmo のパッケージコマンド）も利用できます。

<a id="store-submission"></a>

## Store Submission (Reference)

### English

You can automate submission with the [Plasmo workflow](https://docs.plasmo.com/framework/workflows/submit) or [bpp](https://bpp.browser.market). Typical flow: register extension in store, prepare credentials, then connect CI.

### 日本語

[Plasmo の提出ワークフロー](https://docs.plasmo.com/framework/workflows/submit)や [bpp](https://bpp.browser.market) などの自動化を利用できます。初回はストア側で拡張を登録し、資格情報を整えてから CI 連携するのが一般的です。

<a id="license"></a>

## License

### English

This project is licensed under [Apache License 2.0](./LICENSE).

### 日本語

このプロジェクトは [Apache License 2.0](./LICENSE) の下で公開しています。

<a id="roadmap"></a>

## Roadmap

### English
1. Refine key operations in the core tabs mode
2. Add history and bookmark operations
3. Improve multi-terminal behavior
4. Support pure command-line operation and additional automation flows

### 日本語
1. 基本となる tabs モードでのキー操作見直し
2. 履歴、ブックマーク操作
3. 複数ターミナルでの動作
4. 純粋なコマンドラインでの動作や各種自動処理系への対応など
