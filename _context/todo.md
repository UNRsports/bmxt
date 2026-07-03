# ピッカー（サイド列）リファクタ — 仕様・工程

BMXt のリストピッカー（`tabs` / `find` / `dom` ほか将来拡張）を共通化・スケール可能にするための設計メモと実装チェックリスト。

---

## 1. 目的・前提

### 1.1 プロダクト方針

- ピッカー UI の**操作仕様は `tabs -list` 由来を正**とする（`/`, `:`, Esc スタック、`n`/`N` 等）。
- **最終的には tabs も find も「URL を開く」**のが primary アクション。違いは**データソース**（タブ / 履歴 / ブックマーク / ページ本文 等）のみ。
- **`dom -list` はロジックが特殊**（権限プロンプト、DOM 行、URL 一行 ≠ 一行）だが、**表示は同じサイド列パネル形式**を踏襲する。

### 1.2 リポジトリ規約（触らない／別レイヤ）

- コマンド dispatch・registry: `lib/features/bmxt-core/cmd/*`, `manifest/bmxt-codegen.json`
- tabs の実行計画・reducer: `lib/features/bmxt-core/tabs-picker/*`（UI とは分離）
- プロンプト付近の**第二コマンドピッカー**（`TokenPickerPanel` 等）: サイド列ピッカーと**別系統**（混ぜない）

### 1.3 現状の整理（リファク後）

| 層 | 現状 |
|----|------|
| シェル | `bmxt-shell.tsx` + `SessionPickerColumns` — `sessionPickers` / `openPickerSlots` |
| ②③ 共有 | `lib/features/side-picker/` — `PickerPanelHost`, `pane-focus-nav`, `picker-slot-registry`, interaction kernel, `usePlainPickerKeyboard` |
| リスト chrome | **`PickerListShell`**（headline / IME / list スロット / footers）— tabs はここ経由。find / dom 行一覧は **`PlainTextPickerBody`**（自前 chrome・仮想スクロールあり） |
| find | `PickerEntry[]` → **`UrlListPickerWrapper`** → `PlainTextPickerBody` |
| dom | **`DomPickerWrapper`** — `lines` \| `prompt`（`dom-prompt-render.tsx`）— **Enter 仕様は未決** |
| tabs | **`TabsPickerWrapper`** → `useTabPickerController` → **`TabsUrlListPicker`**（`PickerListShell` + 階層 `TabPickerRowList` + bulk/edit パネル） |
| キーボード | **`usePlainPickerKeyboard`**（`/`, `:`, Esc→prompt, `n`/`N`, Enter, 縦移動, pane strip）+ tabs だけ **`useTabPickerPlainExtensions`**（`#`/Shift 範囲, bulk/edit, 段階 Esc, `:` バルクコマンド） |
| 逆依存 | 解消（`side-picker` は tabs の row 型・ラッパーからのみ参照） |
| 列フォーカス | `PaneFocusTarget` = `terminal` \| `PickerSlotId`；`focusPicker(slot)` |
| キー表・headline | `picker-headlines.ts` + README キー表 + 列追加手順 |

**後方互換:** `TabPickerOverlay` は `TabsUrlListPicker` への薄い re-export（`@deprecated`）。新規コードは `TabsPickerWrapper` を使う。

---

## 2. 目標アーキテクチャ

（§2.1–2.5 は設計メモとして維持。）

**キーボード（実装済み）**

```
window capture + IME textarea
  └ usePlainPickerKeyboard  ← interaction/picker-*.ts kernel
       ├ find / dom lines（extensions なし）
       └ tabs: PlainPickerKeyboardExtensions ← useTabPickerPlainExtensions
            （bulk/edit / # / Shift 範囲は tabs モジュールに残存）
```

**リスト UI（実装済み）**

- find: フラット行 → `PlainTextPickerBody`
- tabs: 階層行 + サブパネル → `TabsUrlListPicker` + `PickerListShell`
- 将来: find / dom を `PickerListShell` に寄せると DOM がさらに揃う（任意）

### 2.6 スケール（列が増えるとき）

- **② + レジストリ**: `picker-slot-registry.tsx` + `PICKER_SLOT_ORDER` — **実装済み**
- セッション状態: `sessionPickers` 一本化 — **実装済み**

---

## 3. 実装工程（チェックリスト）

### フェーズ 0 — 境界固定

- [x] 依存グラフ・分類
- [x] 共通キー表（README + `picker-headlines.ts`）
- [x] find `:nohlsearch`

### フェーズ 1 — interaction kernel

- [x] `side-picker/` 新設・共有モジュール移設
- [x] `use-tab-picker-keyboard` → kernel 経由（search/command/pane strip/capture chain）
- [x] tabs → UrlList 系シェル統合（`TabsUrlListPicker` + `useTabPickerPlainExtensions`）
- [x] `usePlainPickerKeyboard`（find / dom プレーンリスト）
- [x] `pnpm exec tsc --noEmit` / `pnpm test`（kernel 単体）

### フェーズ 2 — ② ピッカーパネル + ③B dom

- [x] `PickerPanelHost` / `DomPickerWrapper` / `dom-prompt-render`
- [ ] 検証: 手動 `dom -list`（dom 除外タスク）

### フェーズ 3 — ③A 検索リスト系

- [x] `PickerEntry` / find 変換（`[none]` 対応含む）
- [x] `UrlListPickerWrapper` / kernel 接続
- [ ] 検証: 手動 `find -list`（手動点検除外）

### フェーズ 4 — tabs URL 主線

- [x] `PickerEntry` マッピング / `executePickerFocusPlan`
- [x] window 行 Enter → `focusWindow`、group 行 → `activateFromGroup`（`bmxt-core/tabs-picker/execute-plan.ts`）
- [x] 検証: 手動 tabs（軽いスモーク — 問題なし）

### フェーズ 5–6 — shell・仕上げ

- [x] `SessionPickerColumns` / `pickersBySession` / `pane-focus-nav` 動的化
- [x] README・shim 削除・CSS ルート alias（`.bmxt-side-picker` on roots）
- [x] README / 本ファイルを現行アーキテクチャに同期

---

## 4. PR 分割の目安

（完了済み工程の記録として維持）

---

## 5. 手動スモーク

| 操作 | tabs | find | dom |
|------|------|------|-----|
| 列を開く | 軽く確認済み | 未検証 | 未検証 |
| キー操作（`/`, Esc, Enter, bulk 等） | 軽く確認済み | 未検証 | 未検証 |

---

## 6. 関連ファイル

| 用途 | パス |
|------|------|
| 列レジストリ | `lib/features/side-picker/wrappers/picker-slot-registry.tsx` |
| 共有リスト chrome | `lib/features/side-picker/chrome/picker-list-shell.tsx` |
| プレーン keyboard hook | `lib/features/side-picker/hooks/use-plain-picker-keyboard.ts` |
| tabs keyboard 拡張 | `lib/features/tabs/use-tab-picker-plain-extensions.ts` |
| リスト kernel | `lib/features/side-picker/interaction/picker-*.ts` |
| tabs ラッパ / ビュー / コントローラ | `tabs-picker-wrapper.tsx`, `tabs-url-list-picker.tsx`, `use-tab-picker-controller.ts` |
| find ラッパ / パース | `url-list-picker-wrapper.tsx`, `model/from-find-lines.ts` |
| テスト | `lib/features/side-picker/**/*.test.ts`, `scripts/picker-search-jump.test.mjs` — `pnpm test` |

---

## 7. 未決・後で決めること

- [ ] **dom 列の Enter** 最終仕様（ジャンプ / コピー / 何もしない）— dom タスクとして保留
- [x] find ブロック → entry（`title` / `url` 行、`[none]` → `history` 表示）
- [x] tabs window/group Enter（`focusWindow` / `activateFromGroup` — 既存 `resolveConfirmPlan`）
- [x] 新ピッカー列の manifest / `*-exit -list` 命名（README 手順）
- [x] kernel 単体テスト（`pnpm test`）；E2E は未導入
- [x] tabs を UrlList 系へ完全統合（bulk/edit 込み・`usePlainPickerKeyboard` 一本化）

**任意の仕上げ（ブロッカーではない）**

- [ ] find / dom の行一覧を `PickerListShell` に寄せる（`PlainTextPickerBody` の chrome 重複解消）
- [ ] `TabPickerOverlay` / `tab-picker-view-types` 名の整理・削除（呼び出し元がなければ）
- [ ] find / dom の手動スモーク記録

---

*実装時は `pnpm run verify:manifest` / `pnpm exec tsc --noEmit` / `pnpm test` / README と整合させること。*

---

## 8. パイプ処理・`-list` 出力規格化・`--picker` リファクタ

BMXt ターミナルに Unix 風 **`|`（パイプ）** を導入するにあたり、各コマンドの **第二トークン以降の出力を `ListResult` で厳密に規格化**し、既存 picker は **第三トークン `--picker`** に移す。

### 8.1 目的

| 項目 | 内容 |
|------|------|
| パイプ | 左セグメントの規格化出力 → 右セグメント stdin |
| `-list` | 「第一コマンドの列挙」が本体。picker は `--picker` 時のみ |
| 上限撤廃 | データ取得層の DOM/行数 cap を撤廃。表示は Linux 慣習（フル出力 + スクロール + サマリー行） |
| picker | 同一 `ListResult` から `toPickerRows()` で既存 UI を起動 |

### 8.2 共通規格：`ListResult`

モジュール: `lib/features/command-line/list-output/`

```
fetch（Chrome API / content script）
    ↓
ListResult（ListRecord[] — 上限なし・唯一の正本）
    ↓
┌─────────────┬──────────────┬─────────────────┐
│ formatPlain │ formatPipe   │ toPickerRows    │
│ ターミナル   │ パイプ stdin  │ --picker UI     │
└─────────────┴──────────────┴─────────────────┘
```

- スキーマ ID: `bmxt-list/1`
- `ListRecord`: `{ kind, fields, display?, pipeLine? }`
- i18n は `display.label` のみ。`fields` は locale 非依存（ID・URL 等）
- パイプ行: `kind\tkey=val\t...`（TSV + key=value）

### 8.3 コマンド別レコード種別

| コマンド | record kinds | 備考 |
|----------|--------------|------|
| `tabs -list` | `tabs.window`, `tabs.group`, `tabs.tab` | pilot（Phase 1） |
| `dom -list` | `dom.node`, `dom.notice` | デフォルト `--normal --html` |
| `search -list` | `search.hit` | scope 別 fields |
| `session -list` | `session.row` | index + sessionId + displayName |
| `setting -list` | `setting.field` | key + value + category |

### 8.4 `--picker` リファクタ（全 `-list` ファミリー共通）

| 旧 | 新 |
|----|-----|
| `tabs -list` → picker 即起動 | `tabs -list` → plain ツリー（ID 付き） |
| picker 起動 | `tabs -list --picker`（`-u` 併用可） |
| `dom -list` → flavor continuation | `dom -list` → デフォルト flavor で plain |

manifest `trailingTokens` に `"--picker"` を追加（codegen 経由）。

### 8.5 上限撤廃と Linux 慣習（表示層）

**撤廃（データ取得層）**

- `dom-terminal-lines.ts`: `MAX_TERMINAL_LINES`, `MAX_LINE_CHARS`
- `injected-dom-show.ts`: `maxNodes`, `maxDepth`, snippet cap
- `injected-dom-flat-entries.ts`: viewport/document cap

**Linux 慣習（表示層）**

1. フル出力をログに追加（プログラム側で中間打ち切りしない）
2. 既存スクロール（`useLogScroll`）で閲覧
3. 末尾サマリー: `-- total N lines (scroll to view) --`
4. 長行は CSS wrap

**要調整**

- `MAX_SESSION_LOG_LINES = 500` — 大出力時 scrollback 相当に拡張または別バッファ

### 8.6 パイプ（Phase 2 以降）

- `parsePipeSegments`（`&&` と同型のクォート・エスケープ）
- `SegmentOutcome.listResult` でセグメント間受け渡し
- 型互換チェック（例: `tabs.tab.tabId` → `close`）

### 8.7 実装フェーズ

#### Phase 0 — `list-output` 基盤

- [x] `list-output/types.ts` — `ListResult`, `ListRecord`, schema 定数
- [x] `list-output/format-plain.ts` — plain 行 + サマリー行
- [x] `list-output/format-pipe.ts` — パイプ行生成
- [x] `list-output/list-output.test.ts`

#### Phase 1 — `tabs -list` pilot

- [x] manifest: `tabs -list` に `--picker` trailingToken、effect `tabs_list`
- [x] `pnpm run codegen`
- [x] `tabs/tabs-list-result.ts` — `buildTabPickerRowsBundle` → `ListResult`
- [x] `tabs/tabs-list-plain.ts` — plain 整形（`-u` 対応）
- [x] `dispatch/handlers/effects/tabs-list.ts`
- [x] `bmxt-core/cmd/tabs.ts` — plain → effect、`--picker` → UI 委譲ヒント
- [x] `tabs/input.ts` — `parseTabsListLine` / `--picker` 必須化
- [x] `handle-tabs-list.ts` / `run-ui-segment.ts` — `--picker` のみ picker（パーサ変更で自動）
- [x] i18n `cmd.json` usage 更新
- [x] テスト追加

#### Phase 2 — パイプ基盤

- [x] `parsePipeSegments` / `runPipeLine`
- [x] `SegmentOutcome` + compound 拡張
- [x] `tabs -list | close` 等の consumer

#### Phase 3 — `dom -list`, `search -list`

- [x] DOM cap 撤廃 + `ListResult` 化
- [x] search レコード正規化（`search_list` effect + `search.hit` ListResult）
- [x] `--picker` 分岐

#### Phase 4 — `session -list`, `setting -list`

- [x] 各 `-list` plain + `--picker`

#### Phase 5 — 仕上げ

- [x] `MAX_SESSION_LOG_LINES` 方針（500 → 5000）
- [x] README / store / release-notes
- [x] compound eligibility 更新

### 8.8 関連ファイル（新規・変更）

| 用途 | パス |
|------|------|
| 出力規格 | `lib/features/command-line/list-output/*` |
| tabs 列挙 | `lib/features/tabs/tabs-list-result.ts`, `tabs-list-format.ts` |
| effect | `lib/features/dispatch/handlers/effects/tabs-list.ts` |
| manifest | `manifest/bmxt-codegen.json` |
| パーサ | `lib/features/tabs/input.ts` |
| UI handler | `handle-tabs-list.ts`, `run-ui-segment.ts` |
| cmd | `lib/features/bmxt-core/cmd/tabs.ts` |

### 8.9 破壊的変更

- `tabs -list` デフォルトが picker → plain ツリー
- picker は `tabs -list --picker` に移行
- release-notes `0.7.7`「パイプ処理導入」と整合

---

## 9. POSIX 整理 — `-list` レジストリと実行経路の統一

各 `-list` コマンドを **registry エントリ 1 本**で登録し、plain 出力は **単一ランナー**経由に集約する。

### 9.1 目的

| 項目 | 内容 |
|------|------|
| レジストリ | `LIST_COMMAND_ENTRIES` に parse / fetch / format を集約 |
| 実行経路 | SW effect・UI handler・compound・pipe が同じ `ListResult` → plain パスを共有 |
| 拡張 | 新 `-list` は `*-list-command.ts` 追加 + registry 1 行 |

### 9.2 レイヤー

```
lib/features/<feature>/*-list-command.ts   … プラグイン（parse / fetch / format）
lib/features/command-line/list-commands/   … registry + tryRunPlainListCommand
lib/features/command-line/list-output/     … ListResult 規格（変更なし）
```

### 9.3 実装チェックリスト

- [x] `list-commands/types.ts` — `ListCommandEntry`, `ListCommandFetchContext`
- [x] 各 feature `*-list-command.ts`（tabs / dom / search / session / setting）
- [x] `list-commands/registry.ts` — `LIST_COMMAND_ENTRIES`, `matchPlainListCommand`
- [x] `list-commands/run-plain.ts` — `tryRunPlainListCommand`, `runPlainListForCommandId`
- [x] effect ハンドラを registry 経由に統一（`dom -list` 含む ListResult 化）
- [x] `handle-session` / `handle-setting` / `run-ui-segment` を `tryRunPlainListCommand` 化
- [x] `pipe/list-producer.ts` 削除 → registry に移行
- [x] `dom-list-fetch.ts` — エラー系も `ListResult` 経由
- [x] `list-commands.test.ts`（matcher 層 — fetch は dynamic import）
- [x] 新コマンド追加手順を README に追記（`*-list-command.ts` + `registry.ts` matcher 1 行）

### 9.4 関連ファイル

| 用途 | パス |
|------|------|
| レジストリ | `lib/features/command-line/list-commands/*` |
| プラグイン例 | `lib/features/tabs/tabs-list-command.ts` |
| DOM fetch 統一 | `lib/features/dom/dom-list-fetch.ts` |
| パイプ | `lib/features/command-line/pipe/run-pipe-chain.ts` |
