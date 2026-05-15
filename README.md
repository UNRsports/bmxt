# BMXt

> Language guide: This README starts with **English**, followed by **Japanese**.  
> 言語案内: この README は **英語**を先に、その後に**日本語**を掲載しています。

☕️ **Support** — *This is still an early-stage dev demo,* but if you’re curious about **BMXt** and the future it’s aiming for, you can back the journey on [**Buy Me a Coffee**](https://buymeacoffee.com/unrsports) (one-time or monthly). ✨ GitHub Sponsors is also pending—the official link will land here once it’s ready.

☕️ **支援** — *いまはまだ開発段階のデモです。* **BMXt** とそれがもたらす未来にご興味があれば、[**Buy Me a Coffee**](https://buymeacoffee.com/unrsports) からワンタイム／月額で開発を支援いただけます。

## Table of contents / 目次

_Jump links use explicit anchors; language-only subheadings (`English` / `日本語`) are omitted here._  
_ジャンプ先は明示アンカーです。言語だけの小見出し（`English` / `日本語`）は目次に含めていません。_

- [Introduction](#introduction)
- [🛠 Seed Project](#seed-project)
- [📺 Demo Video](#demo-video)
- [♿️ Universal Design Intent](#universal-design-intent)
- [Technical Overview](#technical-overview)
- [Key Specs](#key-specs)
  - [Permissions (`manifest` in `package.json`)](#permissions-manifest)
  - [Reproducible builds / 再現可能なビルド](#reproducible-builds)
- [Command-line token model (first / second commands) / コマンドラインのトークン仕様（第一・第二コマンド）](#command-line-token-model)
- [Command List](#command-list)
  - [`tabs` (subcommands)](#tabs-man-tabs)
  - [English: Tab Picker (`tabs -list` / `tabs -list -u`)](#tabs-tab-picker-en)
  - [English: Tab picker — implementation (keyboard & reducer)](#tabs-tab-picker-impl-en)
  - [日本語: タブピッカー（`tabs -list` / `tabs -list -u`）](#tabs-tab-picker-ja)
  - [日本語: タブピッカー — 実装（キー配信とリデューサ）](#tabs-tab-picker-impl-ja)
  - [English: URL Lines (`http` / `https`)](#url-lines-en)
  - [日本語: URL（行全体が `http` / `https` で始まる場合）](#url-lines-ja)
- [Command Execution Architecture (Current)](#command-execution-architecture)
  - [Add a New Built-in Command](#add-new-built-in-command)
  - [Command add procedure / コマンド追加手順](#command-add-procedure)
- [Prompt Key Bindings](#prompt-key-bindings)
- [Development](#development)
  - [Development startup (step-by-step)](#development-startup)
  - [日本語（開発時の起動）](#development-startup-ja)
  - [Main Sources / 主なソース](#main-sources)
  - [Version upgrade banner & release notes](#version-upgrade-banner)
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

The project is still in its early days, but **BMXt is available on the [Chrome Web Store](https://chromewebstore.google.com/)** (search for **BMXt**). The author believes the keyboard can take you “anywhere,” will keep adding features, and wants to keep building BMXt as a **tool that stays human-centered**.

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

いまはまだ道を作り始めたばかりですが、**[Chrome ウェブストア](https://chromewebstore.google.com/)** からインストールできます（ストア内で **BMXt** を検索してください）。
目の前のキーボードから「どこへでも行ける」と信じ、これからも機能を積み上げて、しかし人間に寄り添う道具として作り続けていきたいと考えています。

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

<a id="technical-overview"></a>

## Technical Overview

### English

The following is a technical overview. From the toolbar icon, you can open/focus the BMXt window and run tab/window/group operations plus one-line URL navigation from the command line. Built with [Plasmo](https://docs.plasmo.com/) (Manifest V3).

**Layout:** Command registry, dispatch, and built-in command logic live in **`lib/features/bmxt-core/`** (TypeScript); Chrome API effects and feature UI live under **`lib/features/<feature>/`** (see also `.cursorrules` in the repo root).

**Command-line conventions** (first/second commands, Tab completion, Enter when a second token is required) are summarized in **[Command-line token model](#command-line-token-model)**.

### 日本語

以下は技術仕様の概要です。ツールバーの拡張アイコンから BMXt ウィンドウを開き（既に開いていれば前面へ）、タブ・ウィンドウ・タブグループの操作や URL 一行ナビゲーションをコマンドラインから行えます。[Plasmo](https://docs.plasmo.com/)（Manifest V3）でビルドしています。

**配置:** コマンドのレジストリ・ディスパッチ・組み込みコマンド実装は **`lib/features/bmxt-core/`**（TypeScript）、Chrome API の実行や機能別 UI は **`lib/features/<feature>/`** に置く方針です（リポジトリ直下の **`.cursorrules`** も参照）。

**コマンドラインの約束事**（第一・第二コマンド、Tab 補完、第二必須時の Enter 挙動）は **[コマンドラインのトークン仕様](#command-line-token-model)** にまとめています。

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

`tabs`, `tabGroups`, `storage`, `windows`, `scripting`, `history`, and `bookmarks`. Host patterns `http://*/*` and `https://*/*` are declared as **`optional_host_permissions`**; the Extension requests them **at runtime** when you run commands that inject into web pages (`dom`, `grep -page`, and similar). If you deny the prompt, those commands return an error line explaining how to enable access in `chrome://extensions`.

**Data handling (aligned with the privacy policy and store text):** command output and typed history are handled primarily **in memory** for the UI; only capped fields are written to **`chrome.storage.local`** (see **`lib/features/extension-storage/keys.ts`**). The extension page and service worker are not designed to call **`fetch()`** against arbitrary third-party HTTPS URLs; CI runs **`npm run check:no-fetch`** to guard that policy, and the packaged manifest’s **Content Security Policy** (including **`connect-src 'self'`** plus localhost endpoints for Plasmo dev) is an additional guardrail—Chrome Web Store delivery and browser updates are separate.

The manifest sets **`content_security_policy.extension_pages`** with **`default-src 'self'`**, **`script-src 'self'`** (plus localhost for local development), **`connect-src 'self'`** (plus localhost / WebSocket for dev), **`object-src 'self'`**, **`style-src 'self' 'unsafe-inline'`**, **`img-src 'self' data: blob:`**, **`font-src 'self' data:`**, and **`worker-src 'self'`**. See **`package.json`** for the exact string.

### 日本語

`tabs`, `tabGroups`, `storage`, `windows`, `scripting`, `history`, `bookmarks`。ホストパターン **`http://*/*` / `https://*/*`** は **`optional_host_permissions`** とし、ページへ注入するコマンド（`dom`、`grep -page` 等）実行時に **実行時** に要求します。拒否した場合はエラー行で `chrome://extensions` での許可方法を案内します。

**データの扱い（プライバシーポリシー・ストア説明と揃えた一文）:** コマンド出力・入力履歴は主に UI 用の**メモリ**で扱い、永続化は **`chrome.storage.local`** の上限付きフィールドのみ（キーは **`lib/features/extension-storage/keys.ts`**）。拡張ページ・SW から **`fetch()`** で任意の第三者 HTTPS に取りに行く設計にはしておらず、**`npm run check:no-fetch`** で CI からも固定し、パッケージ manifest の **CSP**（**`connect-src 'self'`** ＋ Plasmo 開発用 localhost 等）は補助線です（ストア配信・ブラウザ更新は別）。

**`content_security_policy.extension_pages`** では **`default-src 'self'`**、**`script-src 'self'`**（開発時は localhost を追加）、**`connect-src 'self'`**（開発時は localhost / WebSocket）、**`object-src 'self'`**、**`style-src 'self' 'unsafe-inline'`**、**`img-src 'self' data: blob:`**、**`font-src 'self' data:`**、**`worker-src 'self'`** を宣言しています。正確な文字列は **`package.json`** を参照してください。

<a id="reproducible-builds"></a>

### Reproducible builds / 再現可能なビルド

### English

Official releases are tagged in Git (`git tag`). To reproduce a store submission from source, check out that tag and run **`npm ci`** (uses **`package-lock.json`**) then **`npm run codegen`** and **`npm run build`** (or **`npm run package`**) so the same dependency tree and codegen path apply.

### 日本語

公式リリースは Git のタグで指します（`git tag`）。ストア提出物をソースから再現するには、そのタグを checkout し、**`npm ci`**（**`package-lock.json`** 固定）のあと **`npm run codegen`** と **`npm run build`**（または **`npm run package`**）を実行し、依存ツリーと codegen 経路を揃えます。

<a id="command-line-token-model"></a>

## Command-line token model (first / second commands) / コマンドラインのトークン仕様（第一・第二コマンド）

### English

BMXt’s shell is **command-line driven**. Specs and implementations should use a consistent token model:

1. **First command, then second command** — Name the **first command** (e.g. `tabs`, `split`) and, when applicable, the **second command** next (e.g. `-list`, `-row`). Documentation and parsing follow that order.
2. **No abbreviated spellings for first/second commands** — Do not register alternate short forms for either tier (e.g. do **not** map `-l` to `-list`). **Tab completion** should offer **canonical full tokens** only for this pattern. Older top-level aliases in the README (e.g. `help`/`?`) may remain for backward compatibility; **do not** add new short aliases when introducing **new** first/second families.
3. **Enter when a second command is required** — If the first command is **not actionable** without a configured second command, pressing **Enter** with only the first token must show **usage or a placeholder** for the missing second token, then **restore the prompt** to `firstCommand ` (first command plus one trailing ASCII space) with the **cursor at the end**, ready to type the rest. Implement this through the shared **continuation** path (see **`.cursorrules`** and the first bullet under **[Command add procedure](#command-add-procedure)**), not one-off handlers per command.

### 日本語

BMXt は **コマンドライン方式**で動作する。仕様・実装・ドキュメントでは次を徹底する。

1. **第一コマンド → 第二コマンド** — 先頭の **第一コマンド**（例: `tabs`, `split`）に続き、サブコマンドやフラグ形式の **第二コマンド**（例: `-list`, `-row`）がある場合は、その順で表記・解釈する。
2. **第一・第二とも短縮形を設けない** — いずれの段でも `-list` を `-l` のように省略した別名は設けない。**Tab 補完**の対象は **正式な表記のトークン**に限る。README にある従来のトップレベル別名（例: `help`/`?`）は後方互換で残りうるが、**新規**の第一＋第二コマンド族では第一・第二いずれにも短縮を増やさない。
3. **第二コマンドが必須のときの Enter** — 第二コマンドがないと第一コマンドを実質動かせない場合、**第一コマンドだけ**で **Enter** を押すと、不足している第二コマンドの **利用案内またはプレースホルダ**を表示したうえで、プロンプトを **`第一コマンド `**（末尾に半角スペース 1 つ）に戻し、**末尾にカーソル**を置いて続きの入力を待つ。これは **再利用可能な continuation** で実装する（リポジトリ直下の **`.cursorrules`** および **[コマンド追加手順](#command-add-procedure)** の先頭箇条と整合させる）。

<a id="command-list"></a>

## Command List

### English

`help` or `?` shows the same command overview as in-app help.

| Command | Description |
|----------|------|
| `help` / `?` | Show help |
| `clear` | Clear logs |
| `exit` | Close BMXt window and clear the session log |
| `split` | Pane layout: `split -col` / `split -row`; bare `split` + Enter restores `split ` (see in-app help); **Ctrl+Arrow** moves focus between panes when multiple are open |
| `tabs` | Show available options, then restore prompt to `tabs ` for option input |
| `tabs -list [-u]` | Open tab picker; supports search, multi-select marker `#`, and bulk modes |
| `tabs -moveurl <url>` | Focus matching URL tab or open new tab (http/https) |
| `tabs -nowurl` | Print current tab URL |
| `dom` | Print usage and restore the prompt to `dom ` (trailing space) so you can enter `-list` |
| `dom -list [--html\|--react] [<pattern>]` | Open a read-only DOM picker for the active tab (same picker chrome as `grep -list`); flavor `--html` (default) or `--react`; optional case-insensitive substring filter on rendered lines (not a regex); scriptable http(s) only; may prompt for optional site access |
| `grep` | Print usage and restore the prompt to `grep ` for `-list` or a `--none` / `--history` / `--bookmark` / `--page` form |
| `grep -list [--none\|--history\|--bookmark\|--page] <pattern>` | Open a cross-search picker; default `--none` searches browsing history, bookmarks, and visible http(s) tab text together; optional flag limits to one scope; case-insensitive substring (no regex in v1) |
| `grep --none <pattern>` | Run all three scopes without the picker (log lines; empty pattern returns capped “all” hits) |
| `grep --history <pattern>` | Recent history titles/URLs only |
| `grep --bookmark <pattern>` | Bookmark titles/URLs only |
| `grep --page <pattern>` | Visible text in non-discarded http(s) tabs only; may request optional host permission at runtime |
| `close` / `c <tabId>` | Close tab |
| `group new <tabId> …` | Create group |

**Note — `clear` vs `exit`:** `clear` only clears the on-screen session log; the BMXt window stays open. `exit` clears that log and **closes the BMXt window** (via `chrome.windows.remove` on the window the extension tracks). **Neither** clears **command history** (up/down / Ctrl+R).

**0.1.1 — split panes:** With more than one pane open, **Ctrl+Arrow** moves keyboard focus between panes.

### 日本語

`help` または `?` で拡張内ヘルプと同内容が表示されます。概要だけ以下にまとめます。

| コマンド | 説明 |
|----------|------|
| `help` / `?` | ヘルプ |
| `clear` | ログをクリア |
| `exit` | BMXt ウィンドウを閉じ、セッションログを削除 |
| `split` | ペイン分割: `split -col` / `split -row`。単独 `split`＋Enter で `split ` へ復元（詳細はアプリ内ヘルプ）。複数ペイン時は **Ctrl+矢印** でフォーカス移動 |
| `tabs` | 利用可能オプションを表示し、続けて `tabs `（末尾スペース付き）へ入力復元 |
| `tabs -list [-u]` | タブピッカーを開き、検索・複数選択 `#`・バルクモードに対応。 |
| `tabs -moveurl <url>` | 指定 URL タブがあれば前面化、なければ新規タブを開く（http/https）。 |
| `tabs -nowurl` | 現在タブの URL を表示。 |
| `dom` | 利用案内を表示し、続けて `dom `（末尾スペース付き）へ入力復元（`-list` など第二トークン入力用） |
| `dom -list [--html\|--react] [<pattern>]` | アクティブタブの DOM を読み取り専用ピッカーで閲覧（`grep -list` と同系 UI）。`--html`（既定）／`--react`。任意の大文字小文字を区別しない部分一致フィルタ（正規表現なし）。scriptable な http(s) のみ。実行時にオプションのサイト権限を求めることがある |
| `grep` | 利用案内を表示し、続けて `grep ` へ入力復元（`-list` または `--none` 等） |
| `grep -list [--none\|--history\|--bookmark\|--page] <pattern>` | 横断検索ピッカー。既定 `--none` は履歴・ブックマーク・http(s) タブ表示テキストをまとめて検索。フラグでスコープを1つに限定可。部分一致（v1 正規表現なし） |
| `grep --none <pattern>` | 3スコープをピッカーなしで一括実行（ログ出力。空パターンは件数上限付き一覧） |
| `grep --history <pattern>` | 閲覧履歴のタイトル／URL のみ |
| `grep --bookmark <pattern>` | ブックマークのタイトル／URL のみ |
| `grep --page <pattern>` | 非破棄 http(s) タブの表示テキストのみ（実行時にオプションのサイト権限を求めることがある） |
| `close` / `c <tabId>` | タブを閉じる |
| `group new <tabId> …` | グループ作成 |

**補足 — `clear` と `exit`:** `clear` は画面のセッションログだけを消し、BMXt ウィンドウは開いたままです。`exit` はそのログを消したうえで **BMXt ウィンドウを閉じます**（拡張が追跡しているウィンドウに対して `chrome.windows.remove`）。**どちらもコマンド履歴**（↑/↓ や Ctrl+R）**は消しません**。

**0.1.1 — split ペイン:** 複数ペインが開いているとき、**Ctrl+矢印**でキーボードフォーカスをペイン間で移動できます。

### `dom`

#### English

- Bare `dom` + **Enter** prints the usage block and restores the prompt to **`dom `** so you can type `-list` (same continuation pattern as other first commands with manifest `subcommands`).
- **`dom -list`** resolves the **active tab of the last-focused normal browser window**, injects a read-only helper via `chrome.scripting`, and streams a flattened DOM outline into the picker. **Scriptable http(s)** pages only (`chrome://`, the Chrome Web Store, `chrome-extension://`, etc. are rejected with an error line). **Optional host permission** may be requested before injection, like other page-reading commands.
- **`--html`** (default) vs **`--react`** only changes how nodes are labeled in the picker UI.
- Any tokens after the optional flavor flag are joined into a single **substring** filter on the printed lines (ASCII case fold); **not** a regular expression. ASCII `"…"` / `'…'` around the pattern are stripped once.

#### 日本語

- **`dom` 単体 + Enter** で利用案内を表示し、プロンプトを **`dom `** に戻して第二トークン入力を待つ（manifest の `subcommands` がある第一コマンドと同じ continuation）。
- **`dom -list`** は直前にフォーカスした通常ウィンドウの**アクティブタブ**を対象に、`chrome.scripting` で読み取り専用ヘルパーを注入し、DOM のフラットなアウトラインをピッカーに流し込む。**Chrome が拡張スクリプトを許可する通常の http(s) ページ**のみ（`chrome://`・ウェブストア・`chrome-extension://` 等はエラー）。注入前に**オプションのホスト権限**を確認し、必要なら実行時プロンプトが出る（`grep --page` 系と同じ系統）。
- **`--html`**（既定）と **`--react`** はピッカー上のノード表示ラベルの違いのみ。
- flavor の後ろのトークンはすべて連結され、出力行に対する**部分一致**フィルタになる（大文字小文字は ASCII 範囲で折りたたみ）。**正規表現ではない**。パターンを ASCII の `"` / `'` で1重に囲んだ場合は外側を1回だけ除去する。

### `grep`

#### English

- Bare `grep` + **Enter** prints the usage block and restores **`grep `**.
- **`grep -list …`** opens the same list picker chrome as `dom -list`, but rows are cross-search hits. **`--none`** (default when omitted) fans out to **history + bookmarks + visible page text** in one picker session; **`--history`**, **`--bookmark`**, or **`--page`** limits to that single source.
- One-shot forms **`grep --none`**, **`grep --history`**, **`grep --bookmark`**, and **`grep --page`** skip the picker and append results as log lines. An **empty** pattern with **`--none`** (including bare `grep -list`) still runs all three effects with empty filters, which the host implements as capped “show many rows” behavior.
- Patterns use the same **case-insensitive substring** rules as `dom` (no regex v1); optional ASCII quotes are stripped. **`--page`** / **`grep -list … --page`** walks non-discarded **http(s)** tabs and may trigger the extension’s **optional host permission** prompt the first time.

#### 日本語

- **`grep` 単体 + Enter** で利用案内を表示し、**`grep `** へ復帰する。
- **`grep -list …`** は `dom -list` と同系のリストピッカーでヒットを閲覧する。**`--none`**（省略時の既定）は履歴・ブックマーク・ページ表示テキストをまとめて対象にする。**`--history`** / **`--bookmark`** / **`--page`** でスコープを1つに絞れる。
- **`grep --none`** など直接形はピッカーを経由せずログ行として結果を出す。**`--none`** でパターン空（`grep -list` 単体を含む）は3系統すべて空パターンで走り、実装側で件数上限付きの一覧になる。
- パターンの扱いは `dom` と同様（大文字小文字を区別しない部分一致、v1 は正規表現なし、ASCII 引用符の除去）。**`--page`** 系は非破棄の **http(s)** タブを走査し、初回などに **オプションのホスト権限** を求めることがある。

<a id="tabs-man-tabs"></a>

### `tabs` (subcommands)

#### English
- `tabs` alone prints available options and restores the prompt to `tabs ` so users can continue with the next token.
- `tabs -list [-u]`: open tab picker (`-u` includes URL rows).
- `tabs -nowurl`: print current tab URL.
- `tabs -moveurl <url>`: activate matching http(s) tab and bring its window to front, or open a new tab if none matches.

#### 日本語
- **`tabs` 単体**は利用可能オプションを表示し、続けて **`tabs `**（末尾スペース付き）へ入力を復元します。
- **`tabs -list [-u]`**：タブピッカーを開きます（`-u` で URL 行付き）。
- **`tabs -nowurl`**：現在タブの URL を表示します。
- **`tabs -moveurl <url>`**：該当 http(s) タブをアクティブにしウィンドウを前面化。一致がなければ新規タブで開く。プロンプト上で `tabs -moveurl ` の直後に **Tab** を押すと、開いている http(s) タブの URL を補完候補として循環します。

<a id="tabs-tab-picker-en"></a>

#### English: Tab Picker (`tabs -list` / `tabs -list -u`)

- On launch, highlight starts at the active tab of the last focused normal browser window.
- Move with `j`/`k` (or `↑`/`↓`), toggle `#` on highlighted tab with `Tab` (multi-select supported). **Shift + `↑`/`↓`** extends a range selection anchored at the first mark.
- **Bulk operations** — press `:` to open the command line, type a command, and press `Enter` to confirm. `Tab` cycles through completions from the current prefix. If no tab is marked yet, the highlighted tab is auto-marked when the command is confirmed.
  - Tab rows: `move` (`m`), `close` (`c`), `group` (`g`), `newwindow` (`nw`)
  - Window rows: `close` (`c`), `newtab` (`nt`)
  - Group rows: `move` (`m`), `close` (`c`), `newwindow` (`nw`)
- In `:` command mode, pressing `Tab` or `Enter` with an empty command shows a dim placeholder of available commands for the current target (tab/window/group).
- **[MOVE]** — navigate to destination with `↑`/`↓`, then `Enter` to move. **[CLOSE]** — `Enter` to close. **[GROUP]** — select target group with `↑`/`↓`, then `Enter`. **[NEW WINDOW]** / **[NEW TAB]** — `Enter` to execute.
- Use `/` for incremental search (`@` prefix for URL match). `Enter` focuses the highlighted tab while keeping picker open; `Esc` order: clear `#` → cancel command mode → end search → exit bulk mode → close picker.

<a id="tabs-tab-picker-impl-en"></a>

#### English: Tab picker — implementation (keyboard & reducer)

- **Global capture**: `TabPickerOverlay` registers a **`window` `keydown` listener in the capture phase** so **↑/↓/j/k** are handled even when focus is not on the picker’s invisible filter `textarea` (e.g. after clicking the list). The same navigation logic also runs from the filter `textarea`’s `onKeyDown` when the event reaches it.
- **Reducer (TypeScript)**: Transitions go through **`runTabsPickerReduce`** in **`lib/features/bmxt-core/tabs-picker/reducer.ts`**. State and events use **camelCase** keys (e.g. `kind: "moveHi"`, `visibleLen`).
- **Shift + arrows**: **Range selection** applies **`moveHi` then `selectRange`** in one synchronous chain (**`applyReducedStateSequence`** in `picker-overlay.tsx`). Two separate React updates in the same handler would read a **stale `hi`** for the second call and could break range extension.
- **`:` command mode**: `:` opens a command-line footer (same layout as `/` search). `parsePickerCommand` in `use-tab-picker-keyboard.ts` maps short aliases (e.g. `m` → `move`) to `BulkSubMode`. `Tab` completion is handled by `commandCompletionRef` — a ref that stores the base string, candidate list, and current index, and resets on any non-`Tab` key or when command mode exits. `runPickerCommandEnter` fires in the window capture phase (before `runPickerEnterKey`) and auto-marks the highlighted tab if nothing is selected. The previous left/right arrow `cycleSubMode` path has been removed entirely.
- **Prompt coexisting with picker**: While the tab picker is open, **`lib/features/bmxt-window/bmxt-terminal.tsx`** suppresses **↑/↓/j/k** on the main prompt so they do **not** drive **command history**; navigation is handled only by the picker.

<a id="tabs-tab-picker-ja"></a>

#### 日本語: タブピッカー（`tabs -list` / `tabs -list -u`）

- 起動時は、直前にフォーカスしていた通常ブラウザウィンドウのアクティブタブ位置にハイライトを合わせます。
- `j`/`k`（または `↑`/`↓`）で移動、ピッカー内の `Tab` でハイライト中タブの `#` を付け外しします（複数選択可）。**Shift + `↑`/`↓`** で、ハイライトの移動に合わせて**連続したタブ行に `#` を一括付与**します（一覧上でアンカー行から現在行までの範囲）。**`#` が付いたタブは、同一ウィンドウ内では Chrome 本体のタブバー上でも複数選択（`chrome.tabs.highlight`）に合わせて表示**されます（BMXt を前面にしたまま操作できます）。
- **バルク操作の選択**: `:` を押してコマンドラインを開き、コマンドを入力して `Enter` で確定します。`Tab` でプレフィックスに一致する候補を循環補完できます。`#` が付いたタブがない場合、コマンド確定時にハイライト中のタブが自動的に `#` でマークされます。
  - タブ行: `move`（`m`）、`close`（`c`）、`group`（`g`）、`newwindow`（`nw`）
  - ウィンドウ行: `close`（`c`）、`newtab`（`nt`）
  - グループ行: `move`（`m`）、`close`（`c`）、`newwindow`（`nw`）
- `:` コマンドモードでは、コマンド未入力のまま `Tab` または `Enter` を押すと、現在の対象（タブ／ウィンドウ／グループ）に応じた利用可能コマンドを薄いプレースホルダーで表示します。
- **[MOVE]** は `↑`/`↓` で移動先タブを選び、`Enter` で `#` タブを一括移動します。
- **[CLOSE]** は `Enter` で `#` タブを一括で閉じます。**[GROUP]** は `↑`/`↓` でグループ選択後、`Enter` で `#` タブを追加します。**[NEW WINDOW]** は `Enter` で `#` タブを新規ウィンドウへ一括移動します。**[NEW TAB]** は `Enter` で URL 入力パネルへ進みます。
- `/` でインクリメンタル検索（`@` 接頭で URL 部分一致）。`Esc` の解除順は `#` 全解除 → コマンドモード終了 → 検索終了 → バルクモード終了 → ピッカー終了です。
- バルクモードでない `Enter` は、ハイライト中タブをアクティブ化して対象ウィンドウを前面化します（ピッカーは維持）。

<a id="tabs-tab-picker-impl-ja"></a>

#### 日本語: タブピッカー — 実装（キー配信とリデューサ）

- **ウィンドウキャプチャ**: `TabPickerOverlay` は **`window` に `keydown`（キャプチャ）**を登録し、フィルタ用の不可視 `textarea` 以外にフォーカスがあっても **↑/↓/j/k** を拾います。フォーカスが textarea にあるときは `onInputKeyDown` でも同じナビ処理をします。
- **リデューサ（TypeScript）**: 状態遷移は **`lib/features/bmxt-core/tabs-picker/reducer.ts`** の **`runTabsPickerReduce`**。イベント／状態は **`kind: "moveHi"`** や **`visibleLen`** など **camelCase** の JSON 形で渡します。
- **Shift + 矢印**: **`moveHi` の直後に `selectRange`** を **`applyReducedStateSequence`** で **1 チェーン**にまとめています。同一ハンドラ内で `setState` を二度叩くと、2 回目が **古い `hi`** を見て範囲が正しく伸びないことがありました。
- **`:` コマンドモード**: `:` で `/` 検索と同レイアウトのコマンドラインフッタを開きます。`use-tab-picker-keyboard.ts` の `parsePickerCommand` が短縮エイリアス（例: `m` → `move`）を `BulkSubMode` に変換します。`Tab` 補完は `commandCompletionRef`（起点文字列・候補リスト・現在インデックスを保持する ref）で管理し、非 `Tab` キー入力またはコマンドモード終了時にリセットされます。`runPickerCommandEnter` はウィンドウキャプチャフェーズで `runPickerEnterKey` より先に実行され、未マーク時はハイライト中タブを自動マークします。従来の左右矢印による `cycleSubMode` パスは完全に削除されています。
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

**Registry, help text, tokenization, URL-only lines, and built-in command `run` handlers** are implemented in **`lib/features/bmxt-core/`** (TypeScript). Authoritative lists live in **`manifest/bmxt-codegen.json`**; **`npm run codegen`** regenerates **`lib/features/bmxt-core/registry/table.gen.ts`**, **`effect-types.ts`**, **`apply-dispatch.gen.ts`**, **`completion-fallback.ts`**, and **`command-subcommands.gen.ts`** (completion + continuation helpers). Hand-written per-effect logic lives in **`lib/features/dispatch/handlers/effects/`**. At runtime, **`runDispatch`** / **`dispatchFull`** return terminal **`lines`** or JSON **`effects`**; **`apply-one`** dispatches to those handlers (`apply-effects.ts`). Tab completion names come from **`allCompletionTokens()`** in the registry (same manifest as **`completion-fallback.ts`**).

The tab picker’s **`runTabsPickerReduce`** lives in **`lib/features/bmxt-core/tabs-picker/reducer.ts`** (see **Tab picker — implementation** under **`tabs`**).

**Exception — UI-handled first:** some inputs are handled in the BMXt window UI (`lib/features/bmxt-window/bmxt-shell.tsx`) *before* `RUN_CMD` reaches the Service Worker—e.g. **`tabs -list` / `tabs -list -u`** (tab picker), **`dom -list`**, **`grep -list`**, and **interactive `group new`** (no tab ids). Other subcommands and the rest of the command set go through **`runDispatch`** in the background.

**`exit`:** returns an **`exit_bmxt`** effect; the Service Worker clears the session log and closes the BMXt window it tracks (`chrome.windows.remove`).

**Main directories:**

- **`manifest/bmxt-codegen.json`** — single source for command registry + **`commands[].subcommands`** (second/third fixed tokens, tail kinds) + Effect schema + TS handler wiring (see **`npm run codegen`**)
- **`lib/features/bmxt-core/`** — `dispatch.ts`, `registry/`, `cmd/*.ts` (one module per built-in command: **`export const CMD`** + **`run`**; **`registry/table.gen.ts`** is **generated**), `tabs-picker/` (reducer and picker domain logic)
- **`lib/features/bmxt-window/`** — main BMXt window UI (log, prompt, IME, picker launch)
- **`lib/features/extension-storage/`** — `chrome.storage.local` keys and log/history caps
- **`lib/features/page-dom/`** — injected DOM helpers and formatters (`dom -list`)
- **`lib/features/dispatch/`** — **`effect-types.ts`** / **`apply-dispatch.gen.ts`** (generated) + hand-written **`handlers/effects/*`**
- **`lib/features/builtin-commands/`** — generated **`completion-fallback.ts`**, **`command-subcommands.gen.ts`**
- **`background.ts`** — `runDispatch` → lines / `applyChromeEffects` (`exit` → `exit_bmxt` then closes the tracked window)

### 日本語

**一覧の真実**は **`manifest/bmxt-codegen.json`** です。**`npm run codegen`** で **`lib/features/bmxt-core/registry/table.gen.ts`**・**`effect-types.ts`**・**`apply-dispatch.gen.ts`**・**`completion-fallback.ts`**・**`command-subcommands.gen.ts`** を再生成します。組み込みコマンドの **`run`** は **`lib/features/bmxt-core/cmd/*.ts`**、Chrome 副作用は **`lib/features/dispatch/handlers/effects/`** に置きます。Service Worker では **`dispatchFull`** が **`lines` / `effects`** を返し、**`apply-one`** が効果をハンドラに振り分けます。Tab 補完はレジストリの **`allCompletionTokens()`**（manifest と同内容の **`completion-fallback.ts`** も生成）。

タブピッカーは **`lib/features/bmxt-core/tabs-picker/reducer.ts`** の **`runTabsPickerReduce`**（詳細は **`tabs`** の **タブピッカー — 実装**）。

**例外（先に UI 側）:** 一部の入力は Service Worker の `RUN_CMD` より前に BMXt ウィンドウ UI（**`lib/features/bmxt-window/bmxt-shell.tsx`**）で処理します。例: **`tabs -list` / `tabs -list -u`**（タブピッカー）、**`dom -list`**、**`grep -list`**、**対話的な `group new`**（タブ ID なし）。それ以外はバックグラウンドで **`runDispatch`** します。

- **`manifest/bmxt-codegen.json`** — コマンド一覧・**`commands[].subcommands`**・Effect スキーマ・TS ハンドラ配線の単一ソース（**`npm run codegen`**）
- **`lib/features/bmxt-core/`** — `dispatch.ts`、`registry/`、`cmd/*.ts`（**`CMD` + `run`**；**`table.gen.ts`** は生成）、`tabs-picker/`
- **`lib/features/bmxt-window/`** — BMXt ウィンドウのメイン UI
- **`lib/features/extension-storage/`** — ストレージキーと上限
- **`lib/features/page-dom/`** — DOM 注入ヘルパー（`dom -list`）
- **`lib/features/dispatch/`** — 生成ディスパッチ + **`handlers/effects/`**
- **`lib/features/builtin-commands/`** — 補完・continuation の生成物
- **`background.ts`** — `runDispatch` → lines / `applyChromeEffects`（`exit` → `exit_bmxt` でウィンドウを閉じる）

manifest やコマンド実装を変えたら **`npm run codegen`** のあと **`npm run verify:manifest`** / **`npm run check:generated`** を実行し、必要なら **`npm run build`** してください。

<a id="add-new-built-in-command"></a>

### Add a New Built-in Command

For a consolidated checklist (scaffold, manifest, new effects, verification), see **[Command add procedure / コマンド追加手順](#command-add-procedure)** below.

#### English

1. Edit **`manifest/bmxt-codegen.json`** (`commands` / `effects` as needed). Optionally run **`npm run new:command -- <module> <name> [aliases...]`** to scaffold **`lib/features/bmxt-core/cmd/<module>.ts`** and manifest rows.
2. Implement **`run`** in **`lib/features/bmxt-core/cmd/<module>.ts`**. Keep **`export const CMD`** in sync with the manifest (**`npm run verify:manifest`**).
3. For new Chrome effects, add a **`handlers/effects/<file>.ts`** implementation and **`npm run codegen`**, then fill the handler referenced in the manifest.
4. Run **`npm run codegen`** (if not already), then **`npm run verify:manifest`** and **`npm run check:generated`** (CI runs both).

#### 日本語

1. **`manifest/bmxt-codegen.json`** を編集する。必要なら **`npm run new:command -- <module> <name> [aliases...]`** で **`lib/features/bmxt-core/cmd/<module>.ts`** と manifest を追加。
2. **`cmd/<module>.ts`** の **`run`** を実装。**`export const CMD`** を manifest と一致させる（**`npm run verify:manifest`**）。
3. Chrome 用の新 Effect なら manifest の **`effects`** を足し **`npm run codegen`** のあと **`handlers/effects/`** に **`tsHandlerFile`** 相当の実装を置く。
4. **`npm run codegen`** のあと **`verify:manifest`** / **`check:generated`** で確認（CI でも実行）。

<a id="command-add-procedure"></a>

### Command add procedure / コマンド追加手順

#### English

- **Command-line token model:** When adding or changing commands, follow **[Command-line token model (first / second commands)](#command-line-token-model)** and **`.cursorrules`** (first → second ordering, **no** short aliases for first/second tokens, **Enter** → placeholder + prompt restore `first ` when a second command is required). Continuation and second-token Tab lists come from generated **`command-subcommands.gen.ts`** (from manifest **`subcommands`**).

- **Single source of truth:** **`manifest/bmxt-codegen.json`**. Do **not** edit generated files by hand: **`lib/features/bmxt-core/registry/table.gen.ts`**, **`lib/features/dispatch/effect-types.ts`**, **`lib/features/dispatch/handlers/apply-dispatch.gen.ts`**, **`lib/features/builtin-commands/completion-fallback.ts`**, **`lib/features/builtin-commands/command-subcommands.gen.ts`**. Regenerate them with **`npm run codegen`**.
- **Recommended:** `npm run new:command -- <module> <canonical_name> [aliases...]` — creates **`lib/features/bmxt-core/cmd/<module>.ts`**, updates **`commands[]`** in the manifest, then runs **codegen**. Replace the stub in **`run`** and align **`usagePrimary`** in manifest and **`CMD.usagePrimary`** if the usage line should differ from the canonical name.
- **Manual path:** Add a row under **`commands[]`** in the manifest, add **`lib/features/bmxt-core/cmd/<module>.ts`**, then **`npm run codegen`**.
- **Chrome / new `Effect`:** Add an entry under **`effects[]`** in the manifest → **`npm run codegen`** → implement **`lib/features/dispatch/handlers/effects/<tsHandlerFile>.ts`** using the **`tsHandlerExport`** name from the manifest → return effects from **`run`** via **`effectsDispatch([...])`** as needed.
- **Checks:** **`npm run verify:manifest`** (manifest vs every **`export const CMD`**) and **`npm run check:generated`** (no uncommitted drift in generated paths). CI runs both. Then **`npx tsc --noEmit`** and **`npm run build`** for a full extension build.

#### Manifest `commands[].subcommands` (second / third tokens) / `subcommands`（第二・第三トークン）

Every command row **must** include **`subcommands`**: use **`[]`** when the command has no fixed second-token family (e.g. `clear`). Non-empty arrays declare **canonical second tokens** (`head`, starting with `-`), optional **fixed third tokens** after that head (`trailingTokens`, e.g. `-u` after `tabs -list`), and an optional **`tail`** hint for tooling: **`none`** | **`rest_http_url`** | **`rest`** (dispatch semantics and argument parsing remain in **`lib/features/bmxt-core/cmd/<module>.ts`**; keep literals in sync—**`npm run verify:manifest`** checks each `head` appears in the TypeScript file).

**`npm run codegen`** emits **`lib/features/builtin-commands/command-subcommands.gen.ts`** (Tab completion + lone-first-token continuation; includes **`isSecondToken`**). Copy from **`manifest/templates/command-with-subcommands.example.json`** when adding a new first+second family.

##### How to add second/third tokens (checklist) / 第二・第三トークンを足す手順

1. Edit **`manifest/bmxt-codegen.json`**: set **`subcommands`** to **`[]`** or a list of **`{ head, trailingTokens?, tail? }`** (see **`manifest/templates/command-with-subcommands.example.json`**).
2. Run **`npm run codegen`** (regenerates **`command-subcommands.gen.ts`** and **`table.gen.ts`**).
3. In **`lib/features/bmxt-core/cmd/<module>.ts`**, implement **`run`** and reference **each `head` as the same string literal** as in the manifest (required for **`npm run verify:manifest`**).
4. If the prompt should Tab-complete **third** fixed tokens after a head, use generated **`listThirdTokenCandidates`** (and add a completion zone in the shell if needed).
5. Run **`npm run verify:manifest`**, **`npm run check:generated`**, **`npx tsc --noEmit`**, then **`npm run build`** as needed.

**Hand-written browser logic (`handlers/effects/*.ts`) vs codegen:** Those files are **not** regenerated. After you change **`effects[]`** in the manifest and run codegen, **keep the corresponding handler** (`tsHandlerFile` / `tsHandlerExport`) aligned with the generated **`ChromeEffect`** types and **`apply-dispatch.gen.ts`** imports.

#### 日本語

- **コマンドラインのトークン仕様:** 追加・変更時は **[コマンドラインのトークン仕様（第一・第二コマンド）](#command-line-token-model)** と **`.cursorrules`** に従う。continuation と第二トークン Tab 候補は **`command-subcommands.gen.ts`**（manifest の **`subcommands`** から生成）。
- **真実のデータは 1 箇所:** **`manifest/bmxt-codegen.json`**。次は手編集しない: **`table.gen.ts`**、**`effect-types.ts`**、**`apply-dispatch.gen.ts`**、**`completion-fallback.ts`**、**`command-subcommands.gen.ts`**（いずれも **`npm run codegen`** で再生成）。
- **手順（推奨）:** **`npm run new:command -- <module> <canonical_name> [aliases...]`** — **`lib/features/bmxt-core/cmd/<module>.ts`** と manifest を更新し **codegen** まで実行。
- **手動で足す場合:** manifest の **`commands[]`** に追記 → **`lib/features/bmxt-core/cmd/<module>.ts`** → **`npm run codegen`**。
- **ブラウザ連携（新しい `Effect`）:** manifest の **`effects[]`** → **codegen** → **`handlers/effects/<tsHandlerFile>.ts`** → **`run`** から **`effectsDispatch`**。
- **検証:** **`verify:manifest`** / **`check:generated`** → **`npx tsc --noEmit`** → **`npm run build`**。

各 **`commands[]`** 行に **`subcommands`** を必ず含める。dispatch は **`lib/features/bmxt-core/cmd/<module>.ts`** に書き、各 **`head`** を manifest と**同一の文字列リテラル**で参照する（**`npm run verify:manifest`** が検査）。

**手書きの `handlers/effects/*.ts`:** codegen の対象外。manifest の **`effects[]`** 変更後は生成型・**`apply-dispatch.gen.ts`** に**揃える**。

**リファクタ前（Rust/WASM）との比較:** コマンド登録・補完・Effect・ディスパッチを **manifest + codegen** で揃え、**`bmxt-core/cmd/*.ts`** と **`handlers/effects/`** に実装を分ける。ビルドは **Node/TypeScript のみ**（Rust ツールチェーン不要）。

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

### English

After installing dependencies, start the development build (see **Development startup** below for the full flow).

```bash
npm install   # or pnpm install / yarn
npm run dev   # or pnpm dev
```

`npm run dev` runs **`plasmo dev`**: a watch build that updates **`build/chrome-mv3-dev`**. Keep the terminal process running while you work.

If you change **`manifest/bmxt-codegen.json`**, run **`npm run codegen`** before reloading the extension so generated TypeScript stays in sync.

### 日本語

依存関係のインストール後、開発ビルドを起動します（手順の全体像は **Development startup** / **開発時の起動** を参照）。

```bash
npm install   # または pnpm install / yarn
npm run dev   # または pnpm dev
```

`npm run dev` は **`plasmo dev`**（ウォッチ付き開発ビルド）で、**`build/chrome-mv3-dev`** を更新します。作業中はターミナル上のプロセスを止めずに置いておきます。

**`manifest/bmxt-codegen.json`** を編集したときは、拡張を再読み込みする前に **`npm run codegen`** を実行し、生成 TypeScript を揃えてください。

<a id="development-startup"></a>

### Development startup (step-by-step)

#### English

1. **Install JS dependencies:** `npm install` (or `pnpm install` / `yarn`).
2. **Codegen (when needed):** After editing **`manifest/bmxt-codegen.json`**, run **`npm run codegen`** once so generated files under **`lib/features/bmxt-core/registry/`**, **`lib/features/dispatch/`**, and **`lib/features/builtin-commands/`** match the manifest.
3. **Start dev:** From the repo root, run **`npm run dev`**. Leave this process running; it rebuilds the extension on file changes.
4. **Load in Chrome:** Open `chrome://extensions`, enable **Developer mode**, **Load unpacked**, and select **`build/chrome-mv3-dev`** (created by Plasmo dev).
5. **Open BMXt:** Click the extension toolbar icon to open the BMXt window.
6. **After edits:** When Plasmo finishes rebuilding, use **Reload** on the extension card (or reload the BMXt tab) so the Service Worker and UI pick up changes.

<a id="development-startup-ja"></a>

#### 日本語（開発時の起動）

1. **依存関係:** リポジトリ直下で `npm install`（または `pnpm` / `yarn`）。
2. **Codegen:** **`manifest/bmxt-codegen.json`** を編集したときは、**`npm run codegen`** で **`lib/features/bmxt-core/registry/`**・**`lib/features/dispatch/`**・**`lib/features/builtin-commands/`** の生成物を揃える。
3. **開発サーバ:** リポジトリ直下で **`npm run dev`** を実行する。これは **`plasmo dev`** で、`build/chrome-mv3-dev` をウォッチビルドする。**プロセスは終了させず**ターミナルに置いておく。
4. **Chrome に読み込み:** `chrome://extensions` を開き、**デベロッパーモード**をオンにして「パッケージ化されていない拡張機能を読み込む」から **`build/chrome-mv3-dev`** を指定する（Plasmo dev が出力するディレクトリ）。
5. **BMXt を開く:** ツールバーの拡張機能アイコンから BMXt ウィンドウを開く。
6. **変更の反映:** 保存後、Plasmo の再ビルドが終わったら、拡張機能カードの **「再読み込み」**、または BMXt のタブ／ウィンドウの再読み込みで Service Worker・UI の変更を取り込む。

<a id="main-sources"></a>

### Main Sources / 主なソース

- `tabs/bmxt.tsx` — 拡張ページのエントリ（`BmxtTerminal` を描画するだけの薄いラッパ）
- `bmxt-ui.css` — リポジトリ直下。ウィンドウ用スタイル（`tabs/bmxt.tsx` から import）
- `lib/features/bmxt-window/` — BMXt ウィンドウのメイン UI（`bmxt-terminal.tsx`、セッションログ／履歴フックなど）
- `lib/features/release-notes/release-notes.json` — アプリ内バージョンアップ通知・**`notes`** ターミナルコマンドの変更内容（キーは `package.json` の `version` と一致させてメンテ）
- `lib/features/extension-storage/` — ストレージキーと上限（Service Worker と UI の両方から参照）
- `lib/features/tabs/` — タブピッカー・tabs 入力パース・ピッカー行生成など（`index.ts` から主要シンボルを再エクスポート。実装は `picker-overlay.tsx`、`picker-rows.ts`、`input.ts`、各種 hooks）
- `background.ts` — Service Worker（ウィンドウ起動・`runDispatch`・Effect 実行）
- `lib/features/bmxt-core/` — コマンドレジストリ・ディスパッチ・`cmd/*.ts`・タブピッカーリデューサ（**`registry/table.gen.ts`** は codegen）
- `lib/features/dispatch/` — **`effect-types.ts`** / 生成ディスパッチ・**`handlers/effects/`** で Chrome 実行
- `lib/features/builtin-commands/` — **`completion-fallback.ts`**・**`command-subcommands.gen.ts`**（manifest から codegen）
- `lib/features/page-dom/` — DOM 注入ヘルパー（`dom -list`）

### English

In development mode, edits trigger rebuilds. Reload the extension to verify updates.

### 日本語

コードを編集すると、開発モードではビルドが更新されるので、拡張の「再読み込み」で反映を確認できます。

<a id="version-upgrade-banner"></a>

### Version upgrade banner & release notes

#### English

When the extension **`version`** in **`package.json`** (and the built manifest) **does not match** the value stored in **`chrome.storage.local`** under **`bmxt_last_seen_extension_version`** (**`LAST_SEEN_EXTENSION_VERSION_KEY`** in `lib/features/extension-storage/keys.ts`), the BMXt window shows **once**, on the **first open after that upgrade**:

1. The usual **welcome** copy (unchanged).
2. A **version upgrade** block with the version number and bilingual release notes.

Existing **session log** lines are still rendered **below** that block.

**Maintainer workflow**

1. Bump **`package.json`** → **`version`**.
2. Add a matching entry to **`lib/features/release-notes/release-notes.json`**. Keys must equal the version string exactly. Each entry has **`ja`** and **`en`** strings (multi-line text is fine; use `\n` in JSON or rely on `white-space: pre-wrap` in CSS). Users can also print notes in the BMXt shell with **`notes`**, **`notes <version>`**, or **`notes --list`**.
3. Build and ship.

If no entry exists for the current version, placeholder copy is shown that points maintainers at **`release-notes.json`**.

**Implementation:** `lib/features/bmxt-window/use-version-upgrade-banner.ts` compares versions and updates storage; `bmxt-terminal.tsx` waits until the check finishes before rendering the shell (avoids a flash of log-only UI); `bmxt-shell.tsx` renders the blocks; styles live in **`bmxt-ui.css`** (`.bmxt-version-upgrade*`).

#### 日本語

拡張機能の **`version`**（**`package.json`**／ビルド後の manifest）が、**`chrome.storage.local`** の **`bmxt_last_seen_extension_version`**（定数 **`LAST_SEEN_EXTENSION_VERSION_KEY`**、`lib/features/extension-storage/keys.ts`）に保存されている「前回リリースノートを見た版」と **一致しない** とき、BMXt を開いた **そのバージョンへアップデートしたあとの初回だけ**、次を表示します。

1. 既存どおりの **ウェルカム** 文言（内容は変更しない運用）。
2. **バージョンアップ** 見出しと、**日英の変更説明**。

既存の **セッションログ** は、その **下** に続きます。

**リリース時の作業**

1. **`package.json`** の **`version`** を上げる。
2. **`lib/features/release-notes/release-notes.json`** に、**同じバージョン文字列** をキーとするオブジェクトを追加する（**`ja`** と **`en`**）。本文は複数行にしてよい（JSON 内の `\n` または CSS の `white-space: pre-wrap` で折り返し表示）。BMXt シェルでは **`notes`** / **`notes <version>`** / **`notes --list`** でも参照できる。
3. ビルドして配布する。

該当キーが無い場合は、**`release-notes.json`** を更新するよう促すプレースホルダが表示されます。

**実装:** バージョン比較とストレージ更新は **`use-version-upgrade-banner.ts`**、ちらつき防止の描画待ちは **`bmxt-terminal.tsx`**、UI は **`bmxt-shell.tsx`**、スタイルは **`bmxt-ui.css`**（`.bmxt-version-upgrade*`）。

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
1. UI and behavior: design, implementation, and testing
2. Refine key operations in the core tabs mode
3. Add history and bookmark operations
4. Improve multi-terminal behavior
5. Support pure command-line operation and additional automation flows

### 日本語
1. UI および動作の設計／実装／テスト
2. 基本となる tabs モードでのキー操作見直し
3. 履歴、ブックマーク操作
4. 複数ターミナルでの動作
5. 純粋なコマンドラインでの動作や各種自動処理系への対応など

---

☕️ **Support** — *This is still an early-stage dev demo,* but if you’re curious about **BMXt** and the future it’s aiming for, you can back the journey on [**Buy Me a Coffee**](https://buymeacoffee.com/unrsports) (one-time or monthly). ✨ GitHub Sponsors is also pending—the official link will land here once it’s ready.

☕️ **支援** — *いまはまだ開発段階のデモです。* **BMXt** とそれがもたらす未来にご興味があれば、[**Buy Me a Coffee**](https://buymeacoffee.com/unrsports) からワンタイム／月額で開発を支援いただけます。
