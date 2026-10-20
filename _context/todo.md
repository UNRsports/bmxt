# BMXt — open work

Living checklist. Completed historical phases are summarized under **Archive** (not re-checked).

---

## Active

### 1. `| browse` pipe-only（実装済み — 手元スモーク）

**正規形:** `<list-command> | browse`（例: `tab -list | browse` · `setting -list | browse`）。

| 項目 | 内容 |
|------|------|
| プレフィックス | `browse <list>` は廃止。入力時は i18n でパイプ形へ案内 |
| 裸 `browse` | usage のみ（列は開かない） |
| plain `-list` | 対話 UI を起動しない。`setting -list` は読み取り専用一覧 + 案内 |
| 実装 | pipe consumer `browse`（`ListResult` + `openPickerFromListResult`） |

**手元スモーク**

- [ ] `tab -list` 候補から `| browse` を選べる（第三段に `-url` とパイプ継続）
- [ ] `tab -list` → 履歴で `| browse` 追記 → タブ列が開く
- [ ] `tab -list -url | browse` · `setting -list | browse` · `session -list | browse`
- [ ] `search -list foo | browse` · `dom -list --html | browse`
- [ ] プレフィックス `browse tab -list` がエラー案内になる
- [ ] 裸 `browse` が usage のみ

### 2. Open product

- [ ] **dom Enter** — ピッカー行 Enter の確定挙動（旧 §7）
- [ ] （任意）find/dom 系の `PickerListShell` 統合
- [ ] （任意）`TabPickerOverlay` リネーム掃除

### 3. Manual smoke backlog

実装は完了扱い。退行確認のみ。

| 領域 | 確認 |
|------|------|
| nav | HUD / 属性ジャンプ / typing · Alt ON/OFF |
| float | デュアルホスト・handoff・ショートカット |
| 独立動詞 | `back` / `forward` / `reload` / `close`（裸 + `tab -list \| …` + `#t:… \| …`） |
| `tab:` チップ | 複数選択 → パイプ |
| compound / pipe | `&&` `\|\|` `;` と `|` の併用・短絡 |
| list columns | tab / search / dom / setting / session |

### 4. Live reload（ページリロード非依存の CS）

**目標:** 導入〜ページ内実行〜拡張更新を、対象ページの再読み込みなしで完遂する。「リロードしないと動かない」誤解による離脱を防ぐ。

**方針（決定済み）**

| 項目 | 内容 |
|------|------|
| host | 必須 `host_permissions`: `https://*/*` のみ（`<all_urls>` / 平文 `http://*/*` にはしない。タブ open・履歴・BM の http URL は従来どおり） |
| 注入 | `ensurePageContentScript` + `onInstalled` で既存タブへ manifest CS を `executeScript({ files })` |
| CS | `bmxt-nav-overlay.content` を再注入時に冪等化（二重 listener / float 防止） |
| UX | `shell.reloadHint` / `error.reloadHint` をリロード誘導から具体失敗理由へ |
| 審査 | 外部通信なし + 横断ページ操作の正当性を justification に明記 |

**スコープ外（次フェーズ候補）**

- discarded（休止）タブの自動起こし — 権限では解けない。横断検索の完全性は別課題
- `<all_urls>` 化

**権限縮小・SW 区画（実装済み）**

- [x] ページ内操作を https のみ（`host_permissions` / CS / `isScriptablePageUrl`）
- [x] `RUN_CMD` / `NAV_CONTROL` は `bmxt.html` / `bmxt-float.html` のみ（`trusted-ui-sender`）

**実装チェック**

- [x] `wxt.config.ts`: https を必須 `host_permissions` へ
- [x] `lib/features/page-scripting/ensure-content-script.ts`（probe / inject / ensure / bulk reinject）
- [x] 呼び出し側で ensure リトライ: nav · float · dom · page-extract · search CS パス
- [x] `onInstalled`（install / update）で open tabs へ bulk reinject
- [x] content script 冪等化
- [x] i18n / optional-host 文言更新 / README 更新

**手元スモーク**

- [ ] 拡張をリロードしたあと、**ページ非リロード**で float / nav / `search -list --page` / `dom -list` が動く
- [ ] 二重注入しても overlay / float が二重にならない
- [ ] `chrome://` 等は従来どおり拒否

### 5. Chrome + Firefox 共有リポジトリ / マルチブラウザ試験

**目標:** 同一リポジトリで Chrome（現行）と Firefox 向けアドオンを並行開発し、可能な範囲でコマンド動作を自動化検証する。完全パリティは目指さず、**コアシェル＋主要コマンド**を共有、Chrome 専用機能は feature flag で分岐する。

**前提（調査済み・決定方針）**

| 項目 | 内容 |
|------|------|
| ビルド | WXT 0.20.7 は `-b firefox` 可。現状は `chrome-mv3` のみ。dual target + `browser_specific_settings.gecko` |
| IR | `HostEffect` / `applyHostEffects` / `DispatchHostContext` へリネーム済み（ワイヤー `kind` は不変） |
| 共有 | `lib/features/*` + Rust/WASM コアはブラウザ非依存。ホスト API はアダプタ層へ集約 |
| パリティ外（初期） | Chrome Translator（`translate`）、File System Access（外部設定 / vault）、Chrome Favicon API |
| e2e | Playwright は **Chromium 拡張ロードのみ**公式対応。Firefox 拡張は同一スイート不可 → 別ハーネス |
| WXT FF MV3 dev | zip/build は可。公式 runner の Firefox MV3 **dev** は制限あり（アンパック手動ロード等） |

#### 5.1 命名・境界の整理（基盤）

- [x] コア IR の Chrome 由来名を汎用化（`HostEffect` 系）
- [x] `check:generated` を git 非依存化（`git add` 前に `verify` 可能）
- [ ] ホスト境界ドキュメント（README / skill）: 「コア = HostEffect」「実装 = `chrome.*` / 将来 `browser.*`」
- [ ] （任意）コメント・パス名の残り掃除は UI chrome（`side-picker/chrome/`）や実 API ラッパと混同しない範囲に限定

#### 5.2 ブラウザランタイムアダプタ

- [ ] `trusted-ui-sender`: `chrome-extension:` に加え `moz-extension:` を許可（同一拡張 origin）
- [ ] 拡張 URL / protocol ヘルパ（BMXt ページ・e2e の `chrome-extension://` 仮定を抽象化）
- [ ] （任意）`webextension-polyfill` または薄い `browser` 名前空間ラッパ — 全面置換は必須としない
- [ ] `import.meta.env.BROWSER` / ビルドターゲット別の feature flags

#### 5.3 Firefox ビルド・マニフェスト

- [ ] `wxt` / `package` に Firefox ターゲット（`firefox-mv3`、`gecko.id`、AMO 用メタ）
- [ ] permissions 差分: `favicon` 削除または無視、`commands.*.global` は FF 非対応を文書化
- [ ] host permissions UX（ユーザー取り消し）を前提にした ensure CS / エラー文言
- [ ] 最低 Firefox 版の方針（例: `tabGroups` 利用なら FF ≥139、未満は `group` 劣化）
- [ ] 出力: `.output/firefox-mv3` + zip。submit ワークフローは Chrome と分離または matrix
- [ ] 手元: アンパック読み込み手順（WXT FF MV3 dev 制限の回避）

#### 5.4 機能フラグ（Chrome 専用の切り分け）

- [ ] `translate` — FF では未対応メッセージ / コマンド非表示 or stub
- [ ] 設定・snapshot の外部保存（FSA）— FF は internal `storage` のみ
- [ ] favicon — `tab.favIconUrl` 等へフォールバック
- [ ] コアコマンド（tab / search / dom / nav / session / setting internal / back·forward·reload·close 等）の FF スモーク一覧を定義

#### 5.5 e2e — Chromium（現行 Playwright の拡張）

**方針:** 実拡張ロード（`.output/chrome-mv3`）を維持し、プロンプト IME 以外へコマンド経路を厚くする。

- [ ] フィクスチャ: タブ / ウィンドウ /（可能なら）グループ・履歴のシード
- [ ] ヘルパ: プロンプト入力 → Enter → ログ行 + ブラウザ状態アサート
- [ ] コマンド行列（manifest の first コマンド＋主要 subcommand）。Chrome 専用は skip タグ
- [ ] CI 時間・headed 制約の見積り（workers=1 維持可否）
- [ ] （任意）effect / UiAction 単位のスモークと、フルコマンド行列の段階導入

#### 5.6 e2e — Firefox（別ハーネス）

**方針:** Playwright 公式の Firefox 拡張サポートは使わない。Chromium スイートと **同一ファイルに無理に載せない**。

- [ ] ランナー選定（候補: `web-ext` + Marionette/Selenium、または一時アドオンインストール系の薄いラッパ）
- [ ] `firefox-mv3` 成果物 + 固定 `gecko.id` で一時インストール
- [ ] 拡張ページ（`moz-extension://…/bmxt.html`）駆動、またはページ副作用のみのブラックボックス
- [ ] 5.4 の skip（Translator / FSA / favicon 断言）を共通タグ設計で共有
- [ ] CI: 任意ジョブまたは nightly（初期は手動でも可）

#### 5.7 推奨実施順（マイルストーン）

| 順 | マイルストーン | 完了の目安 |
|----|----------------|------------|
| 1 | 5.1 残り + 5.2 の trust / URL | Chrome 既存挙動を壊さず FF メッセージ経路が理論上通る |
| 2 | 5.3 で FF パッケージがビルドできる | アンパックで BMXt ウィンドウが開く（主要コマンドは手確認） |
| 3 | 5.4 で専用機能を隔離 | コアコマンドの FF 手動スモーク表を消化 |
| 4 | 5.5 で Chromium コマンド e2e を段階追加 | CI で回帰の網が広がる |
| 5 | 5.6 で FF スモークハーネス | 「両ブラウザ」は別ジョブとして並立 |

**非目標（明示）**

- Playwright 一本で Chrome + Firefox 拡張の全コマンドを同一スイート実行すること
- 初回リリースでの Translator / FSA / Favicon API の Firefox 完全同等実装
- WXT 公式 FF MV3 dev 体験の Chrome と完全同一化（制限は手順で吸収）

---

## Archive（ポインタのみ）

| 旧節 | 要約 |
|------|------|
| §1–7 | side-picker 再構成 → `lib/features/side-picker/` |
| §8–9 | `ListResult` / `-list` レジストリ（`--picker` は廃止済み） |
| §10 | BMXt POSIX Profile（README 公開・conformance テスト） |
| §11 | 旧プレフィックス `picker`/`browse <list>` 時代。**`| browse` に置換**（本 Active 1） |
| §12 | nav インクリメンタル — 実装済・スモークは Active 3 |
| §13–14 | WASM prompt / complete SoT |
| §15 | float ホスト — 実装済・スモークは Active 3 |
| §16 | `tab -back` 等 → **§18 で独立 first に置換済み** |
| §17 | Host IR bmxt-host/2（当時 Phases A–E・完了） |
| §18–19 | `back`/`forward`/`reload`/`close` + `tab:` チップ — 実装済・スモークは Active 3 |

**語彙索引:** `lib/features/command-line/inter-command/` · `manifest/templates/` · README アーキテクチャ節。
