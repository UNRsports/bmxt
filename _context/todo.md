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

- [x] **dom Enter** — ピッカー行 Enter → `jump …` を `submitConstructedLine`（§7c）
- [ ] （任意）find/dom 系の `PickerListShell` 統合
- [ ] （任意）`TabPickerOverlay` リネーム掃除
- [x] ウェルカムにサポートリンク（公式サイト · NotebookLM）— `lib/features/support/` · README（version-upgrade-banner 節）反映

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
| support links | 空ログのウェルカムに公式サイト / NotebookLM 表示名が出る · クリックで通常タブ（BMXt 窓外）· URL 文字列は出さない |

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
| peer 宿主 | **BMXt プロンプト窓のみ**（Chrome/Firefox 共通）。offscreen / 専用 peer タブは使わない。SW 単体では不可。窓を閉じる／明示再握手までトンネル堅持 |
| メッシュ | 手動握手は誰か1台とだけで可。直結後に `mesh_peers` / `mesh_signal` で兄弟直結を自動補完（タブ操作はハブ中継しない） |
| 相手休眠時 | DataChannel 不可 → メモリキューのみ（永続箱なし）。双方オンライン時に再握手 |
| UX 視野 | `tab` picker `:move` 宛先に Family メンバー（例: firefox@desk）。既定 copy、`move --close` で移動相当 |
| 非目標（6c） | native messaging、FSA 作業ディレクトリ、torrent 本線、常時 TURN |

**名簿・将来の prefs**

- 名簿: `chrome.storage.local`（FSA `roster.json` は廃止）
- prefs / snapshot の横断 LWW は後続（DataChannel 上で転送する構想）

**いま接続後にできること（6c 初期）**

| 面 | 内容 |
|----|------|
| ピア間 | `sync -ping <deviceId>`（接続確認）。タブ送信は `tab -send` |
| ローカル | `sync -status` / `-members` / `-pair` / `-setup` / `-connect` · setting picker の表示名 |
| ピア横断（一覧） | `tab -list` / `search -list` の `--device <id>` / `--peers` · `tab -list \| tab -send <id>`（コピー） · `| tab -send <id> --close` |
| ピア横断（操作） | `tab -list --peers\|--device … \| browse` → remote 行の移動・閉じる・Enter・reload（`tabs_ops`）。グループ作成／新窓は未対応 |
| Family 送信 | `tab -send` · picker `:move` でリモート窓／タブ／グループ宛（既定 copy、`move --close`） |
| Family 一覧追従 | `tabs_changed` 广播。ペイロード: `first`（第一コマンド選別符号・現状 `"tab"`；欠落は `"tab"`）+ `reason`（`open_tabs` / `tabs_ops` / `local_close`）。接続中 A/B/C へ配信し、符号一致の開中 picker のみ再取得（未接続は対象外） |
| 接続 UI | プロンプト下の接続ピア名ステータス行 · トンネル開通中は双方「接続中...」＋入力ロック |
| 再握手 | `sync -connect <deviceId>`（役割自動）+ ウィザード COPY／貼付 |
| 未実装 | prefs/snapshot 自動同期 · リモート group/new-window |

**横断 tab / search（実装方針・確認済み）**

- **同一 PC · Chrome ↔ Firefox:** コマンドバス RPC（`tabs_list` / `search_query` / **`tabs_ops`** / `open_tabs`）+ 在庫変更广播 **`tabs_changed`**（`first` / `reason`）。Firebase / STUN / TURN は不要
- 各側は自ブラウザ API のみ実行し、結果・操作を DataChannel で返す（Chrome が Firefox タブを直接は読めない）
- **一覧追従:** 送信成功／受信適用／`--close` 後に接続中ピアへ `tabs_changed`。購読側は `first` で機械選別（tab picker は `"tab"` のみ）
- **別 PC・別ネット:** DataChannel 本線を維持するなら大枠は **シグナリング（Firebase 等）+ WebRTC（STUN、不通時 TURN）**。Drive は握手の置き手紙には使えるがコマンド本線向きではない
- Drive / Firebase の製品採用は未決定（§6 本体では Drive OAuth・常時 TURN はスコープ外のまま）

**コマンド**

- `sync` first（`-setup` / `-status` / `-pair` / `-members` / `-connect` / `-offer` / `-answer` / `-accept` / `-ping`）。タブ送信は `tab -send`（旧 `sync -open` は廃止）
- 握手 UX: 初回 `sync -setup`；切断後 `sync -connect`。専用ウィザード（`shared/lib/features/sync/wizard/`）で COPY / 貼付。ログ全文選択は本線にしない。握手完了でウィザード自動クローズ
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
- [x] **6c:** peer 宿主（プロンプト窓一本化）+ ping / open
- [x] **6c:** `sync -setup` ウィザード（Family → 役割 → COPY / 貼付）。accept 成功は握手完了（直後 ping 失敗でもセットアップ終了）
- [x] **6c:** `sync -connect <deviceId>`（役割自動）+ ウィザード COPY／貼付
- [x] **6c:** 接続中ピア名ステータス行 + トンネル開通中「接続中...」入力ロック（双方）
- [ ] **6c:** 手元 — 同一 PC で Chrome↔Firefox に遠隔 open / ping が安定して届く（`-connect` 往復含む）
- [x] **6c:** 同一 PC 横断 `tab` / `search`（コマンドバス RPC · `--device` / `--peers`）
- [x] **6c:** `tab -send` / `tab -list \| tab -send <deviceId>` グループ単位コピー送信（`sync -open` 廃止）
- [x] **6c:** 横断 tab picker 操作（`tabs_ops` · move/close/activate/reload）。remote group/new-window は未対応
- [x] **6c:** picker `:move` でリモート窓宛 Family 送信（copy 既定 / `move --close`；短縮 `m` なし）
- [x] **6c:** Family `tabs_changed` 广播（`first` 第一コマンド符号 + `reason`）→ 接続メンバーの該当開中 picker を再取得
- [ ] **手元:** `tab -list --peers` · `search -list --peers` · `| tab -send` / `--close` · `--peers \| browse` · picker リモート窓宛 · `tabs_changed` 追従を Chrome↔Firefox で確認
- [x] `sync` コマンド + i18n。既定はローカル WebRTC（接続設定のみ）

**6c 続: 握手 UX 手間削減（方針・実装済み／手元確認残り）**

目的は無操作ではない。**現行のコピペ往復より体感手間を減らす**こと（同一 PC · Chrome ↔ Firefox）。

握手輸送は `shared/lib/features/sync/handshake/` に分割（各ディレクトリを独立に廃止可能）:

| ディレクトリ | 役割 |
|------|------|
| `handshake/common/` | 封印 codec · connect pending（両輸送の前提） |
| `handshake/clipboard/` | COPY バー · テキスト貼付パース · ウィザード COPY |
| `handshake/file/` | チケット JSON（`…-invite|offer|answer.json`）· 保存／開く UI |

ウィザード本体（`sync/wizard/`）はオーケストレーションのみ。旧パス（`discovery/rtc-handshake-*` · `connect/sync-handshake-*` · `connect/sync-connect-pending`）は薄い re-export シム。

| 項目 | 内容 |
|------|------|
| 情報下限 | Non-Trickle 済み。渡す実体は **offer 1 + answer 1**。ICE の第 3 往復は不要。減らせるのは長い文字列の選択・コピー・貼付コスト |
| 現行 COPY | 全文選択不要（`handshake/clipboard/sync-handshake-actions.ts`）。残るのはブラウザ切替＋貼付 |
| 手動 1 接続 | ハブが offer を COPY → 新規が貼付、新規が answer を COPY → ハブが貼付（**2 往復**）。「3 往復」は Trickle 前提の旧イメージで現行プロトコルとは不一致 |
| 兄弟直結 | `mesh_peers` / `mesh_signal` 自動補完。追加コピペ **0 回**（DataChannel 上で SDP+ICE をハブ経由リレー） |
| 6 台メッシュ | 星型で手動 **5 セット**（各新規↔ハブ）。フルメッシュ残りは自動。1 つの offer ファイルを 5 台が読んで全員接続、は **不可**（SDP は 1 `RTCPeerConnection` に束縛） |

**ファイル輸送（実装済み）:** ウィザードに「ファイルで渡す」を clipboard と併存。

- 保存: blob download で `bmxt-YYYYMMDD-HHMMSS-{invite|offer|answer}.json`（招待は `bmxt1.*`、握手は封印 `bmxt-rtc1.*`。時刻付きで整列しやすい）
- 読み込み: `<input type="file" accept="application/json,.json">`（Firefox 可。`showOpenFilePicker` 非依存）
- clipboard COPY／貼付は残す。追加権限なし（`downloads` / 新規 FSA ディレクトリは不要）

**採らない案**

- Downloads 無操作監視／自動 answer 書き出し（非対称・`downloads` 権限・FSA 初回許可・ファイル名衝突。手間削減に必須でない）
- FSA signaling box の復活（6c 非目標。Firefox がディレクトリ監視不可）
- 開始ブラウザの **1 ファイル**を残り N 台が読むだけの一括接続（WebRTC 制約）

**一括へ寄せる将来案（別タスク・未採択）**

| 案 | 内容 | 限界 |
|----|------|------|
| ハブが N 個の offer をまとめたバンドルを配る | 各参加者が自分用スロットの answer を返す | なお N 本の answer 回収が必要。1 ファイル読込だけでは不足 |
| 既存 DataChannel 経由の `mesh_signal` のみ | 既に実装済み | 最初のエッジは手動が必要 |
| 外部シグナリングサーバ | 真の一括 join | zero-custody / no-fetch 方針と相反 |

ファイル I/O 改善は **1 回の手動握手の体感**を軽くするもので、**手動回数の下限（新規台数）は変えられない**。

- [x] **6c UX:** ウィザードに handshake ファイル保存（blob download）と読み込み（`input type=file`）を追加し clipboard と併存
- [x] **6c UX:** 握手輸送を `handshake/{common,clipboard,file}` に分割（廃止可能な境界）
- [ ] **6c UX:** Chrome ↔ Firefox でファイル保存→読込だけで握手完了できることを確認（clipboard 経路も維持）
- [x] **回帰防止:** `#t:… | tab -send` 契約テスト（空 URL page.open 禁止・tabs.get 解決）

### 7. Picker = コマンド構築 UI（CUI 同等化）

**目標:** search / DOM / session / setting（および tab の残ギャップ）を、**typed コマンド／パイプだけで picker と同等に操作できる**ようにする。picker は GUI として「ユーザに代わってコマンド構文やパイプを組み立て、`submitLine` / `runDispatch` に再入場する」存在に揃え、Chrome／host API の直実行を持たない。

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| 意味論・副作用 | コマンド／パイプのみが実行する（閉じた語彙: `ListResult` → `bmxtRule` → pipe consumer / `HostEffect` / `UiAction`） |
| picker | 同じ行を組み立てて `submitLine` するだけ。並列の実行 API を増やさない |
| `\| browse` | GUI 入口として残す（消さない）。plain `-list` は従来どおりターミナル |
| FSA／ファイル選択 | コマンドが chooser を起動するところまでが上限（ジェスチャ必須。型打ちだけでディレクトリは選べない） |

**安全な進行順（必須）**

1. **新コマンドで同等操作を先に用意**（pipe consumer / subcommand。既存 picker 直実行は触らない）
2. **同じ入力で CUI と picker の結果を突き合わせ**（観測可能な副作用・ログ・フォーカス）
3. **一致を確認してから** picker Enter を `submitLine` に切替
4. **直実行を削除**（二重経路を残さない）

**進めないこと:** コマンド面が揃う前に picker 直実行を消す／置き換える。

**family ギャップ（作用 → 想定 surface）**

| Family | CUI 現状 | 不足（例） | 備考 |
|--------|----------|------------|------|
| **session** | `-switch` / `-next` / `-prev` / `-new` / `-setting-name` あり | list Enter → `session -switch <name>` の `submitLine` 再入場 | 最も近い。雛形 |
| **search** | `-list` + `\| open` / `\| jump` + `--into-window` / `--into-group` | （残任意なし・本線完了） | picker Enter は同形行を submit |
| **dom** | `-list`・`-setting` は CUI 可 | `dom -list … \| jump`（`dom.node` path） | jump / link activate が picker 直実行 |
| **setting** | `-list` 読み取り専用 | `setting -set …` + `-save` / `-cancel` | 現状 UI 編集が本線（README）。FSA はジェスチャ上限 |
| **tab**（参考） | close / reload / nav / `#t:` / `move` / `new-window` / `group add` パイプ可 | `:edit` / plain Enter focus 等（任意） | 7e で bulk 本線は CUI 化済み |

**実装チェック（段階）**

- [x] **7a 追加:** `open` / `jump` pipe consumer + first command。setting `-set`/`-save`/`-cancel`（UiAction）
- [x] **7a:** search `\| open` / `\| jump` · dom `\| jump` · setting `-set`/`-save`/`-cancel`
- [x] **7b 突合:** session / search open·jump / dom jump / setting save·cancel は同一コマンド面（picker は行組み立てのみ）
- [x] **7c 切替:** session / search / dom / setting(save·cancel) Enter → `submitConstructedLine` → `submitLine`
- [x] **7d 削除:** search Enter の `openSearchPickerEntry` 直呼びを除去。dom/setting も submit 経路へ。`map_command.csv` / i18n 更新
- [x] **7e:** tab bulk（`move` / `group add` / `new-window`）+ search destination（`open --into-window` / `--into-group`）。picker は `submitConstructedLine`。`:edit` / plain Enter focus は任意後続

**手元スモーク（7c 以降）**

- [ ] 各 family: plain `-list` と `… \| browse` の入口が従来どおり
- [ ] 同じ作用を typed のみ / picker Enter のみで実行し、結果が一致する
- [ ] picker 操作後に history / ログへ想定どおりコマンド行が残る（方針どおり）
- [ ] 直実行モジュールに残存呼び出しがない（grep / テスト）

**参照:** 本会話の整理 · `shared/lib/features/command-line/inter-command/` · `shared/lib/features/picker/open-from-list-result.ts` · pipe consumers（`browse` / `close` 等）· skill `bmxt-add-command`

### 8. Host-blind 徹底（Rust=判定 / TS=表示専門）

**設計 SoT:** `_context/map_command.csv` · `inter-command/vocabulary.ts`（bmxt-host/2）· `verify:host-blind`。  
**意図:** Rust がコマンド意味論（成否・usage・plan）、TS は paint / Chrome effects / opaque UiAction / i18n expand のみ。

**きっかけ（観測）**

- `tab -list --device | browse`（`--device` に id 無し）が本物の usage ではなく `pipe.error.notProducer` に化けた
- 原因: WASM `msgs`→`lines` を TS が無条件成功扱い → パイプ左辺 stdout 抑制 → stream 無しで notProducer
- 暫定修正済み: `segmentOutcomeFromLines`（表示行の `error:` / `usage:` スクレイプ）。**設計復帰ではない**（Phase 1 で撤去対象）

**現状のズレ（規模感）**

| カテゴリ | 規模感 | 代表 |
|---------|--------|------|
| A. 一覧文法の二重パース | ~700 LOC / ~11 modules | `tabs-list-parse.ts` · `search-list-parse.ts` · `list-commands/registry.ts`（Rust `cmd/*.rs` と二重） |
| B. パイプ RHS トークン文法 | ~590 LOC / ~13 modules | `pipe/consumers/*-match.ts` |
| C. 表示文字列からの成否判定 | ~280 LOC / 系統的 | `classify-outcome.ts` · `apply-segment-bundle.ts` |
| D. シェル対話パーサ混在 | ~560 LOC / 要選別 | `*-setting` / exit-list / nav 等 |

`verify:host-blind` は list パーサを allowlist しており、パイプ matcher・行スクレイプはほぼ未監視。

**ホストに残してよいもの:** UiAction/effect の kind 実行、Chrome API、i18n expand、ListResult 取得・整形、実行時失敗（タブ API / WebRTC / cancel）。

**進め方（パーサ削除を IR 拡張より先にしない）**

| Phase | 内容 | 工数 |
|-------|------|------|
| **1** | `DispatchBundle` に計画時 `exitStatus`（必要なら `code`）。Rust helpers が stamp。`normalizeBundle` が `msgs→lines` でも保持。ホストは status 優先。`classifyOutcomeFromLines` は legacy→削除 | **3〜5 日**（~15–25 files · `build:wasm` · codegen カタログ変更なし） |
| **2** | 構造化 list plan（`open_plain_list` / `search_list` の line エコー再パース撤去）。`run-pipe-chain` / `apply-ui-action` は plan から fetch。`matchPlainListCommand` を判定経路から外す | **5〜8 日**（Phase 1 後） |
| **3** | パイプ RHS を WASM 分類（consumer id + flags）。TS `*-match.ts` 撤去。bare / pipe `tab -send` 文法を Rust 単一化 | **6〜10 日** |
| **4** | `verify:host-blind` 厳格化（list allowlist 縮小 · matcher 新設禁止）· 判定経路パーサ削除 · シェル対話パーサは UiAction 済みから縮小 | **3〜5 日** |

**合計**

| 到達点 | Phase | 工数 |
|--------|-------|------|
| 成否を Rust が返す（usage→notProducer の設計的根治） | 1 | 約 0.5〜1 人週 |
| Enter / パイプ左辺が host-blind | 1–2 | 約 2〜2.5 人週 |
| パイプ含む意味論をほぼ Rust 専有 | 1–4 | 約 3.5〜6 人週 |

削除・置換対象の TS 意味論層: 約 **1.5〜2.5 kLOC** + Rust IR/emitter + テスト。中〜大規模（IR 進化必須）。

**後回し（やらない）**

- Chrome/WebRTC 実行時失敗をすべて Rust 判定（ホストしか観測できない）
- IME 候補 UI の全ロジックを Rust 化
- シェル対話パーサの一括削除を Phase 1 と同時

**チェックリスト**

- [ ] **8.1:** `DispatchBundle.exitStatus`（+任意 `code`）· Rust stamp · TS 伝播 · 行スクレイプ撤去
- [ ] **8.2:** 構造化 list plan · パイプ左辺 / `OpenPlainList` の再パース撤去
- [ ] **8.3:** パイプ RHS を WASM 分類 · `*-match.ts` 撤去
- [ ] **8.4:** `verify:host-blind` 厳格化 · 残骸掃除
- [x] **暫定:** パイプ左辺 usage の成功誤判定を `segmentOutcomeFromLines` で抑止（Phase 1 で置換）
- [x] **暫定:** 単一 compound セグメントの冗長 `[{segment}]` エコー抑制（Family send ログ重複）

**参照:** 本会話の見積もり · `shared/crates/bmxt-core/src/ir.rs` · `shared/lib/features/command-line/compound/classify-outcome.ts` · `scripts/verify-host-blind.mjs`

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
