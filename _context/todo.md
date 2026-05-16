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

### 1.3 現状の整理（2025 時点）

| 層 | 現状 |
|----|------|
| シェル | `bmxt-shell.tsx` — ターミナル \| tabs \| find \| dom の横並び、`pane-focus-nav.ts` |
| find / dom 一覧 | `PlainTextPickerBody`（`bmxt-window`）— `/`・`n/N` のみ、**`:`・`#` なし** |
| tabs | `TabPickerOverlay` + `use-tab-picker-keyboard` — フル仕様 |
| 逆依存 | `plain-text-picker-body` → `tabs/tab-picker-panels`, `tabs/use-window-keydown-capture`, `tabs/picker-rows` |
| find 状態 | `{ lines: string[] }`（表示用文字列） |
| dom 状態 | `DomListPickerState` = `lines` \| `prompt`（`dom-list-picker-overlay` で分岐） |
| 列追加コスト | `PaneFocusTarget` union、`bmxt-terminal` の session map が**ピッカー種別ごとに増殖** |

---

## 2. 目標アーキテクチャ

### 2.1 UI の4層

```text
① 親ターミナル（BmxtShell — ログ・プロンプト・いつ列を開閉するか）
    ↓
② ピッカーパネル（列レイアウト・フォーカス枠・pane-strip・pickerInputRef — コマンド非依存）
    ↓
③ コマンド用ラッパー（緩衝 — 検索リスト系 / dom 系 / tabs 過渡）
    ↓
④ 各コマンド描画（find 行・dom prompt/行・tab 行リスト 等）
```

| 層 | 責務 | 知らないこと |
|----|------|----------------|
| ① ターミナル | セッション、RUN 前 UI、`set*Picker` | 行の中身 |
| ② ピッカーパネル | `bmxt-picker-host--split`、Esc→プロンプト、Ctrl+←→ | find/dom/tabs の差 |
| ③ ラッパー | 状態の解釈、kernel 接続、Enter/`:` 方針の切替 | 個別行 DOM の詳細 |
| ④ 描画 | 行・パネル・ボタンの見た目 | split レイアウト全体 |

### 2.2 ラッパー系統

| ラッパー | 対象 | 役割 |
|----------|------|------|
| **A. 検索リスト系** (`UrlListPickerWrapper`) | `find -list`、将来の URL 系、**最終的に tabs もここ** | `PickerEntry[]`、interaction kernel、Enter → `openEntry` |
| **B. dom 系** (`DomPickerWrapper`) | `dom -list` のみ | `prompt` / `lines` 分岐、`onApprove` 再試行、dom 用 Enter |
| **C. tabs 過渡** (`TabsPickerWrapper`) | 当面 `TabPickerOverlay` を包む | bulk / edit / `#` は④+`bmxt-core/tabs-picker` に残す。段階的に A へ |

### 2.3 データモデル（URL 統一）

```ts
// 概念 — 実装は lib/features/side-picker/model/ 等
type PickerSource = "tab" | "history" | "bookmark" | "page" // 将来拡張可

type PickerEntry = {
  id: string
  source: PickerSource
  title: string
  url: string // normalizePickerOpenUrl 推奨
  tabId?: number
  windowId?: number
  groupId?: number | null
  meta?: Record<string, string>
}
```

- **find**: `linesForFindElement` のブロック → `PickerEntry[]` に変換（または effect が最初から entries を返す）。
- **tabs**: `TabPickerRow` の tab 行を entry 化。window/group 行は URL なし・Enter 無効または別意味。
- **openEntry**: `applyChromeEffects` 経由（既存 `open_url_new_tab` / `navigate_current_tab` / `open_url_new_window`）。tabs + `default` は既存タブのフォーカスに最適化可。

### 2.4 共通インタラクション（tabs 仕様を kernel 化）

**全ピッカーで揃える（dom はサブセット＋上書き可）:**

- `j`/`k`, `↑`/`↓`
- `/` 検索モード → Enter でハイライト確定
- `n`/`N` マッチ間ジャンプ
- `@` needle（URL 部分一致）
- Ctrl+←→ ペインストリップ
- 隠し IME textarea + window capture keydown
- Esc: サブモード解除 → **プロンプトへ**（列は閉じない）
- `:nohlsearch`（**`:` モード自体は find/dom にも載せる**）

**tabs のみ（capabilities で宣言）:**

- `#` / Shift 範囲、`:` による move/close/group/nw/nt/edit、bulk サブモード、edit パネル

**dom のみ（ラッパー B）:**

- `kind: "prompt"` 権限 UI
- Enter は URL オープンではなく将来ノード操作等（要別設計）

### 2.5 ディレクトリ案

```text
lib/features/side-picker/
  panel/           # ② PickerPanelHost, pane-strip（pane-focus-nav 移設）
  wrappers/        # ③ url-list-wrapper, dom-picker-wrapper, registry
  interaction/     # kernel（tabs から抽出）
  chrome/          # frame, list, footers（旧 bmxt-tab-picker DOM）
  model/           # PickerEntry, openEntry → effects
  plain/           # 仮想スクロール等（移設）

lib/features/find/     # ④ find-list-render.tsx（薄い）
lib/features/dom/      # ④ dom-lines-render, dom-prompt-render
lib/features/tabs/     # ④ tab-picker-render + 既存 reducer 接続

lib/features/bmxt-window/  # ① shell は②③を compose のみ
```

CSS: 段階的に `.bmxt-tab-picker*` → `.bmxt-side-picker*`（移行期は旧クラス併記）。

### 2.6 スケール（列が増えるとき）

- **② + レジストリ**: `PickerSlotId` → wrapper コンポーネント。`PaneFocusTarget` の手書き union 拡張を避ける。
- セッション状態: `Record<sessionId, Partial<Record<slotId, SlotState>>>` へ集約（`pickerBySession` / `findListBySession` / `domListBySession` の三重 map をやめる）。

---

## 3. 実装工程（チェックリスト）

### フェーズ 0 — 境界固定（コード移動なし）

- [x] 依存グラフを書く（`bmxt-window` ↔ `tabs` 逆依存を明示）— `_context/todo.md` 現状整理
- [x] 移動対象を A〜D + ラッパー系統に分類
- [ ] 共通必須キー一覧を README 用に固定（tabs headline / README Picker UI 節と整合）
- [x] find に載せる最小 `:` コマンド（`nohlsearch`）

### フェーズ 1 — interaction kernel 抽出（tabs 回帰が基準）

- [x] `lib/features/side-picker/` 新設
- [x] `use-window-keydown-capture` を `tabs` → `side-picker/hooks/`
- [x] `TabPickerSearchFooter` / `TabPickerCommandFooter` → `side-picker/chrome/`
- [x] `parseTabPickerSearchNeedle` / `splitTextHighlightSegments` → `side-picker/search/`
- [ ] `use-tab-picker-keyboard` から tabs 非依存部分を `side-picker/interaction/` に抽出（`PlainTextPickerBody` に URL リスト用キー操作を集約済み）
- [ ] `TabPickerOverlay` は kernel を呼ぶだけに（挙動不変・`TabsPickerWrapper` 経由）
- [x] 検証: `npx tsc --noEmit`

### フェーズ 2 — ② ピッカーパネル + ③B dom ラッパー

- [x] `PickerPanelHost` 抽出（`bmxt-shell`）
- [x] `DomPickerWrapper` — `dom-list-picker-overlay` は re-export
- [ ] `DomListPromptPanel` → `dom-prompt-render`（④）— 未分割、dom feature に残置
- [x] dom 列は ② 経由で描画
- [ ] 検証: 手動 `dom -list`

### フェーズ 3 — ③A 検索リスト系 + `PickerEntry`

- [x] `PickerEntry` / `PickerSource` 型定義
- [x] `pickerEntriesFromFindLines()`（`find-format` ブロックからパース）
- [x] `openEntryEffects` + `normalizePickerOpenUrl` 共通化
- [x] `UrlListPickerWrapper` + `FindListPickerOverlay`（④）
- [x] find 状態 `{ lines }` → `{ entries }`
- [x] `PlainTextPickerBody` を `side-picker/plain/` に移動（`:` / Enter / Esc スタック拡張）
- [x] find に Enter → open URL（`openFindPickerEntry`）
- [ ] 検証: 手動 `find -list`

### フェーズ 4 — tabs を URL 主線に寄せる

- [ ] `TabPickerRow` → `PickerEntry` マッピング
- [ ] `confirmSelection` を `openEntry`（default = 既存タブフォーカス）に接続
- [ ] `TabsPickerWrapper` または `UrlListPickerWrapper` + `capabilities: { marks, bulk, edit }`
- [ ] bulk / edit / reducer は `tabs` + `bmxt-core/tabs-picker` のまま
- [ ] 検証: `tabs -list`, `group new`, `:edit`, Enter

### フェーズ 5 — shell レジストリ・状態集約

- [ ] `PICKER_WRAPPERS` registry（slot kind → ③）
- [ ] `bmxt-terminal` の session map 一本化
- [ ] `pane-focus-nav` を動的 `open[]` 対応（固定 union 縮小）
- [ ] README Picker UI 節のパス・仕様更新

### フェーズ 6 — 仕上げ

- [ ] 一時 re-export シム削除
- [ ] CSS リネーム（`bmxt-side-picker` + 旧クラス alias）
- [ ] `picker-overlay.tsx` → `tab-picker-overlay.tsx` 等の rename（任意・別 PR 可）

---

## 4. PR 分割の目安

| PR | 内容 | リスク |
|----|------|--------|
| PR1 | フェーズ 1（kernel 抽出・tabs 回帰） | 中 |
| PR2 | フェーズ 2（PanelHost + dom wrapper） | 低〜中 |
| PR3 | フェーズ 3（PickerEntry + find + UrlListWrapper） | 中 |
| PR4 | フェーズ 4（tabs → openEntry） | 中 |
| PR5 | フェーズ 5–6（registry・CSS・docs） | 中 |

---

## 5. 手動スモーク（各 PR 後）

| 操作 | tabs | find | dom |
|------|------|------|-----|
| 列を開く | `tabs -list` | `find -list --none pat` | `dom -list --html` |
| `j`/`k` | ○ | ○ | ○ |
| `/` → Enter → `n`/`N` | ○ | ○ | ○ |
| `:` → `nohlsearch` | ○ | ○ | （dom は上書き可） |
| Esc 段階解除 → プロンプト | ○（#→:→/→bulk→prompt） | ○ | ○（prompt 時は別） |
| Ctrl+←→ 列移動 | ○ | ○ | ○ |
| Enter（URL / フォーカス） | ○ | ○（フェーズ3以降） | 将来定義 |
| `*-exit -list` | ○ | ○ | ○ |

---

## 6. 関連ファイル（現状の起点）

| 用途 | パス |
|------|------|
| Shell 配置 | `lib/features/bmxt-window/bmxt-shell.tsx` |
| Session 状態 | `lib/features/bmxt-window/bmxt-terminal.tsx` |
| ペインストリップ | `lib/features/bmxt-window/pane-focus-nav.ts` |
| find 薄ラッパ | `lib/features/find/find-list-picker-overlay.tsx` |
| dom 薄ラッパ | `lib/features/dom/dom-list-picker-overlay.tsx` |
| プレーン一覧 | `lib/features/bmxt-window/plain-text-picker-body.tsx` |
| tabs 本体 | `lib/features/tabs/picker-overlay.tsx`, `use-tab-picker-keyboard.ts` |
| find 行形式 | `lib/features/search/find-format.ts` |
| URL 正規化 | `lib/features/tabs/normalize-picker-open-url.ts` |
| Effects | `lib/features/dispatch/effect-types.ts` |
| ドキュメント | `README.md` — Picker UI (side columns) |

---

## 7. 未決・後で決めること

- [ ] dom 列の Enter 最終仕様（ジャンプ / コピー / 何もしない）
- [ ] find 複数行ブロックを 1 entry にするルール（`title` / `url` の取り出し）
- [ ] tabs window/group 行の Enter（無効 vs 子タブ代表 URL）
- [ ] 新ピッカー追加時の manifest / `*-exit -list` 命名規約
- [ ] 自動テストの有無（現状は手動スモーク中心）

---

*この文書はチャット上の設計合意のスナップショット。実装時は `npm run verify:manifest` / `npx tsc --noEmit` / README と整合させること。*
