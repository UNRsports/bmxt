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
