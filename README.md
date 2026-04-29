# BMXt

> Language guide: This README starts with **English**, followed by **Japanese**.  
> 言語案内: この README は **英語**を先に、その後に**日本語**を掲載しています。

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

## 🛠 Seed Project

### English

This repository is a dedicated shell built with **Chrome Extension (Manifest V3) + [Plasmo](https://docs.plasmo.com/)**. It runs in its own normal browser window (not a popup) to support tab-group operations. The author handles technical decision-making and verification/design/testing, while implementation is done 100% with an AI assistant (Cursor). At this stage, the project is positioned as a validation and seeding phase focused on eliminating behavioral breakage and polishing UX.

### 日本語

このリポジトリは **Chrome 拡張（Manifest V3）＋ [Plasmo](https://docs.plasmo.com/)** で動く専用シェルです。タブグループ操作に対応するため、BMXt は popup ではなく **独立した通常ブラウザウィンドウ**で動作します。AI（Gemini / Cursor）による技術選定の判断と確認／設計／テストは作者自身が、実装には AI アシスタント（Cursor）を100%使用して進めており、現段階では「動作の破綻をなくし、手触りを磨く」ための検証・種まきのフェーズと位置づけています。

## 📺 Demo Video

Note: The demo video currently covers the group creation part of the available features.

※デモムービーには全機能のうち、グループ作成に関する部分を収録しています。


https://github.com/user-attachments/assets/4664a1bb-71f2-4265-a4d9-18c7eece216e





## ♿️ Universal Design Intent

### English

BMXt is not only an efficiency tool for engineers; it also aims to build reliable, low-effort interaction paths by reducing mouse dependency, keeping key operations consistent, and coexisting well with IME input.

### 日本語

BMXt は、エンジニア向けの効率ツールであるとともに、**できるだけ軽い操作負担で確実に操作できる導線**（マウス指向 UI への依存を減らす、キー操作の一貫性、IME との両立など）を重ねていくことを目指しています。

## ☕️ Support this Journey

### English

I have currently applied for GitHub Sponsors. Once there is progress and the support page is ready, I will add the official link here.

### 日本語

現在 GitHub Sponsors に申請中です。進展があり、支援ページの準備が整い次第、正式なリンクをここに掲載します。

---

## Technical Overview

### English

The following is a technical overview. From the toolbar icon, you can open/focus the BMXt window and run tab/window/group operations plus one-line URL navigation from the command line. Built with [Plasmo](https://docs.plasmo.com/) (Manifest V3).

### 日本語

以下は技術仕様の概要です。ツールバーの拡張アイコンから BMXt ウィンドウを開き（既に開いていれば前面へ）、タブ・ウィンドウ・タブグループの操作や URL 一行ナビゲーションをコマンドラインから行えます。[Plasmo](https://docs.plasmo.com/)（Manifest V3）でビルドしています。

## Key Specs

### English
- **UI**: Extension page opened in a dedicated normal browser window (`tabs/bmxt`), not a popup window.
- **Input**: Prompt line is rendered with a transparent `textarea` + mirror layer. Supports Japanese IME composition/commit while keeping logs selectable/copyable with normal text nodes.
- **State**: Command output logs and command history are stored in `chrome.storage.local` (e.g. max 500 log lines, implementation-dependent).
- **Background**: Service Worker (`background.ts`) opens the window on icon click and handles command execution and tab operations.

### 日本語
- **UI**: 独立した通常ブラウザウィンドウで開いて動作する拡張ページ（`tabs/bmxt`、popup ではない）。
- **入力**: プロンプト行は **透明な `textarea` + 下層ミラー** で描画。日本語 IME（変換・確定）に対応しつつ、**ログ領域は通常のテキストノード**のため、マウスでの**範囲選択・コピー**を妨げない構成にしています。
- **状態**: コマンド出力ログとコマンド履歴は `chrome.storage.local` に保持（ログは最大 500 行など、実装に依存）。
- **バックグラウンド**: Service Worker（`background.ts`）がアイコンクリックでウィンドウを開き、コマンド実行・タブ操作を処理します。

### Permissions (`manifest` in `package.json`)

### English

`tabs`, `tabGroups`, `storage`, `windows`

### 日本語

`tabs`, `tabGroups`, `storage`, `windows`
## Command List

### English

`help` or `?` shows the same command overview as in-app help.

| Command | Description |
|----------|------|
| `help` / `?` | Show help |
| `man <topic>` | Command manual |
| `echo <text>` | Print text |
| `clear` | Clear logs |
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

### 日本語

`help` または `?` で拡張内ヘルプと同内容が表示されます。概要だけ以下にまとめます。

| コマンド | 説明 |
|----------|------|
| `help` / `?` | ヘルプ |
| `man <topic>` | 各コマンドの簡易マニュアル |
| `echo <text>` | そのまま出力 |
| `clear` | ログをクリア |
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

### `tabs` (`man tabs`)

#### English
- `tabs` alone returns an error (subcommand required). Use `tabs -l` (`tabs -list`) for tab picker. Add `-u` to include URL rows.
- `tabs -nu` (`-nowurl`): print current tab URL.
- `tabs -mu <url>` (`-moveurl`): activate matching http(s) tab and bring its window to front, or open a new tab if none matches.

#### 日本語
- **`tabs` 単体**はエラー（サブコマンド必須）。**`tabs -l`**（または **`tabs -list`**）でタブピッカー。URL 行付きは **`tabs -l -u`**。
- **`tabs -nu`**（**`-nowurl`**）：現在タブの URL を表示。
- **`tabs -mu <url>`**（**`-moveurl`**）：該当 http(s) タブをアクティブにしウィンドウを前面化。一致がなければ新規タブで開く。プロンプト上で `tabs -mu ` の直後に **Tab** を押すと、開いている http(s) タブの URL を補完候補として循環します。

#### English: Tab Picker (`tabs -l` / `tabs -l -u`)

- On launch, highlight starts at the active tab of the last focused normal browser window.
- Move with `j`/`k` (or `↑`/`↓`), toggle `#` on highlighted tab with `Tab` (multi-select supported).
- When one or more tabs have `#`, press `Space` to cycle **[MOVE]** → **[CLOSE]** → **[GROUP]** → **[NEW WINDOW]**.
- Use `/` for incremental search (`@` prefix for URL match). `Enter` focuses the highlighted tab while keeping picker open; `Esc` exits according to picker state.

#### 日本語: タブピッカー（`tabs -l` / `tabs -l -u`）

- 起動時は、直前にフォーカスしていた通常ブラウザウィンドウのアクティブタブ位置にハイライトを合わせます。
- `j`/`k`（または `↑`/`↓`）で移動、ピッカー内の `Tab` でハイライト中タブの `#` を付け外しします（複数選択可）。**Shift + `↑`/`↓`** で、ハイライトの移動に合わせて**連続したタブ行に `#` を一括付与**します（一覧上でアンカー行から現在行までの範囲）。**`#` が付いたタブは、同一ウィンドウ内では Chrome 本体のタブバー上でも複数選択（`chrome.tabs.highlight`）に合わせて表示**されます（BMXt を前面にしたまま操作できます）。
- `#` が1つ以上あるとき、`Space` で **[MOVE]** → **[CLOSE]** → **[GROUP]** → **[NEW WINDOW]** を循環します。
- **[MOVE]** は `↑`/`↓` で移動先タブを選び、`Enter` で `#` タブを一括移動します。
- **[CLOSE]** は `Enter` で `#` タブを一括で閉じます。**[GROUP]** は `↑`/`↓` でグループ選択後、`Enter` で `#` タブを追加します。**[NEW WINDOW]** は `Enter` で `#` タブを新規ウィンドウへ一括移動します。
- `/` でインクリメンタル検索（`@` 接頭で URL 部分一致）。検索中でも `Tab` の `#` 切替と `Space` のモード切替は有効です。`Esc` は、**いずれかに `#` が付いていればまずすべて解除**（ピッカーは維持）。続いて「検索終了 → バルクサブモード終了 → ピッカー終了」の順です。
- バルクモードでない `Enter` は、ハイライト中タブをアクティブ化して対象ウィンドウを前面化します（ピッカーは維持）。

#### English: URL Lines (`http` / `https`)

- `https://example.com` — Open in a new tab
- `https://example.com .` — Open in current tab (active tab in front window)
- `https://example.com -nw` — Open in a new window

#### 日本語: URL（行全体が `http` / `https` で始まる場合）

- `https://example.com` — 新規タブで開く  
- `https://example.com .` — 現在のタブ（前面ウィンドウのアクティブタブ）で開く  
- `https://example.com -nw` — 新しいウィンドウで開く  

## Command Execution Architecture (Current)

### English

Commands are defined as **one command per file**. The Service Worker resolves and executes commands via a registry.

### 日本語

コマンドは **1 コマンド 1 ファイル**で定義し、Service Worker 側はレジストリ経由で解決・実行します。

- `lib/commands/types.ts`  
  - `CommandSpec`（`name` / `aliases` / `summary` / `usage` / `man` / `execute`）  
  - `CommandContext`（ログクリア、タブ解決、help/man 参照などのコア機能）
- `lib/commands/builtin/`  
  - 組み込みコマンド本体（`<command>.ts` または `<command>/index.ts`。例: `tabs/`）
- `lib/commands/builtin/index.ts`  
  - 組み込みコマンドの収集ポイント
- `lib/commands-meta.ts`  
  - レジストリから `COMPLETION_CANDIDATES` を生成  
  - `resolveCommand()`、`listManTopics()`、`getManLines()` を提供
- `background.ts`  
  - URL 行（`http(s)`）を先に処理  
  - それ以外は `resolveCommand()` でコマンド解決し `execute()` を呼び出す

### Add a New Built-in Command

#### English
1. Add `lib/commands/builtin/<command>.ts` or `lib/commands/builtin/<command>/index.ts` and export `CommandSpec`.
2. Register it in `BUILTIN_COMMANDS` inside `lib/commands/builtin/index.ts`.
3. Add `usage` / `aliases` / `man` as needed for completion, `man`, and `help`.

#### 日本語
1. `lib/commands/builtin/<command>.ts` または `lib/commands/builtin/<command>/index.ts` を追加し、`CommandSpec` を export
2. `lib/commands/builtin/index.ts` の `BUILTIN_COMMANDS` に登録
3. 必要に応じて `usage` / `aliases` / `man` を記述（補完・`man`・`help` に反映）

`help` / `Tab 補完` / `man` はコマンド定義由来で生成されるため、重複メンテナンスを減らせます。

#### Command Definition Format (`CommandSpec`)

##### English
- `name`: canonical command name (lowercase recommended)
- `aliases?`: alias array (example: `["fwd"]`)
- `summary`: short text used by `help`
- `usage`: usage lines (first item is primary)
- `man?`: line array for `man <topic>`
- `execute(ctx, args, raw)`: command body (`string[]` return; `raw` is full input line)

##### 日本語
- `name`: コマンド本名（小文字推奨）
- `aliases?`: 別名配列（例: `["fwd"]`）
- `summary`: `help` などで使う短い説明
- `usage`: 使い方の配列（先頭要素が代表表示）
- `man?`: `man <topic>` 用の行配列
- `execute(ctx, args, raw)`: 実行本体（`string[]` を返す。`raw` は入力行全体）

最小テンプレート:

```ts
import type { CommandSpec } from "../types" // <command>/index.ts の場合は ../../types

export const sampleCommand: CommandSpec = {
  name: "sample",
  aliases: ["smp"],
  summary: "describe what this command does",
  usage: ["sample <arg>", "smp <arg>"],
  man: [
    "NAME",
    "  sample, smp - describe what this command does",
    "",
    "SYNOPSIS",
    "  sample <arg>"
  ],
  async execute(_ctx, args, _raw) {
    if (!args[1]) {
      return ["usage: sample <arg>"]
    }
    return [`ok: ${args[1]}`]
  }
}
```

#### Recommended Addition Workflow

##### English
1. Confirm `name` and `aliases` do not conflict with existing commands.
2. Decide `usage` and `man` first; return `usage: ...` on invalid input.
3. Prefer `CommandContext` helpers in `execute`.
4. Verify `help` / `man` / Tab completion after registration.
5. Update the README command table when needed.

##### 日本語
1. `name` と `aliases` が既存コマンドと衝突しないか確認
2. `usage` と `man` を先に決め、入力エラー時は `usage: ...` を返す
3. `execute` では `CommandContext`（`resolveTabArg`, `clearLog`, `getHelpLines` など）を優先利用
4. `lib/commands/builtin/index.ts` へ登録後、`help` / `man` / Tab 補完で反映確認
5. 必要なら README のコマンド表にも追記

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

## Development

### English

After installing dependencies, start development build.

### 日本語

依存関係のインストール後、開発ビルドを起動します。

```bash
npm install   # または pnpm install / yarn
npm run dev   # または pnpm dev
```

### English

Open `chrome://extensions`, enable **Developer mode**, load unpacked extension from `build/chrome-mv3-dev`, then open BMXt from toolbar icon.

### 日本語

Chrome で `chrome://extensions` を開き、**デベロッパーモード**で「パッケージ化されていない拡張機能を読み込む」から、生成された **`build/chrome-mv3-dev`** ディレクトリを指定します。ツールバーのアイコンから BMXt ウィンドウを開いて動作を確認します。

### Main Sources / 主なソース

- `tabs/bmxt.tsx` — BMXt ウィンドウ UI（ログ・プロンプト・IME・タブピッカー起動）
- `bmxt-ui.css` — ウィンドウ用スタイル
- `lib/features/tabs/` — tabs 機能の集約（`picker-overlay.tsx` / `picker-rows.ts` / `input.ts`）
- `background.ts` — Service Worker（ウィンドウ起動・コマンド解決/実行）
- `lib/commands/types.ts` — コマンド共通型（`CommandSpec` / `CommandContext`）
- `lib/commands/builtin/` — 組み込みコマンド実装（単一ファイル or コマンド別ディレクトリ）
- `lib/commands/builtin/index.ts` — 組み込みコマンドレジストリ
- `lib/commands-meta.ts` — 補完候補・`man`・コマンド解決ヘルパー
- `lib/tab-picker.ts` — 互換レイヤ（`lib/features/tabs/picker-rows.ts` を再エクスポート）
- `lib/bmxt-tabs-input.ts` — 互換レイヤ（`lib/features/tabs/input.ts` を再エクスポート）

### English

In development mode, edits trigger rebuilds. Reload the extension to verify updates.

### 日本語

コードを編集すると、開発モードではビルドが更新されるので、拡張の「再読み込み」で反映を確認できます。

## Production Build

```bash
npm run build
```

### English

Artifacts are output under `build/chrome-mv3-prod`. For store submission zip, you can also run `npm run package`.

### 日本語

成果物は `build/chrome-mv3-prod` 配下に出力されます。ストア提出用に zip する場合は `npm run package`（Plasmo のパッケージコマンド）も利用できます。

## Store Submission (Reference)

### English

You can automate submission with the [Plasmo workflow](https://docs.plasmo.com/framework/workflows/submit) or [bpp](https://bpp.browser.market). Typical flow: register extension in store, prepare credentials, then connect CI.

### 日本語

[Plasmo の提出ワークフロー](https://docs.plasmo.com/framework/workflows/submit)や [bpp](https://bpp.browser.market) などの自動化を利用できます。初回はストア側で拡張を登録し、資格情報を整えてから CI 連携するのが一般的です。

## License

### English

This project is licensed under [Apache License 2.0](./LICENSE).

### 日本語

このプロジェクトは [Apache License 2.0](./LICENSE) の下で公開しています。

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
