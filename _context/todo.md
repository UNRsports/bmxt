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

- [x] host `wxt.config` / `hosts/create-host-wxt-config.ts`: https を必須 `host_permissions` へ
- [x] `shared/lib/features/page-scripting/ensure-content-script.ts`（probe / inject / ensure / bulk reinject）
- [x] 呼び出し側で ensure リトライ: nav · float · dom · page-extract · search CS パス
- [x] `onInstalled`（install / update）で open tabs へ bulk reinject
- [x] content script 冪等化
- [x] i18n / optional-host 文言更新 / README 更新

**手元スモーク**

- [ ] 拡張をリロードしたあと、**ページ非リロード**で float / nav / `search -list --page` / `dom -list` が動く
- [ ] 二重注入しても overlay / float が二重にならない
- [ ] `chrome://` 等は従来どおり拒否

### E. Chrome + Firefox 共有リポジトリ（§5.3–5.6 — 実装済み）

| 項目 | 状態 |
|------|------|
| レイアウト | `shared/` + `hosts/chrome/` + `hosts/firefox/` |
| ビルド | `pnpm run build` → 両方 · `build:chrome` / `build:firefox` → 単体 |
| AMO | `hosts/firefox/AMO_SOURCE.md` · `pnpm run package:firefox` → `*-firefox-sources.tar.gz` |
| IR | `HostEffect` / `applyHostEffects`（ワイヤー `kind` 不変） |
| e2e | WebDriver 統一（`test:e2e:chrome` / `test:e2e:firefox`）。Playwright は廃止 |
| 残 | 手元で FF アンパック窓スモーク · §5.4 専用機能隔離の仕上げ |

- [x] Chromium / Firefox 共有 WebDriver E2E（command smoke · prompt integrity · CJK）
- [x] `tutorial` コマンド + コーチ UI（edit20261019 からマージ）
- [ ] Firefox: `about:debugging` で窓起動 + 主要コアコマンド手確認
- [ ] （次）Translator / FSA / favicon を Chrome 側へ隔離（フラグ）

### 5. webXdriver — Chromium + Gecko 拡張 E2E ハーネス

**判定（2026-10）:** ライフサイクル層を **[webxdriver](https://github.com/UNRsports/webxdriver)** へ切り出し（public）。BMXt は thin wrapper で消費。

| 項目 | 内容 |
|------|------|
| 公開コア | `launchExtensionSession` · origin 解決 · `openExtensionPage` / reload · CFT 固定 · Firefox chrome-context · プロファイル／リトライ · peer `selenium-webdriver` |
| BMXt に残す | `.bmxt-*` プロンプト／チュートリアル／ログ assert · `BMXT_E2E_*` · `.output/{chrome,firefox}-mv3` パス |
| BMXt 側 | `tests/e2e/harness.ts` が webxdriver + `openBmxtPage` 等 |
| 残 | npm `0.1.0` 公開（当面は GitHub 依存）· fixture e2e · BMXt verify 受け入れ確認 |

- [x] ライフサイクル層を独立リポ（webxdriver）へ切り出し／public
- [x] BMXt `harness.ts` を薄くして webxdriver を消費

### 6. ローカル同期（同一 PC → 同一 LAN · Family）

**目標:** 各ブラウザにユニークな device ID を付け、同一 Family 内の構成員同士で UI 設定・永続プリファレンス・スナップショットを揃え、将来は Family 内横断検索の土台にする。データの預かり先（Google Drive 等）は使わない。第三者サーバなし（同一 PC / 同一 LAN）。

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| 信頼圏 | **Family**（共有シード／招待。Brave Sync Chain と同型）。メンバーだけが平文を持つ |
| 識別 | ブラウザ／プロファイルごとに **ユニーク device ID** + 表示名。接続・名簿・衝突解決のキー |
| 既定 | ローカルのみ。`connect-src 'self'` / `check:no-fetch` / Firefox `data_collection_permissions: none` を維持 |
| 除外 | **Google Drive（有料オプション構想も含め本フェーズ対象外）**。インターネット越しの預かり／公開 relay も対象外 |
| 将来像（仕様上の視野） | スマホ BMXt は窓口、PC がハブ／索引。USB・Bluetooth は拡張単体では非現実的 → 必要なら後続でネイティブ補助 |

**輸送（段階）**

| 段 | 範囲 | 手段 | manifest |
|----|------|------|----------|
| **6a（先）** | 同一 PC · Chrome ↔ Firefox | FSA 共有作業ディレクトリを正本 | ネットワーク権限追加なし |
| **6b（続いて）** | 同一 LAN · Family メンバー | device ID で発見・接続（手動／QR で LAN アドレス交換、または PC ハブ名簿）。直結のみ。公開 STUN/relay に依存しない | LAN 向けに必要最小の接続先のみ検討。外部送信なしを維持できる設計を優先。難しければ 6a 完成を優先し 6b を縮小 |

**正本・ペイロード**

- 既存 UI settings bundle（`settings.json` + 画像）を拡張し、prefs allowlist + snapshot 索引/本文を同レイアウト系で扱う
- prefs allowlist: `bmxt_cmd_history` · MRU · picker settings · translate · nav learned · tutorial 等。windowId / session / bounds は除外
- snapshot 容量は既存 `MAX_SNAPSHOT_*` を enforce
- 名簿メタ: `deviceId` · 表示名 · Family 所属 · 最終更新（共有ディレクトリまたは LAN 名簿）
- 衝突: 簡易 LWW（updatedAt + deviceId）+ 必要ならロックファイル

**横断検索（仕様視野 · 6 では土台まで）**

- Family 内の任意メンバーの BMXt から、他メンバーのデータをキー（device ID）で参照し横断検索する構想
- 6a/6b では同期と名簿を先行。クエリ分散／ハブ索引の本実装は土台 API が揃ってから

**コマンド**

- `sync` first（例: `-status` / `-dir` / `-pair` / `-members` / `-pull` / `-push` / `-pause`）
- skill `bmxt-add-command` + i18n EN/JA

**スコープ外**

- Google Drive / OAuth / `identity` / 有料クラウドオプション
- インターネット越し P2P（公開 circuit relay · TURN 前提）
- USB / Bluetooth 輸送（ブラウザ拡張単体）
- torrent を同期本線にすること

**実装チェック**

- [ ] device ID 生成・永続・表示名
- [ ] Family 作成／参加（シードまたは招待）の最小モデル
- [ ] `shared/lib/features/sync/`（または setting 延長）に同期モジュール
- [ ] **6a:** 作業ディレクトリ選択・永続（`settings-handle-db` 流用可）· collect/apply · 衝突処理 · 単体テスト
- [ ] **6a:** 同一フォルダを Chrome / Firefox 双方で選び相互反映（手元）
- [ ] **6b:** LAN 内で device ID によりメンバー発見→接続する仕様確定（QR／手入力を初期案）。実装または明示的延期
- [ ] `sync` コマンド + i18n + README（EN/JA）。Drive 非対応・ローカル／LAN 限定を明記

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

**語彙索引:** `shared/lib/features/command-line/inter-command/` · `shared/manifest/templates/` · README アーキテクチャ節 · `hosts/README.md`。
