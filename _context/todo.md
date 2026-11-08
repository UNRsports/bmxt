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

### 6. ローカル同期（同一 PC → 同一 LAN · Family · コマンドバス）

**目標:** 各ブラウザにユニークな device ID を付け、同一 Family 内の構成員同士で UI 設定・永続プリファレンス・スナップショットを揃える。続けて低遅延の遠隔コマンドバスを載せ、将来は tab picker の移動先に Family メンバーを出し、横断検索・遠隔グループ open の土台にする。平文の預かり先は作らない（ゼロ custody）。

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| 信頼圏 | **Family**（共有シード／招待。Brave Sync Chain と同型）。メンバーだけが平文を持つ |
| 識別 | ブラウザ／プロファイルごとに **ユニーク device ID** + 表示名。接続・名簿・衝突解決・遠隔宛先のキー |
| 既定 | ローカル本線（WebRTC DataChannel + コピペ握手）。`connect-src 'self'` / `check:no-fetch` / Firefox `data_collection_permissions: none` を維持 |
| 制御面 | native messaging ホストは使わない。低遅延は **WebRTC DataChannel**（握手は Family 封印テキストコード） |
| Drive / FSA | **同期本線から外す。** Firefox が FSA ピッカー非対応のため、作業ディレクトリ共有は廃止 |
| 将来像（仕様上の視野） | スマホ BMXt は窓口、PC がハブ／索引。USB・Bluetooth は拡張単体では非現実的 → 必要なら後続でネイティブ補助 |

**輸送（段階）**

| 段 | 範囲 | 手段 | manifest |
|----|------|------|----------|
| **6a（改）** | 同一 PC · Chrome ↔ Firefox | Family 招待（`-pair`）+ 名簿（`chrome.storage`） | ネットワーク権限追加なし |
| **6b（続いて）** | 同一 LAN · Family メンバー | device ID で発見（手動／QR、または PC ハブ名簿）。直結優先。公開 STUN/relay に依存しない | 必要最小のみ検討 |
| **6c** | 同一 PC（→ LAN／遠隔へ拡張可） | **コピペ握手 + WebRTC DataChannel**（host ICE のみ） | 外部送信なしを維持 |

**6c: コピペ握手 + WebRTC コマンドバス**

| 項目 | 内容 |
|------|------|
| 原理 | 名刺（SDP offer/answer · ICE 同梱）を Family 封印テキストコードでコピペ交換し、会話本体は Peer 間 DataChannel |
| 握手 UX | 推奨: ウィザード `sync -setup` / `sync -connect`（Family → 役割 → COPY / 貼付）。手動 CLI も可。設定 picker は案内のみ（貼付しない） |
| データ面 | WebRTC DataChannel（遠隔コマンド · ack · 将来の横断クエリ） |
| peer 宿主 | Chrome: offscreen document。Firefox: 拡張ページ（BMXt 窓または専用 peer ページ）。SW 単体では不可 |
| 相手休眠時 | DataChannel 不可 → メモリキューのみ（永続箱なし）。双方オンライン時に再握手 |
| UX 視野 | `tab` picker の移動先に Family メンバー（例: firefox@desk） |
| 非目標（6c） | native messaging、FSA 作業ディレクトリ、torrent 本線、常時 TURN |

**名簿・将来の prefs**

- 名簿: `chrome.storage.local`（FSA `roster.json` は廃止）
- prefs / snapshot の横断 LWW は後続（DataChannel 上で転送する構想）

**いま接続後にできること（6c 初期）**

| 面 | 内容 |
|----|------|
| ピア間 | `sync -ping <deviceId>` · `sync -open <deviceId> <url…> [--group <title>]` |
| ローカル | `sync -status` / `-members` / `-pair` / `-setup` / `-connect` · setting picker の表示名 |
| ピア横断（一覧） | `tab -list` / `search -list` の `--device <id>` / `--peers` · `tab -list \| sync -open <id>`（コピー） |
| ピア横断（操作） | `tab -list --peers\|--device … \| browse` → remote 行の移動・閉じる・Enter・reload（`tabs_ops`）。グループ作成／新窓は未対応 |
| 接続 UI | プロンプト下の接続ピア名ステータス行 · トンネル開通中は双方「接続中...」＋入力ロック |
| 再握手 | `sync -connect <deviceId>`（役割自動）+ ウィザード COPY／貼付（`sync-handshake-copy`） |
| 未実装 | prefs/snapshot 自動同期 · tab picker の Family 宛先 UI · リモート group/new-window |

**横断 tab / search（実装方針・確認済み）**

- **同一 PC · Chrome ↔ Firefox:** コマンドバス RPC（`tabs_list` / `search_query` / **`tabs_ops`** / `open_tabs`）。Firebase / STUN / TURN は不要
- 各側は自ブラウザ API のみ実行し、結果・操作を DataChannel で返す（Chrome が Firefox タブを直接は読めない）
- **別 PC・別ネット:** DataChannel 本線を維持するなら大枠は **シグナリング（Firebase 等）+ WebRTC（STUN、不通時 TURN）**。Drive は握手の置き手紙には使えるがコマンド本線向きではない
- Drive / Firebase の製品採用は未決定（§6 本体では Drive OAuth・常時 TURN はスコープ外のまま）

**コマンド**

- `sync` first（`-setup` / `-status` / `-pair` / `-members` / `-connect` / `-offer` / `-answer` / `-accept` / `-ping` / `-open`）
- 握手 UX: 初回 `sync -setup`；切断後 `sync -connect`。専用ウィザード（`shared/lib/features/sync/wizard/`）で COPY / 貼付。ログ全文選択は本線にしない。ショートカット `sync-handshake-copy` はウィザード／バーから利用
- 接続表示: `shared/lib/features/sync/link/`（ステータス行 · connecting ロック）
- skill `bmxt-add-command` + i18n EN/JA

**スコープ外（§6 本体）**

- FSA 作業ディレクトリ同期
- Drive OAuth / ストア提出 / 課金
- インターネット越しで常時 TURN／公開 circuit relay 前提の運用
- USB / Bluetooth 輸送（ブラウザ拡張単体）
- torrent を同期／コマンド本線にすること
- native messaging ホスト

**実装チェック**

- [x] device ID 生成・永続・表示名
- [x] Family 作成／参加（シードまたは招待）の最小モデル
- [x] `shared/lib/features/sync/`（スタビライザー境界）に同期モジュール
- [x] **FSA 同期削除**（workdir / signaling box / pull-push-pause）
- [x] **6c:** コピペ握手（`bmxt-rtc1.` Family 封印）+ WebRTC DataChannel（host ICE）
- [x] **6c:** peer 宿主（Chrome offscreen / Firefox `bmxt-peer.html`）+ ping / open
- [x] **6c:** `sync -setup` ウィザード（Family → 役割 → COPY / 貼付）。accept 成功は握手完了（直後 ping 失敗でもセットアップ終了）
- [x] **6c:** `sync -connect <deviceId>`（役割自動）+ ウィザード COPY／貼付（`sync-handshake-copy`）
- [x] **6c:** 接続中ピア名ステータス行 + トンネル開通中「接続中...」入力ロック（双方）
- [ ] **6c:** 手元 — 同一 PC で Chrome↔Firefox に遠隔 open / ping が安定して届く（`-connect` 往復含む）
- [x] **6c:** 同一 PC 横断 `tab` / `search`（コマンドバス RPC · `--device` / `--peers`）
- [x] **6c:** `tab -list \| sync -open <deviceId>` グループ単位コピー送信
- [x] **6c:** 横断 tab picker 操作（`tabs_ops` · move/close/activate/reload）。remote group/new-window は未対応
- [ ] **手元:** `tab -list --peers` · `search -list --peers` · `| sync -open` · `--peers \| browse` 操作を Chrome↔Firefox で確認
- [x] `sync` コマンド + i18n。既定はローカル WebRTC

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
