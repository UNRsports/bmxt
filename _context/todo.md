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

---

## 10. POSIX 準拠 — 可否と工程

### 10.1 結論：**準拠は可能（ただしスコープを定義したうえで）**

| 意味 | 可否 | 理由 |
|------|------|------|
| **IEEE Std 1003.1 シェル言語の完全準拠・認証** | **不可／不要** | BMXt は Chrome 拡張の対話ターミナル。実 FD・ジョブ制御・POSIX ユーティリティ群の再実装はプロダクト目的と乖離する |
| **POSIX シェル**を手本にした**コマンドラインセマンティクスの準拠** | **可能** | §8–9 で `-list` / `\|` / `&&` / 構造化 stdout の骨格は既にある。残りはシェル層の一本化と演算子・終了状態の拡充 |

**考え方:** 「POSIX 準拠」= **BMXt が採用するシェル仕様を文書化し、compound / pipe / 各コマンドがその仕様に従う**こと。完全な POSIX.1 クローンではない。

### 10.2 準拠の定義（BMXt POSIX Profile）

以下を満たしたとき **POSIX 準拠シェル層** と呼ぶ（README / `map_command.csv` に明記する）。

| # | 要件 | 現状 | 目標 |
|---|------|------|------|
| P1 | **コマンド = argv 列 → 実行 → 終了状態** | **実装済み** — `exitStatus`（0/1/2/127） | 全セグメントが **数値 exit status（0 = 成功）** を返す |
| P2 | **標準出力** | **実装済み** — `stdout` + `ListResult` | 成功時の**正本は `ListResult` または plain 行**；ログはその投影 |
| P3 | **標準エラー** | **実装済み** — `stderr` + CSS | **stderr 相当チャネル**（見た目はターミナルでも種別を分離） |
| P4 | **パイプ `\|`** | **実装済み** — consumer registry | **registry 化された consumer**；型互換チェック付き |
| P5 | **論理 AND `&&`** | **実装済み** — `&&` / `||` / `;` | 維持；**`||` / `;`** を同じパーサ族で追加 |
| P6 | **クォート・エスケープ** | **実装済み** — 演算子 + リダイレクト | 全演算子・リダイレクトトークンに拡張 |
| P7 | **コマンド解釈の単一入口** | **実装済み** — `commands/runCommand` + `COMMAND_ENTRIES` + background `RUN_CMD` | **`CommandEntry` 1 本**（tryRun / runtime: `ui` \| `background`） |
| P8 | **対話 UI は opt-in** | **実装済み** — `picker <list>`（§11）、continuation | bare `picker` は usage；列はプレフィックス起動 |
| P9 | **適合性テスト** | **実装済み** — `conformance/posix-profile.test.ts` | **プロファイル別 conformance スイート**（演算子・終了状態・パイプ） |

**永久にスコープ外（準拠対象外と明記）**

- ジョブ制御（`&`, `fg`, `bg`）、サブシェル、`$(…)` / バッククォート展開
- ファイル記述子リダイレクトの OS 実体（拡張は「ログ／ファイル書き込み」セマンティクスのみ）
- 外部プロセス起動、シグナル、`$PATH` 上のバイナリ実行
- POSIX ユーティリティカタログそのものの搭載

### 10.3 現状ギャップ（§9 完了後）

- [x] exit status の数値化と compound / pipe への一貫適用
- [x] stdout / stderr チャネル分離
- [x] 全コマンドの `CommandEntry` 化（compound/pipe 経路；background は `RUN_CMD` フォールバック）
- [x] パイプ consumer のプラグイン registry（`close` を registry 登録；追加 consumer はプロダクト拡張）
- [x] `||` / `;` 演算子
- [x] リダイレクト（null シンクのみ: `null` / `/dev/null`）
- [x] BMXt POSIX Profile の README 節 + conformance テスト

### 10.4 実装フェーズ

#### Phase A — 終了状態（exit status）の正規化

- [x] `SegmentOutcome` に `exitStatus: number`（0 = 成功）を追加；既存 `code` は内部分類として維持
- [x] `code` → `exitStatus` の対応表を 1 モジュールに固定（usage=2, unknown=127 等 — **profile 文書化**）
- [x] `runCompoundLine` / `runPipeChain` が **左セグメントの exitStatus** で短絡（`&&` / `||`）
- [x] `CompoundRunResult.exitStatus` で全体終了状態を返す（ログ末尾サマリーは任意・未表示）
- [x] テスト: `compound.test.ts` / conformance に status アサーション

#### Phase B — stdout / stderr 分離

- [x] `CommandOutput { stdout: string[]; stderr: string[]; listResult?: ListResult; exitStatus: number }` 型を定義
- [x] `appendLogLines` を **channel 付き**に拡張（または stderr 専用 deps）
- [x] usage / parse error → stderr、成功列挙 → stdout（ターミナル CSS で区別可能に）
- [x] `formatListPlainLines` は stdout のみ；サマリー行も stdout

#### Phase C — 全コマンド `CommandEntry` レジストリ

- [x] `lib/features/command-line/commands/types.ts` — `CommandEntry`（id, tryRun, runtime）
- [x] `commands/registry.ts` — `COMMAND_ENTRIES` + `BACKGROUND_COMMAND_ENTRY`（`RUN_CMD`）
- [x] 既存 `run-ui-segment` の runner 配列を **registry 順の dispatch** に置換（`runCommand`）
- [x] background は同一 `runCommand` から `RUN_CMD` へフォールバック（effect は Chrome adapter）
- [x] `-list` は `plain-list` entry が `list-commands` を composition
- [x] 新コマンド追加手順を README 更新（manifest + shell `CommandEntry`）

#### Phase D — パイプ consumer registry

- [x] `lib/features/command-line/pipe/consumers/types.ts` — `PipeConsumerEntry`（match, acceptsKinds, run）
- [x] `close` を registry 登録に移行
- [x] 型互換: producer `ListRecordKind` と consumer `acceptsKinds` の不一致時は **exit 1 + stderr**
- [x] 候補 consumer はプロダクト拡張（プロファイル外）— registry プラグインで追加可能
- [x] `run-pipe-chain.ts` が producer registry + consumer registry のみ参照

#### Phase E — 演算子拡張（`||` / `;`）

- [x] `parse-and-segments.ts` を **演算子テーブル**化（`&&` 実装を一般化 → `parse-compound-segments.ts`）
- [x] `;` — 前の exit status に関わらず次を実行
- [x] `||` — 前が非 0 のときのみ次を実行
- [x] エスケープ: `\;`, `\||`, クォート内は演算子無効（`&&` と同型）
- [x] `classifyCompoundEligibility` を全演算子で共有
- [x] conformance テスト追加

#### Phase F — リダイレクト（null シンク）

- [x] スコープ決定: **null シンクのみ**（`null` / `/dev/null`）。OS パス・設定エクスポートは対象外
- [x] `>`, `>>`, `2>`, `2>>` のトークン解析（クォート・`\>` エスケープ）
- [x] stdout / stderr リダイレクトのセマンティクス文書化（README）
- [x] 実装 + テスト

#### Phase G — 準拠宣言と回帰防止

- [x] README に **「BMXt POSIX Profile」** 節（EN + JA）：準拠範囲・非準拠の明示
- [x] `_context/map_command.csv` に shell 層モジュール行を追記
- [x] `lib/features/command-line/conformance/` — profile 別テストスイート
- [x] release-notes に準拠マイルストーンを記載（`0.7.7`）

### 10.5 依存関係（推奨順）

```
Phase A（exit status）
    ↓
Phase B（stdout/stderr）     Phase D（pipe consumers）
    ↓                              ↓
Phase C（CommandEntry） ←──────────┘
    ↓
Phase E（|| ;） → Phase F（redirect・任意）
    ↓
Phase G（文書・conformance）
```

§9 の `-list` registry は Phase C / D の前提として **維持・拡張**する（やり直し不要）。

### 10.6 完了判定

- [x] P1–P9（§10.2）が実装とテストでカバーされている
- [x] README BMXt POSIX Profile が利用者向けに公開されている
- [x] `pnpm test` に conformance スイートが含まれ CI で通る
- [ ] 既存手動スモーク（tabs / find / dom / session / setting / pipe）が退行していない（実装完了後の人手確認）

**プロファイル完了。** プロダクト拡張（追加 pipe consumer、OS パスへのリダイレクト等）はプロファイル外。

---

## 11. `picker` コマンド独立 — `--picker` 廃止・プレフィックス形式

### 11.1 目的

| 項目 | 内容 |
|------|------|
| `-list` | **列挙のみ**（`ListResult` / plain 行）。対話 UI を起動しない |
| `picker` | **第一コマンド**として独立。続く `-list` 列挙をサイド列（または session 候補）で走査しやすくする |
| 起動 | **`picker tabs -list`** / **`picker search -list …`** 等（意図を先に書く）。**`picker` 単体**は usage（i18n）のみ |
| 廃止 | 全 `-list` の第三トークン **`--picker`**、および **`… \| picker`** パイプ形式 |

### 11.2 セマンティクス

```
picker <list-command>
    │
    ├─ bare `picker`     → usage（i18n）
    └─ producer (-list)  → ListResult → open picker UI（exit 0）

tabs -list               → formatPlain（ターミナル）
tabs -list | close       → パイプ consumer（副作用・picker とは別）
```

- **意図先行:** これから行う動作（ピッカー表示）を先に定義し、対象の列挙コマンドを続ける。`|` は不要（入力しづらい・UI 起動はデータ変換ではない）。
- 列の寿命はセッション（`-exit -list` 等）。`picker` コマンドの終了 ≠ 列クローズ。
- **tabs ライブ更新**は起動経路に依存しない。列 open 後、`useTabPickerChromeSync` + live-fields が Chrome を監視。tabs の正本は常に `chrome.tabs.*`。
- URL 表示は producer 側（`picker tabs -list -u`）。

### 11.3 kind → slot

| `ListRecord` kind 族 | 開く UI |
|----------------------|---------|
| `tabs.*` | tabs サイド列（live watch 付き） |
| `search.hit` | search サイド列（スナップショット表示） |
| `dom.node` / `dom.notice` | dom サイド列 |
| `session.row` | session フローティング候補 |
| `setting.field` | setting サイド列（既存エディタ） |

混在族・非 `-list` 後続はエラー（stderr + exit 非 0）。

### 11.4 対象外（従来どおり別経路）

- `group new`（ID なし）の tabs 列（group-new variant）
- `session -switch` の名前補完フローティング
- 各 `*-exit -list`（列クローズ）
- パイプ consumer（`close` 等）— `picker` はプレフィックス専用

### 11.5 実装チェックリスト

- [x] `_context/todo.md` §11（プレフィックス形式）
- [x] manifest: `picker` コマンド；各 `-list` から `--picker` 削除
- [x] `lib/features/picker/` — prefix parse / run / open-from-list-result
- [x] `CommandEntry` + UI handler（`picker` を `plain-list` より前に登録）
- [x] pipe consumer から `picker` を外す（`close` のみ）
- [x] i18n・README・テスト・codegen

---

## 12. nav インクリメンタルジャンプ — 探索同定 + 属性指定で直接到達

現在の **nav モード**（仮想カーソル / 空間スナップ / 合成 activate）に、**要素属性のインクリメンタル指定による直接ジャンプ**と、**カーソル探索で同定した識別子の再利用**を足す。Vimium 型の全画面ヒント競争ではなく、**探索 → 同定 → 再利用**で「直感 + 再操作の確実さ」を取る。

### 12.1 目的

| # | 機能 | 内容 |
|---|------|------|
| **N1** | インクリメンタル直接ジャンプ | nav overlay **ON** 時、リンク等の属性断片（accessible name / `alt` / リンクテキスト / URL の安定部分 等）をインクリメンタル入力し、一致候補へカーソル（または選択）を飛ばして activate 可能にする |
| **N2** | カーソル同定 → ラベル表示 → クリック / 学習 | 初回は nav カーソルで指し示し、対象の識別ラベル（`alt` / URL / name 等）をその場表示したうえでクリック。よく行くサイトでは **N1** で同じ識別子へ直接ジャンプ |

**非目標（本節スコープ外）**

- `chrome.debugger` / CDP AOM への依存（デバッガバナー回避）
- Vimium 互換の全画面一時ヒント（`f` ラベル撒き）の再実装
- 任意 UI（canvas / ドラッグ）の完全カバー

### 12.2 セマンティクス（ユーザー体験）

```
nav -enter → Alt で overlay ON
    │
    ├─ 矢印 … 既存どおり空間移動 / スナップ
    ├─ カーソル下 … 識別ラベル HUD（name / alt / href 断片 / 分類）
    ├─ Enter … 分類に応じた activate（既存 + 強化）
    │
    └─ インクリメンタルモード（キーは未決・§12.7）
           クエリ入力 → 候補絞り込み → ジャンプ → Enter で activate
```

- **探索（N2）:** 指した要素をヒューリスティック分類し、表示用・記憶用のキーを生成する。
- **再利用（N1）:** 同一オリジン（または URL パターン）内で、キーに対するインクリメンタル一致で候補へ飛ぶ。
- **activate:** 座標クリックより、解決済み要素への直接操作を優先（§12.4）。

### 12.3 要素分類・識別キー（ヒューリスティック）

カーソル下（または候補）について、自分→祖先を歩き **確信度つき分類**する（boolean の「機能あり」よりスコア分類）。

| 分類 | 主な信号 | 識別キー候補（優先順の目安） |
|------|----------|------------------------------|
| `link` | `a[href]`, `area`, `role=link` | pathname+query 安定部 → リンクテキスト → `aria-label` |
| `button-like` | `button`, `role=button`, 標準 input | accessible name → `aria-label` → 可視テキスト |
| `editable` | input/textarea/contenteditable | `name` / `id` / label テキスト（既存 typing と連携） |
| `media` | `img[alt]`, 画像リンク | `alt` → 親リンク href |
| `maybe-interactive` | `cursor:pointer`, tabindex≥0 のみ | 弱キー + 要カーソル確認 |
| `inert` | aria-hidden / disabled / pointer-events:none | ジャンプ対象外 |

- `addEventListener` のみの要素は content script から列挙不可 → `maybe` 止まりを許容。
- 内側テキストノードではなく **実ターゲット**（親の `a` 等）を解決してからキー化。
- 同一ページ内の衝突時は短い識別子や親コンテキストを付与。

実装の置き場（案）: `lib/features/nav/nav-target-classify.ts`（ページ注入側と共有可能な純関数）+ 既存 `nav-spatial-in-page.ts` との接続。

### 12.4 activate 方針

| 分類 | 優先アクション |
|------|----------------|
| `link` / `button-like` | 解決要素へ `click()` 系を **1 回**（現行の二重 dispatch を整理） |
| `editable` | 既存 typing mode |
| `maybe-interactive` | 要素中心へのポインタイベント → 失敗時は HUD で明示 |
| 失敗 | 再分類・再解決を **1 回**まで；それでもだめなら status エラー |

インクリメンタルジャンプ後の Enter も、座標ではなく **解決済み path / 要素** を正本とする。

### 12.5 学習・サイト再利用（N2 → N1）

| 項目 | 方針 |
|------|------|
| 記憶タイミング | カーソル同定後の成功 activate、または明示「ピン」（UI 未決） |
| キー | §12.3 の識別キー + `record` kind（link 等） |
| スコープ | `origin` 必須。任意で path プレフィックス（SPA 対策は後段） |
| 保存先 | まず **セッション / メモリ**；永続は `chrome.storage.local`（設定 skill に合わせる）。外部 zip は後回し可 |
| 腐ったキー | ジャンプ 0 件 or activate 失敗 → 候補から落とし、再探索を促す |

よく行くサイトでは、学習済み + ページ上の現行候補をマージしてインクリメンタル対象にする。

### 12.6 実装フェーズ

#### Phase 0 — 設計固定・現状整理

- [x] 本節（§12）を正とし、キーバインド・HUD 文言・永続の最小範囲を §12.7 で決める
- [x] 現行 `navSpatialClickElement` の二重イベント有無を確認し、Phase 3 の整理対象に落とす（MouseEvent 連鎖 + `click()` 二重 → 単一 `click()` 優先へ）
- [x] 関連: `lib/features/nav/*`, `entrypoints/bmxt-nav-overlay.content/`, README Nav mode

#### Phase 1 — その場分類 + ラベル HUD（N2 の「指して見せる」）

- [x] `nav-target-classify.ts` — 分類・識別キー生成・実ターゲット解決（単体テスト）
- [x] overlay / inject: カーソル下（スナップ中は選択要素）のラベルを HUD 表示
- [x] status strip または overlay 近傍に `link:…` / `button:…` / `maybe:…` を短く出す
- [x] i18n（`nav` namespace）EN + JA
- [ ] 手動: 通常リンク・アイコンボタン・内側 span・inert の見え方

#### Phase 2 — インクリメンタル直接ジャンプ（N1）

- [x] overlay ON + terminal focus 時のインクリメンタル UI（専用バッファ + status `jump` — `/`）
- [x] ページ候補収集（既存 spatial 候補を拡張: name/alt/href インデックス）
- [x] クエリで絞り込み → 先頭/選択候補へカーソル移動（`scrollIntoView` + highlight）
- [x] Enter で §12.4 activate；Esc でインクリメンタル解除（overlay は維持）
- [x] 単体: マッチング・衝突・0 件
- [ ] 手動: URL 断片 / リンクテキスト / alt でのジャンプ

#### Phase 3 — activate 信頼性の底上げ

- [x] 分類別 activate に分岐；合成 MouseEvent 乱発を抑制
- [x] `elementFromPoint` 再検証は座標フォールバック時のみ
- [x] 失敗理由を status / i18n で返す
- [ ] 回帰: 既存 typing / context menu / text select（手動）

#### Phase 4 — 学習と「よく行くサイト」再利用（N2 完成）

- [x] 成功 activate 時に (scope, kind, key, 任意 meta) を記録
- [x] インクリメンタル候補 = ページ現行 ∪ 学習済み（同一 scope）
- [x] 腐ったエントリの無効化
- [x] 永続化（optional）: storage キー設計・上限・削除 UX の最小（`bmxt_nav_learned_targets_v1`）
- [x] README Nav mode に N1/N2 を追記

#### Phase 5 — 仕上げ

- [x] README / store / release-notes（ユーザー向け短い説明）
- [x] `_context/map_command.csv` に nav 関連モジュール行があれば更新
- [x] `pnpm exec tsc --noEmit` / `pnpm test`（手動スモーク nav + translate 併用は残）

### 12.7 設計固定（実装前提）

- [x] インクリメンタル起動キー: **`/`**（overlay ON + terminal フォーカス時のみ。picker は `paneFocus` 別系統のため衝突しない）
- [x] HUD: **overlay 吹き出し + status strip の短い `kind:key`**（両方）
- [x] 学習: **成功 activate 時に自動記録**（明示ピン UI は後回し）
- [x] 永続: **`chrome.storage.local`**（`bmxt_nav_learned_targets_v1`、origin 単位・上限付き）。`setting` UI / zip は後回し
- [x] SPA scope: **origin のみ**（path プレフィックスは後段）

### 12.8 依存関係

```
Phase 0（設計）
    ↓
Phase 1（分類 + HUD） ──→ Phase 3（activate）
    ↓                         ↑
Phase 2（インクリメンタル） ──┘
    ↓
Phase 4（学習・再利用）
    ↓
Phase 5（文書・回帰）
```

Phase 2 は Phase 1 のキー生成を前提とする。Phase 4 は Phase 2 の候補パイプに学習を載せる。

### 12.9 関連ファイル（予定）

| 用途 | パス |
|------|------|
| 分類・キー | `lib/features/nav/nav-target-classify.ts`（新規） |
| 空間候補 | `lib/features/nav/nav-spatial-in-page.ts` |
| inject / overlay | `lib/features/nav/nav-overlay-inject-fn.ts`, `entrypoints/bmxt-nav-overlay.content/` |
| セッション hook | `lib/features/nav/use-nav-mode.ts` |
| bridge | `lib/features/nav/nav-tab-bridge.ts`, `run-nav-inject.ts` |
| i18n | `lib/features/setting/i18n/namespaces/`（`nav`） |
| 学習永続（任意） | `lib/features/nav/` 配下 + storage（`bmxt-ui-settings` skill に合わせる） |

### 12.10 完了判定

- [x] overlay ON でカーソル下が分類・識別ラベル付きで分かる（N2 探索）— 実装済み；手動確認は残
- [x] 属性断片のインクリメンタルで候補へジャンプし activate できる（N1）— 実装済み；手動確認は残
- [x] 一度同定・成功したキーが、同一 scope でインクリメンタル再到達できる（N2 再利用）— 実装済み；手動確認は残
- [x] `debugger` 権限なし；既存 nav typing / menu が退行していない — コードパス維持；手動回帰は残
- [x] README Nav mode（EN + JA）に仕様が書かれている

---

## 13. Rust/WASM コマンドコア — TS はブラウザ I/O と UI 表示のみ

最終目標: **コマンドの意味論（parse / 検証 / パイプ計画 / Effect 計画）は Rust（WASM）**、**TypeScript は Chrome API・content script・React 表示に徹する**。TS はコマンド文法を「知らず」、WASM が返した結果（行・Effect IR・UI アクション IR）を実行・表示するだけにする。

関連: §8（パイプ / `ListResult`）、§9–10（POSIX / `-list` 経路）、§11（`picker` プレフィックス）。本節はそれらの **実行エンジン置き場** を Rust に移す工程。

### 13.1 目的・境界

| 層 | 責務 | 置き場（目標） |
|----|------|----------------|
| コマンド意味論 | tokenize、registry、オプション検証、compound/pipe 計画、tabs-picker 計画 | **Rust crate → WASM** |
| Effect 実行 | `chrome.*`、storage、scripting、job/cancel | **TS** `lib/features/dispatch/` |
| ページ DOM / サイト UI | nav overlay、dom inject、search_page | **TS** content script + feature モジュール |
| 表示 | ターミナルログ、picker、status、i18n 展開 | **TS** React（`bmxt-window` / `side-picker`） |

**やらないこと（WASM 内禁止）**

- `chrome.*` / DOM / React への直接呼び出し
- 非同期 Chrome オーケストレーション本体（進捗・キャンセルは TS）

**歴史的背景**

- かつて Rust/WASM コマンドコアがあったが TS + codegen に移行済み（現状 `Cargo.toml` なし）
- `manifest/bmxt-codegen.json` の `effects[].rustVariant`、`ensureBmxtCore()` no-op、`tryRunCommandWithoutWasm` は残骸
- SQLite（sql.js）WASM は SW 性能悪化で廃止済み → **コマンド WASM はサイズ・冷起動を厳守**

### 13.2 目標アーキテクチャ

```
┌──────────────────────────────────────────────────────────┐
│ TS: BMXt UI（React）                                     │
│  - prompt / picker / status / log 表示のみ               │
│  - 行 + locale + 最小コンテキストを渡す                  │
│  - コマンド名分岐なし（DOMAIN_HANDLERS 廃止）              │
└────────────────────────────┬─────────────────────────────┘
                             │ classify / run（同期計画）
┌────────────────────────────▼─────────────────────────────┐
│ Rust WASM: bmxt-core                                     │
│  - parse / registry / options / pipe / compound          │
│  - 戻り値（JSON）:                                       │
│      { ty: "lines", … }                                  │
│      { ty: "effects", effects: ChromeEffect[] }          │
│      { ty: "ui", action: UiActionIR }   ← picker 等      │
│      { ty: "msgs", keys + params }      ← i18n キー      │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│ TS: host                                                 │
│  - applyChromeEffects（既存 dispatch/）                  │
│  - UiActionIR → React（open picker slot 等）             │
│  - msgs → tCmd / tTabs / tSetting                        │
│  - SessionPatch 収集・表示                               │
└──────────────────────────────────────────────────────────┘
```

**正本:** `manifest/bmxt-codegen.json`  
codegen が **TS Effect 型 + apply スイッチ** と **Rust `ChromeEffect` / レジストリ** を両方生成する。

### 13.3 ワイヤー形式（設計固定案）

| 項目 | 方針 |
|------|------|
| Effect IR | 既存 `ChromeEffect`（JSON）を正。Rust enum は `rustVariant` と 1:1 |
| UI アクション | 新規 `UiActionIR`（例: `open_picker { kind, options }`）。TS は kind の意味を知らずスロット実行のみ |
| i18n | WASM は **安定キー + params** を返す。文言カタログは TS の `lib/features/setting/i18n/` のみ |
| locale | `run(line, locale)` / `classify(line, locale)` の引数で渡す（`getRunLocale` スレッドローカルは廃止方向） |
| `ListResult` | スキーマは §8 準拠。計画は Rust、Chrome からの実データ取得は TS effect |

### 13.4 現状ギャップ（移行前）

| 経路 | 現状 | 目標 |
|------|------|------|
| SW `runDispatch` | TS `bmxt-core/cmd/*` | WASM |
| UI `DOMAIN_HANDLERS` | Enter 時にコマンド別 TS 分岐 | WASM `UiActionIR` のみ |
| `command-line` `COMMAND_ENTRIES` | シェル所有権 + UI 副作用 | 計画は WASM、実行は host |
| 補完・continuation | TS registry / codegen | WASM または生成テーブルを opaque 参照 |
| `tabs-picker/*` 計画 | TS 純関数 | WASM（適用は TS） |
| compound / pipe | TS `command-line/` | 計画層 WASM（§8 と整合） |

### 13.5 実装フェーズ

#### Phase 0 — 設計固定・計測ベースライン

- [x] 本節（§13）を正とし、§13.3 のワイヤー形式を確定
- [x] `ChromeEffect` / `DispatchBundle` の現行 JSON をスナップショット（互換契約）
- [x] SW 起動・初回 `RUN_CMD` のベンチ（`scripts/benchmark-launch-perf.mjs` 等）をベースライン記録
- [x] WASM 予算: バイナリサイズ上限・初回 instantiate 上限（数値を README / CI に書く）
- [x] 依存: §8–11 のパイプ / `-list` / picker 経路が「計画と実行が分離」していることを確認

#### Phase 1 — ツールチェーン + codegen 二重出力

- [x] `crates/bmxt-core/`（仮）: `wasm-bindgen`、edition / MSRV 固定
- [x] CI: `rustup` + `wasm-pack`（または同等）。README から「Node/TS only」記述を更新
- [x] codegen: `effects[].rustVariant` + `fields` → Rust `ChromeEffect` enum 生成
- [x] codegen: `commands[]` → Rust レジストリ表（名前・第二トークン）生成
- [x] WXT 梱包: `*.wasm` + glue を拡張パッケージに含める
- [x] `ensureBmxtCore()` を実初期化に復帰（失敗時は既存 `tryRunCommandWithoutWasm`）
- [x] `pnpm run verify:manifest` / `check:generated` に Rust 生成物チェックを追加

#### Phase 2 — SW 経路の最小移植（pilot）

- [x] WASM: `run(line, locale) -> DispatchBundle` JSON（まずは数コマンド）
- [x] pilot 候補: `clear` / `close` / URL 行（`open_url_*` / navigate）など Effect が薄いもの
- [x] SW: feature flag または段階切替で `runDispatch` 本体を WASM に委譲
- [x] TS `bmxt-core/cmd/*` の該当分は薄い互換 shim → 削除
- [x] 単体: Rust 側テスト + 既存 TS 適合テストの同等ケース
- [x] ベンチ: SW 冷起動・初回コマンドが予算内

#### Phase 3 — 全 built-in `cmd/*.run` + registry

- [x] `bmxt-core/cmd/*.ts` を順次 Rust 化（`tabs` / `search` / `dom` / `session` / `setting` 等）
- [x] `line-parse` / `resolveCanonical` / URL 行ルールを Rust へ
- [x] TS `COMMAND_RUNNERS` 生成を廃止または WASM 呼び出しラッパのみ残す
- [x] i18n: エラー・usage をキー返却に統一（埋め込み文言をやめる）
- [x] `runDispatch` / `parseDispatchJson` の TS 実装を「WASM 呼び + JSON parse」に縮小

#### Phase 4 — tabs-picker 計画層

- [x] `tabs-picker` の reducer / validate / execute-plan / create-group-plan を Rust へ
- [x] TS は Chrome 適用（focus / move / group）と UI バインドのみ
- [x] 既存 tabs picker 手動スモーク相当の回帰（計画 JSON の golden test）

#### Phase 5 — compound / pipe 計画を WASM へ

- [x] `parsePipeSegments` / compound 解析・exit-status 方針を Rust へ（§8 / §10 と契約維持）
- [x] セグメント実行ループは TS host（各セグメント: WASM 計画 → Effect/UI 実行 → 次 stdin）
- [x] `ListResult` の型互換チェックを Rust 側に寄せる（取得は TS）

#### Phase 6 — UI 非認知化（最終目標）

- [x] `UiActionIR` を定義・codegen（open picker、nav mode 切替ヒント等）
- [x] `useCommandDispatch` の `DOMAIN_HANDLERS` を廃止し、WASM `classify`/`run` 結果のみで分岐
- [x] `COMMAND_ENTRIES` の「コマンド知識」を WASM に集約。TS は実行器レジストリ（opaque id → 関数）
- [x] 補完・continuation: UI は WASM（または生成 opaque 表）に問い合わせ、コマンド文字列をハードコードしない
- [x] 残存する「コマンド名 if 分岐」を grep しゼロにする（許容: codegen 生成の apply スイッチと i18n キー）

#### Phase 7 — 仕上げ・文書

- [x] 旧 TS `bmxt-core/cmd` / 不要 shim / コメント（「Rust が返した…」の残骸整理）を削除
- [x] README（EN + JA）: アーキテクチャ図、開発時 Rust 手順、WASM 予算
- [x] welcome / release-notes: ユーザー向けは「内部実装」程度に短く
- [x] `_context/map_command.csv` 更新
- [x] `pnpm run verify:manifest` → `check:generated` → `tsc` → `test` → `build` + Rust test + 起動ベンチ

### 13.6 依存関係（推奨順）

```
Phase 0（契約・予算）
    ↓
Phase 1（crate + codegen）
    ↓
Phase 2（SW pilot） ──→ Phase 3（全 cmd）
                            ↓
                      Phase 4（tabs-picker）
                            ↓
                      Phase 5（pipe/compound）
                            ↓
                      Phase 6（UI 非認知）
                            ↓
                      Phase 7（文書・掃除）
```

- Phase 2 完了まで **本番デフォルトは TS のまま**（flag off）を推奨。
- Phase 6 は Phase 3 必須。UI ハンドラが残っていると「TS はコマンドを知らない」は未達。
- §8 パイプ強化やサイト UI 操作の追加 Effect は、**IR 追加 + TS executor** で先行可能（Rust 移植を待たない）。

### 13.7 関連ファイル（予定）

| 用途 | パス |
|------|------|
| 正本 | `manifest/bmxt-codegen.json` |
| codegen | `scripts/codegen/run.mjs`（Rust 出力追加） |
| Rust コア | `crates/bmxt-core/`（新規） |
| TS 実行器 | `lib/features/dispatch/`（維持・拡張） |
| 現行 TS コア（縮退） | `lib/features/bmxt-core/` |
| UI 入口 | `lib/features/bmxt-window/shell/useCommandDispatch.ts` |
| シェル計画（移行元） | `lib/features/command-line/` |
| SW 読込 | `entrypoints/background/`（`ensureBmxtCore` 復帰） |
| i18n | `lib/features/setting/i18n/namespaces/`（キーのみ WASM 参照） |

### 13.8 リスクと完了判定

**リスク**

| リスク | 緩和 |
|--------|------|
| SW での WASM 冷起動悪化 | 遅延 init、サイズ上限、ベンチ CI、pilot 段階で flag |
| 三重経路（DOMAIN / COMMAND_ENTRIES / core） | Phase 6 で一本化。途中は「SW のみ WASM」を許容 |
| i18n 二重管理 | キー返却のみ。カタログは TS 単一 |
| codegen / CI 複雑化 | `check:generated` に Rust 出力を含める |
| サイト UI 操作の複雑化 | Effect / UiAction を増やすだけ。WASM に DOM を持ち込まない |

**完了判定**

- [x] コマンド文法・オプション・パイプ計画の正本が Rust（WASM）にあり、TS に同等ロジックが残っていない
- [x] TS の Enter 経路にコマンド名ハードコード分岐がない（`UiActionIR` / Effect 実行のみ）
- [x] Chrome / DOM / React は従来どおり TS のみ
- [x] 起動・初回コマンドが予算内；`verify` / `tsc` / `test` / `build` / Rust test 緑
- [x] README に境界図と開発手順（EN + JA）

---

## 14. プロンプト意味内容の正本 = Rust / TS = 描画ホスト + Chrome 執行器

### 14.1 境界

| 担当 | 責務 |
|------|------|
| **Rust（WASM）** | usage/error の **キー選択**、continuation **prefix**、不完全 `-setting` 計画、プロンプトに「何を出すか」の決定 |
| **TS** | `expand-msgs` / React 描画、opaque `UiAction` 適用、Chrome `handlers/effects/*` |
| **ホストのみ許容** | ピッカー開閉など **ライブ UI 状態**に依存する文言、Chrome 列挙データ、IME のフィルタ UX |

コマンド間連絡は閉じた語彙（`DispatchBundle` / `ListResult` / `bmxtRule` / exit status）。索引: `lib/features/command-line/inter-command/`。

```
Enter → ensureBmxtCore → WASM run
  → msgs (+ optional promptPrefix) | effects | ui
       msgs → TS expand-msgs → ログ描画 + promptPrefix なら setContinuationPrompt
       effects → Chrome 執行
       ui → applyUiAction（描画／状態適用のみ・文法再解釈しない）
```

### 14.2 Phase A — msgs + `promptPrefix`（Enter continuation）

- [x] `DispatchBundle::Msgs` に optional `promptPrefix`
- [x] `require_second_token` が欠けた第二トークンで msgs + `"{canonical} "`
- [x] Enter 経路から `continuationPromptAfterLoneFirstToken` 事後付与を削除
- [x] ホスト英語エラーを i18n キー化

### 14.3 Phase B — deep incomplete `-setting` を Rust 計画化

- [x] `tabs` / `dom` / `translate` の不完全チェーンは msgs + promptPrefix（または適用専用 UiAction）
- [x] `apply-ui-action` は不完全系の再パースをしない（適用のみ）
- [x] compound eligibility の parse-* 依存は Phase C で WASM 寄せ

### 14.4 Phase C — 補完候補コンテンツ

- [x] WASM `complete(line, cursor)`（第一〜第三固定トークン）
- [x] `ime-token-picker` のコマンド名分岐を縮小／廃止（固定トークンは WASM；ホストはライブオーバーレイのみ）
- [x] `bmxt-candidate.json` を runtime エンジンとして退役方針を確定（設計・検証カタログ + 任意ライブ provider；固定トークン正本は WASM `complete`）

### 14.5 Phase D — 残るキー選択の掃除

- [x] help セクションキー列を Rust から msgs で返す
- [x] browse / snapshot 等ホスト経路のキー選択を msgs（`expand-msgs`）に寄せる
- [x] grep: expand-msgs / codegen apply 以外でコマンド名からプロンプト文言を選んでいないこと（`prompt-key-sot.test.ts`）

---

## 15. サイト上フロート・プロンプト（実証）

既存ポップアップ窓はそのまま。サイト上に拡張ページ iframe のフロートを載せ、`BmxtTerminal` を見た目ラップで再利用する。セッションはホスト独立、コマンド履歴（`bmxt_cmd_history`）のみ共有。

### 15.0 方針

- 実行コア／シェル本体は再利用。フロートはホスト生命周期＋外観のみ
- CS → iframe（`bmxt-float.html`）→ 既存 `BmxtTerminal`
- ショートカット `toggle-bmxt-float`（既定 Shift+Alt+F）でアクティブタブをトグル
- `SESSION_CLEAR` は `host: popup | float | all`。ポップアップ閉鎖は float を消さない。`reset-bmxt` は両ホストクリア＋履歴クリア

### 15.1 WAR + フロート用エントリ

- [x] `entrypoints/bmxt-float/`（unlisted）+ `hostKind="float"`
- [x] `web_accessible_resources` に `bmxt-float.html`
- [x] フロート用薄いホスト／ページ CSS

### 15.2 ホスト独立（SESSION_CLEAR）

- [x] `SESSION_CLEAR` に `host` 付与
- [x] リスナーは自ホスト／`all` のみ反応
- [x] ポップアップ閉鎖 → `host: "popup"`；`reset-bmxt` → `host: "all"`
- [x] `BmxtTerminal` に `hostKind` props

### 15.3 CS ホストレイヤ + トグル

- [x] `lib/features/bmxt-float/`（メッセージ＋ DOM ホスト）
- [x] CS で iframe 表示／非表示（閉じても iframe は破棄せずセッション保持）
- [x] 非スクリプト可能 URL では no-op

### 15.4 ショートカット

- [x] `toggle-bmxt-float` + EN/JA `_locales`
- [x] SW → アクティブタブへ `TOGGLE_BMXT_FLOAT`
- [x] README shortcuts 一行追記

### 15.5 実証確認

- [ ] 両ホスト同時：履歴 ↑↓ 共有（ブラウザ手元スモーク）
- [ ] ポップアップ閉鎖後もフロートのログ残存（ブラウザ手元スモーク）
- [ ] ショートカットでトグル（ブラウザ手元スモーク）
- [ ] フロートから `help` 等の既存コマンド実行（ブラウザ手元スモーク）
- [x] `tsc` / `wxt build` 緑；`bmxt-host-kind` 単体テスト緑；成果物に `bmxt-float.html` + WAR + `toggle-bmxt-float`
### 15.6 既知・後回し

- nav フォーカスモデルの全面見直しは実証外
- 複数タブ同時フロート同期なし（アクティブタブのみ）
