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
| CS | `bmxt-nav-overlay.content` を再注入時に冪等化（overlay 二重防止） |
| UX | `shell.reloadHint` / `error.reloadHint` をリロード誘導から具体失敗理由へ |
| 審査 | 外部通信なし + 横断ページ操作の正当性を justification に明記 |

**スコープ外（次フェーズ候補）**

- discarded（休止）タブの自動起こし — 権限では解けない。横断検索の完全性は別課題
- `<all_urls>` 化

**権限縮小・SW 区画（実装済み）**

- [x] ページ内操作を https のみ（`host_permissions` / CS / `isScriptablePageUrl`）
- [x] `RUN_CMD` / `NAV_CONTROL` は `bmxt.html` のみ（`trusted-ui-sender`）

**実装チェック**

- [x] host `wxt.config` / `hosts/create-host-wxt-config.ts`: https を必須 `host_permissions` へ
- [x] `shared/lib/features/page-scripting/ensure-content-script.ts`（probe / inject / ensure / bulk reinject）
- [x] 呼び出し側で ensure リトライ: nav · dom · page-extract · search CS パス
- [x] `onInstalled`（install / update）で open tabs へ bulk reinject
- [x] content script 冪等化
- [x] i18n / optional-host 文言更新 / README 更新

**手元スモーク**

- [ ] 拡張をリロードしたあと、**ページ非リロード**で nav / `search -list --page` / `dom -list` が動く
- [ ] 二重注入しても overlay が二重にならない
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
| 制御面 | native messaging ホストは使わない。低遅延は **WebRTC DataChannel**（接続確立は Family 認証付きテキストコード） |
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
| 原理 | 名刺（SDP offer/answer · ICE 同梱）を Family 認証付きテキストコードでコピペ交換し、会話本体は Peer 間 DataChannel |
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
- [x] **6c:** コピペ握手（`bmxt-rtc1.` Family 認証付き）+ WebRTC DataChannel（host ICE）
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
| `handshake/common/` | Family 認証 codec · connect pending（両輸送の前提） |
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

- 保存: blob download で `bmxt-YYYYMMDD-HHMMSS-{invite|offer|answer}.json`（招待は `bmxt1.*`、接続コードは Family 認証付き `bmxt-rtc1.*`。時刻付きで整列しやすい）
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
| **setting** | `-set` / `-export` / `-import` / `-bg-import` / `-storage` / … | （列ピッカーは `submitConstructedLine` のみ） | §7 wizard 化済み。FSA／zip／画像はコマンド→UiAction→chooser |
| **tab** | close / reload / `#t:` / `move` / `new-window` / `group add|new|rename|ungroup` / `tab -activate` / `close --window|--group` / `window rename` | （空白 URL の新タブのみ Chrome create 残） | §7 wizard 化済み。preview は非コマンドのまま |
| **bookmark** | `-list` tree / `-remove` / `-move` / `-send` / `open` | （new folder/add サブウィザードは任意） | §7: folder ツリー picker + `submitConstructedLine` |
| **history** | `-list` date tree / `-delete` / `-delete-range` / `open` | | §7: month→day→visit picker + `submitConstructedLine` |

**実装チェック（段階）**

- [x] **7a 追加:** `open` / `jump` pipe consumer + first command。setting `-set`/`-save`/`-cancel`（UiAction）
- [x] **7a:** search `\| open` / `\| jump` · dom `\| jump` · setting `-set`/`-save`/`-cancel`
- [x] **7b 突合:** session / search open·jump / dom jump / setting save·cancel は同一コマンド面（picker は行組み立てのみ）
- [x] **7c 切替:** session / search / dom / setting(save·cancel) Enter → `submitConstructedLine` → `submitLine`
- [x] **7d 削除:** search Enter の `openSearchPickerEntry` 直呼びを除去。dom/setting も submit 経路へ。`map_command.csv` / i18n 更新
- [x] **7e:** tab bulk（`move` / `group add` / `new-window`）+ search destination（`open --into-window` / `--into-group`）。picker は `submitConstructedLine`
- [x] **7f:** tab close/reload/`open --into-window` / `tab -activate` / `close --window|--group` / `group rename|ungroup|new --title|--color` / `window rename` を CUI+submit 化。`:edit` / plain Enter / window close / group-new meta も submit。空白 URL 新タブのみ Chrome create 例外

**手元スモーク（7c 以降）**

- [ ] 各 family: plain `-list` と `… \| browse` の入口が従来どおり
- [ ] 同じ作用を typed のみ / picker Enter のみで実行し、結果が一致する
- [ ] picker 操作後に history / ログへ想定どおりコマンド行が残る（方針どおり）
- [x] 直実行モジュールに残存呼び出しがない（grep: picker Enter 経路は `submitConstructedLine`。例外は空白 URL `tabs.create` と preview）

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

- [x] **8.1:** `DispatchBundle.exitStatus` · Rust stamp（usage=2 / unknown=127 / ok=0）· TS `normalizeBundle` 伝播 · WASM lines は status 優先（行スクレイプは SW 等のフォールバック）
- [x] **8.2:** 構造化 list plan · パイプ左辺 / `OpenPlainList` の再パース撤去（`listPlanFromOpenPlainList` / search_list fields）
- [x] **8.3:** パイプ RHS を WASM 分類（`classify_pipe_consumer`）· `*-match.ts` は WASM ラッパのみ · `matchPipeConsumer` は id 照合
- [x] **8.4:** `verify:host-blind` にパイプ RHS 判定パターン追加 · list allowlist は legacy fallback 用に当面維持
- [x] **暫定→8.1:** パイプ左辺 usage は `exitStatus` で失敗（`segmentOutcomeFromLines(lines, exitStatus)`）
- [x] **暫定:** 単一 compound セグメントの冗長 `[{segment}]` エコー抑制（Family send ログ重複）

**参照:** 本会話の見積もり · `shared/crates/bmxt-core/src/ir.rs` · `shared/lib/features/command-line/compound/classify-outcome.ts` · `scripts/verify-host-blind.mjs`

### 9. Bookmark / History 操作一通り + Family 送信 + バックアップ

**目標:** 専用 first command `bookmark` / `history` でローカル CRUD・ディレクトリバックアップを揃え、Family 向け送信は `--open` / `--save` / `--both` で「タブとして開く」「相手側にブックマーク保存」「両方」を選択可能にする。既存の `search -list --bookmark|--history [--device|--peers]` と `open_tabs` は再利用する。

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| 送信意味 | **開く + 相手側に保存**。CLI / ピッカーで `--open` / `--save` / `--both` を選択 |
| 既定モード | 省略時は **`--open`**（現行 `tab -send` と同等）。明示で `--save` / `--both` |
| ローカル | 書き込み（BM 作成・削除・移動・フォルダ、履歴 URL/範囲削除） |
| コマンド面 | 専用 `bookmark` / `history`。`search -list --bookmark|--history` は横断検索のまま維持 |
| `tab -send` | URL オープン専用のまま残す。BM 保存は `bookmark -send`（二重実装しない） |
| バックアップ | ローカルディレクトリ（FSAAPI）+ zip ポータブル。主形式は版付き JSON |
| 履歴 peer 削除 | **スコープ外**（破壊的）。peer は一覧・バックアップ復元の対象のみ |
| 履歴 restore | `chrome.history` に任意挿入 API が無い → DB 書き戻しなし。一覧読み込み / `--as-bookmarks` 導線。msgs で明示 |

**現状との差分**

| ある | ない |
|------|------|
| `search -list --bookmark|--history [--device|--peers]` · `| browse` / `| open` / `| tab -send`（URL） · 権限 `bookmarks`/`history` · `search-cache-store` | `bookmarkId` 伝播 · mutate HostEffect · peer `bookmarks.create` RPC · 専用コマンド · ディレクトリバックアップ |

**コマンド面（canonical）**

`bookmark`:

| 形 | 意味 |
|----|------|
| `bookmark -list [--folder <id>] [--device <id>\|--peers]` | ツリー／フラット一覧。ローカル tree は新 Effect。`--peers` は当面 `search_query` 経路に寄せる |
| `bookmark -add <url> [--title …] [--parent <id>]` | 作成 |
| `bookmark -folder <title> [--parent <id>]` | フォルダ作成 |
| `bookmark -remove <id…>` / `… \| bookmark -remove` | 削除（id 必須） |
| `bookmark -move <id…> --parent <id> [--index n]` / pipe | 移動 |
| `bookmark -send <deviceId> [--open\|--save\|--both] [--parent <id>] [--group <title>]` / pipe | Family 送信 |
| `bookmark -backup` / `bookmark -restore` | バックアップ／復元 |
| `bookmark help` | usage |

`history`:

| 形 | 意味 |
|----|------|
| `history -list [<pattern>] [--device\|--peers]` | 既存 history 検索経路へ寄せる plain list |
| `history -delete <url…>` / pipe | URL 削除 |
| `history -delete-range --from <iso> --to <iso>` | 範囲削除 |
| `history -backup` / `history -restore` | エクスポート／一覧復元（DB 書き戻しなし） |
| `history help` | usage |

**データ流**

- Producers: `search -list` scopes / `bookmark -list` / `history -list` → `ListResult` → `bmxtRule`（`bookmark` / `history` / `bookmark.folder`）
- Local HostEffects: `bookmark_create` / `_folder` / `_remove` / `_move` · `history_delete_url` / `_range`
- Family RPC: 既存 `open_tabs` + 新 `bookmarks_import`
- Backup UiAction: FSAAPI / zip（`shared/lib/features/backup/`）

**バックアップ形式（決定）**

```
bmxt-browser-backup/
  manifest.json   # schemaVersion:1, kind, exportedAt, sourceDeviceId
  bookmarks.json  # フルツリー（restore は新規 create）
  history.json    # { url, title, lastVisitTime, visitCount }[]（件数キャップ）
```

**実装チェック（段階）**

- [x] **9.0 語彙土台:** キャッシュに `bookmarkId` / folder 判定を保持（`bookmark-revision.ts`）。adapter / ListResult / `from-list-result` で optionalKeys を埋める。`bmxt-rule.json` に `bookmark.folder`。picker の open-destination を bookmark 行にも開放
- [x] **9.1 ローカル CRUD:** codegen effects（上記）+ handlers + Rust `cmd/bookmark.rs` / `history_cmd.rs`。pipe `| bookmark -remove` / `-move` · `| history -delete`。入力検証必須
- [x] **9.2 Family 送信:** RPC `bookmarks_import` → `bookmarks_import_result` · `applyRemoteBookmarksImport`。UiAction `sync_bookmark_send { device_id, mode, payload }`（mode: `open|save|both`）。`--open`→`open_tabs` · `--save`→import · `--both`→両方（片方失敗でも msgs）
- [x] **9.3 バックアップ:** `shared/lib/features/backup/`（zip 版付き JSON）。`bookmark -backup/-restore` · `history -backup/-restore`（履歴は一覧/`--as-bookmarks`）
- [x] **9.4 文書・検証:** i18n EN+JA · `map_command.csv` / README · `codegen` → `build:wasm` → `verify:manifest` → `verify:host-blind` → `check:generated` → `cargo test -p bmxt-core` → `tsc` → unit

**手元スモーク**

- [ ] ローカル: BM 作成／フォルダ／削除／移動 · 履歴 URL/範囲削除
- [ ] `search -list --bookmark … | bookmark -send <id> --open|--save|--both`
- [ ] Chrome↔Firefox peer で開く／保存／両方
- [ ] `bookmark -backup` / `-restore` · `history -backup` / `-restore`（履歴は DB 非書き戻しを msgs で確認）

**スコープ外（明示）**

- peer 上の履歴削除
- 履歴 DB への完全書き戻し（Chrome API 非対応）
- peer 上での BM 削除／移動 → **§16 `bookmarks_ops`**
- Netscape HTML を主形式にすること（任意 interop は後回し可）

**参照:** plan `bookmark_history_ops` · skill `bmxt-add-command` · `shared/lib/features/search/cache/` · `shared/lib/features/sync/` · `shared/manifest/bmxt-rule.json` · **§16**

### 10. 端末版 BMXt（Rust CLI peer · Family DataChannel）

**目標:** PC ローカル端末（一次: Linux）から、拡張版 BMXt と同じ Family／WebRTC DataChannel コマンドバスで peer ブラウザを操作する。導入は **Rust 単一バイナリ**。複数モニタに散らばったブラウジングを、ブラウザ切替なしに一つの CUI 司令塔へ集約する。

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| 役割 | CLI は Family の **device（ネイティブ peer）**。ブラウザ API は持たない。操作は拡張のプロンプト窓 peer が実行 |
| 制御面 | **native messaging 不使用**（§6 と同じ）。本線は WebRTC DataChannel + `bmxt-rtc1.` コピペ握手 |
| 初版輸送 | 同一 PC · **host ICE のみ**（§6c 延長）。常時 TURN／クラウドシグナリングは後続 |
| 言語 | 端末製品は **Rust のみ**。拡張側の `RTCPeerConnection` 宿主は TS のまま |
| UI | **ratatui + crossterm**。tab／search リスト picker から。CLI **端末上**の `nav`／`dom` ページオーバーレイ描画は非目標（**遠隔操作は §17**） |
| 配置 | モノレポ `hosts/cli` + `shared/crates/*`。既存 `bmxt-core` とは **クレート境界で区別** |
| ブランチ | **一本の作業ブランチ**で実装段階（下記 10.0–10.5）を順に進める。長期の `cli` 専用分岐は作らない。共有契約は小さく本流へ載せ、CLI 固有は同ブランチ上で積む |

**アーキテクチャ（要約）**

```
hosts/cli (binary)
  → bmxt-core (純 rlib) / CliHostAdapter
  → bmxt-sync-wire · bmxt-family
  → bmxt-peer-rtc (native WebRTC)
       ⇄ DataChannel SyncBusCommand
BMXt 拡張プロンプト窓 (PeerHost · TS RTC · chrome.* 実行)
```

| Crate / path | 役割 |
|--------------|------|
| `shared/crates/bmxt-sync-wire` | `SyncBusCommand` serde・サイズ上限・検証 |
| `shared/crates/bmxt-family` | device id · Family seed · seal/unseal · `bmxt-rtc1.` / `bmxt1.` 互換 |
| `shared/crates/bmxt-peer-rtc` | ネイティブ WebRTC · DataChannel |
| `shared/crates/bmxt-core` | 純 rlib 化（parse／plans／tabs_picker） |
| `shared/crates/bmxt-core-wasm` | 現行 `wasm-bindgen` Facade（拡張がリンク） |
| `hosts/cli` | binary（仮名 `bmxt`）。設定 `~/.config/bmxt/` |

**拡張との契約**

- ワイヤ正本: `shared/lib/features/sync/types.ts` の `SyncBusCommand`（初版は破壊変更しない）
- 接続確立・Family 認証: `rtc-handshake-codec` / `family-crypto` と **バイト／JSON 互換**（fixture で両側緑）
- peer 宿主は現状どおり **プロンプト窓**（窓クローズ＝切断）
- CLI device 表示例: `terminal@<host>`。名簿が terminal device を拒否しないことを確認

**実装チェック（段階）**

- [x] **10.0 契約固定:** `_context/cli-peer/CONTRACT.md` + fixtures（`scripts/cli-peer/gen-family-fixtures.mjs`）。Rust unseal / invite / ping·ack 緑
- [x] **10.1 共有クレート:** `bmxt-sync-wire` · `bmxt-family`（workspace members）
- [x] **10.2 輸送 + 最小 CLI:** `bmxt-peer-rtc` + `hosts/cli`（`bmxt`）。`status` / `sync-setup` / `sync-pair` / `sync-connect` / REPL `ping`。**手元:** 拡張との握手→ping は下記スモーク
- [x] **10.3 バス RPC:** REPL `tabs` / `open` / `close` / `activate` / `search`（chunk 収集）。タイムアウト `SYNC_REMOTE_QUERY_TIMEOUT_MS`
- [x] **10.4a core 分割（実用形）:** `bmxt-core` に `wasm` feature（default on）。CLI は `default-features = false` で純 rlib 利用。拡張 wasm-pack は従来どおり default。専用 `bmxt-core-wasm` クレート分離は任意の後続
- [x] **10.4b CliHostAdapter:** REPL が拡張と同じ文法（`tab -list --peers | browse` 等）。`HostEffect`／`UiAction` → 遠隔 RPC。当時は `nav`／`dom`／握手系は明示案内（**実パリティは §17**）。msgs は共有 EN i18n
- [x] **10.4c TUI picker MVP（初期）:** REPL `tui` → ratatui 一覧（`↑↓` `/` Enter Esc）。フル列レイアウト・tabs_picker reducer 接続は後続
- [x] **10.5 配布手順:** `hosts/cli/README.md` · `hosts/README.md` 追記。`cargo build --release -p bmxt-cli` → `target/release/bmxt`。Linux 一次

**推奨着手順**

1. 10.0 → 10.1（契約）
2. 10.2（握手 + ping）← ここで「端末→ブラウザ」が実在
3. 10.3（tabs／search RPC）
4. 10.4c tab picker 先行。10.4a／10.4b はコマンド行パリティが必要になったら
5. 10.5 配布

**拡張側の追随（必要時のみ・小さく）**

- [ ] 名簿／表示で terminal device を拒否していないことの確認
- [ ] 契約 fixture を CI（`pnpm` / `cargo`）両側に接続
- [x] `hosts/README.md` / `hosts/cli/README.md` に CLI host を追記

**スコープ外（明示）**

- native messaging / CDP / Playwright
- 常時 TURN・クラウドシグナリング（§6b／遠隔段）
- CLI **端末内**への `nav`／`dom` ページオーバーレイ描画（peer 上 overlay の **遠隔駆動は §17**）
- 拡張内 WebRTC スタックの Rust 置換（ブラウザ `RTCPeerConnection` 維持）
- React 版 picker の見た目完全一致

**手元スモーク（段階通過時）**

- [ ] 同一 PC: CLI ↔ Chrome（または Firefox）プロンプト窓で `bmxt-rtc1.` 握手 → `sync -ping`
- [ ] CLI から `tabs_list`／タブ閉じ・アクティブ化・URL open
- [ ] TUI: `tab -list --peers \| browse` 相当で列が開き Enter で遠隔操作
- [ ] プロンプト窓を閉じるとトンネルが落ち、CLI が切断を検知する

**参照:** plan `rust_cli_bmxt` · §6（Family／6c バス）· `shared/lib/features/sync/` · `shared/crates/bmxt-core/` · skill `bmxt-add-command`

### 11. localhost HTTP 待ち受け（自動接続 · CLI listener）

**目標:** 同一 PC で CLI を常設エントリにし、各ブラウザの BMXt プロンプト起動だけで Family DataChannel を再接続する。ブラウザ同士は既存 **mesh** で直結。コピペ／ファイルによる接続確立は **フォールバックとしてすべて残す**。

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| 輸送 | CLI が **loopback のみ**（`127.0.0.1` / `localhost`）で HTTP 待ち受けを listen。固定ポート **17653** |
| 認証 | 接続確立・hello は **Family 認証必須**（`bmxt-rtc1.` / sealed envelope）。参加情報無しの無関係な localhost は拡張が無視 |
| CSP | `connect-src` に **当該 loopback ポートのみ**追加。一般インターネットへの fetch は禁止のまま（`check:no-fetch` は localhost クライアントのみ許可） |
| host_permissions | `http://127.0.0.1:17653/*` · `http://localhost:17653/*` を必須に追加 |
| 一般 http DOM | **引き続き不可**（`isScriptablePageUrl` は https のみ。localhost を nav/dom/search 対象にしない） |
| Native messaging | **引き続き不使用** |
| フォールバック | `sync -setup` / `-connect` / `-offer` / `-answer` / `-accept` · clipboard · ファイルチケットは現状どおり |
| 役割 | CLI = introducer（常設エントリ）。本線コマンドは WebRTC DataChannel。タブ操作のハブ中継はしない |

**コールドスタート（到達点）**

1. CLI 起動（Family 参加済み）→ localhost 待ち受け開始  
2. 各ブラウザで BMXt プロンプト窓を開く  
3. 拡張が hello を Family 認証 → offer を POST → answer を apply → DC 開通  
4. mesh でブラウザ同士を自動直結  

初回の Family／CLI 参加（シード・招待）は従来どおり手動。WebRTC はプロセスまたぎ保持不可のため「自動再握手」になる。

**API（契約概要）**

| メソッド | パス | 内容 |
|----------|------|------|
| `GET` | `/` | 人向け案内 HTML（任意） |
| `GET` | `/v1/hello` | Family 認証付き hello（無関係なサービスの排除） |
| `POST` | `/v1/handshake/offer` | body: `{ sealedOffer: "bmxt-rtc1.…" }` → `{ sealedAnswer: "bmxt-rtc1.…" }` |

**実装チェック**

- [x] **11.0** `_context/cli-peer/CONTRACT.md` · todo 本節 · 固定ポート定数の両側共有
- [x] **11.1** CLI: loopback HTTP listener（hello + offer→answer）· `BusClient` 複数 peer attach · REPL 常時待ち受け
- [x] **11.2** 拡張: host_permissions + `connect-src` ピンポイント · `handshake/localhost/` クライアント（Family 認証）
- [x] **11.3** プロンプト起動時オートリトライ再接続 · 接続済みなら no-op · 失敗時は黙ってフォールバック可能
- [x] **11.4** i18n（EN+JA）· README / hosts/cli README · `check:no-fetch` allowlist
- [ ] **手元:** CLI 起動 → Chrome/Firefox で BMXt 窓のみ → ping / mesh。コピペ経路も退行なし

**スコープ外**

- ローカル CA / HTTPS CLI  
- Native messaging  
- `http://*/*` 全面解禁  
- クラウドシグナリング / STUN/TURN  
- プロンプト窓を開かずに SW だけで peer 宿主化  

**参照:** §6c · §10 · `shared/lib/features/sync/handshake/` · `hosts/cli/`

### 12. BMXtCLI — i18n / `setting` コマンドパリティ

**目標:** 端末版 CLI（`hosts/cli` · バイナリ `bmxt`）でも拡張と同じく **EN/JA i18n** と、可能な限り同じ **`setting` CUI**（`-list` / `-set` / `-save` / `-cancel`）を使えるようにする。ブラウザ UI（`| browse` ピッカー・FSA・chrome.storage）は持たず、ディスク上の CLI 専用ストアで完結する。

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| ストア | 拡張の `chrome.storage` / FSA とは **独立**。CLI 専用ディレクトリに拡張 export と同形の **`settings.json` v2** |
| ディレクトリ | **`~/.config/bmxt/bmxt-cli-ui-settings/`**（BMXtCLI の UI 設定だと一目で分かる名前。Family 用 `~/.config/bmxt/config.json` とは別） |
| バンドル | 拡張の `bmxt-ui-settings/` と **同レイアウト**（`settings.json` + 任意の背景画像）。後から zip/dir で拡張と行き来可能 |
| コマンド意味 | 既存 `bmxt-core` の `setting` UiAction をそのまま適用（新文法は作らない） |
| locale 優先順 | **committed `settings.locale` → env（`LC_ALL` / `LC_MESSAGES` / `LANG`）→ `en`** |
| スコープ外（当面） | `setting -list \| browse` ピッカー、FSA / IndexedDB、snapshot vault UI、Family sync 案内行、appearance ライブプレビュー |

**アーキテクチャ（要約）**

```
REPL line
  → bmxt-core run_line → UiAction setting_*
  → CliHostAdapter（draft インメモリ）
  → ~/.config/bmxt/bmxt-cli-ui-settings/settings.json
  → ランタイム locale → msgs.rs（共有 i18n JSON）
```

| Path / crate | 役割 |
|--------------|------|
| `shared/crates/bmxt-ui-settings`（新規） | `settings.json` v2 の load/save/normalize（拡張 TS と意味揃え） |
| `hosts/cli/src/msgs.rs` | namespace 拡充 · ランタイム locale |
| `hosts/cli/src/adapter.rs` | `SettingSet` / `SettingSave` / `SettingCancel` / `OpenPlainList(setting)` |
| `shared/lib/features/setting/setting-cui-apply.ts` | 拡張側 `host-ui` `-set` を `auto`/`desktop`/`mobile` に修正（両ホスト一致） |

**実装チェック（段階）**

- [x] **12.0 契約:** 本節 + ディレクトリ名 `bmxt-cli-ui-settings` 固定。plan / README にパスを明記
- [x] **12.1 i18n + locale 永続:** `bmxt-ui-settings` クレート · locale 優先順 · `setting.json` 等 namespace 拡充 · adapter/main の直書き英語を `t_cli` 化 · Rust 単体テスト
- [x] **12.2 `setting` CUI（スカラー）:** `-list` 印刷 · `-set` draft · `-save` / `-cancel` / `-exit` · キー `locale` / `edit-picker` / `ime-candidate-help` / `search-legend` / `host-ui`（CLI は値保存のみ）· `| browse` は非対応 msgs
- [x] **12.3 拡張追随:** `setting-cui-apply` の `host-ui` を現行ドメイン（`auto`/`desktop`/`mobile`）へ修正 · unit 更新
- [x] **12.4 ドキュメント:** `hosts/cli/README.md` · root README Terminal CLI 節 · 本節チェック更新
- [ ] **12.5（後続）appearance / export-import:** 色・フォント・画像パス · 拡張と同形 zip/dir 往復。任意で `BMXT_CLI_UI_SETTINGS_DIR` 上書き

**手元スモーク**

- [ ] `setting -list` が `bmxt-cli-ui-settings` の committed 値を印刷する
- [ ] `setting -set locale en` → `-save` 後、msgs / バナーが英語になる（再起動後も維持）
- [ ] `-set` 後 `-cancel` で破棄されディスクに書かれない
- [ ] `setting -list | browse` が CLI 非対応案内になる（tabs の browse は退行なし）
- [ ] 拡張側 `setting -set host-ui desktop` が通る（12.3）

**参照:** plan `cli_setting_i18n` · §10 · §11 · skill `bmxt-i18n` · skill `bmxt-ui-settings` · `hosts/cli/` · `shared/lib/features/setting/`

### 13. POSIX 実行契約（拡張 + CLI · LLM ワンショットの土台）

**目標:** LLM ワンショット（§14 `bmxt exec`）の前段として、拡張と CLI のコマンド実行 I/O を **BMXt POSIX Profile** で揃え、機械可読な **stdout / stderr / 数値 exit** を同じ意味表にする。契約上は POSIX 風の **バイトストリーム（UTF-8・改行区切りが既定）のスナップショット** として記述する。配信は当面 **完了バッファ** で足りる。

**現状（ギャップ）**

| 層 | 拡張 | CLI |
|----|------|-----|
| exit | P1（0 / 1 / 2 / 127）・`exit-status.ts` / core 定数あり | 同定数は使うが経路ごとにばらつき |
| stdout / stderr | `CommandOutput` / `SegmentOutcome` / `encodeLogLine` あり。適用が `lines`（merged）寄り・`channel` 任意になりがち | `println!` / `eprintln!` 散在。結果と診断の境界が契約化されていない |
| 実行結果 | `SegmentOutcome` ≈ `CommandOutput` | `RunOutcome { exit_status }` + 副作用 print |
| 非対話 | N/A（UI 対話） | handshake / TUI が混在し得る（§14 で禁止する前提の整理が未了） |

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| 主目的 | **§14 LLM ワンショットの土台**。拡張・CLI が同じ I/O 意味を語れること |
| モデル | 1 実行 = `stdout`（結果）+ `stderr`（診断）+ 終端後の `exit`（0/1/2/127） |
| 正本 | 既存拡張 Profile（`command-output.ts` · `exit-status.ts` · `SegmentOutcome` · `posix-profile` conformance · README Profile 節）を種とし、CLI を同じ意味論へ寄せる |
| 配信 | **完了バッファ**（配列／一括 sink）。真のインクリメンタル配信は **本節スコープ外・後日**（下記） |
| 拡張の深さ | チャネル一次情報化と patch 整合まで。大規模 Writer フレームワークや全コマンド改装はしない |
| CLI | コマンド結果を集約してから OS FD / REPL print へ。`Interactive`（REPL）と `NonInteractive`（§14 exec）を分離。インフラ `eprintln!` をコマンド stderr に混ぜない |
| スコープ外（本節） | WASM `run` の chunk 化、SW MessagePort 逐次、DataChannel chunk プロトコル、端末ログのライブ追記 UX、NDJSON 第一出力、OS パス redirect、外部プロセス起動 |

**アーキテクチャ（要約）**

```
BMXt grammar line
  → bmxt-core（文法 / DispatchBundle / exit）
  → ホスト実行結果 { stdout[], stderr[], exit }
       ├─ 拡張: encodeLogLine → session log（表示投影）
       └─ CLI: 集約バッファ → OS stdout/stderr（REPL print も同シンク）
  → §14 bmxt exec が CLI シンクを消費
```

| Path | 役割 |
|------|------|
| `shared/lib/features/command-line/command-output.ts` | `CommandOutput` / `LogChannel` / encode |
| `shared/lib/features/command-line/compound/exit-status.ts` | exit 定数表 |
| `shared/lib/features/command-line/compound/types.ts` | `SegmentOutcome`（stdout/stderr 一次 · `lines` は投影） |
| `tests/unit/features/command-line/conformance/posix-profile.test.ts` | Profile conformance |
| `hosts/cli/src/adapter.rs` | 結果集約 · Interactive / NonInteractive |
| `_context/cli-peer/CONTRACT.md` | ホスト横断 I/O 契約（§14 IPC と併記） |

**実装チェック（段階）**

- [x] **13.0 契約:** 本節 · stdout/stderr/exit 表 · 非対話時のチャネル規則 · 「完了バッファで足りる／インクリメンタルは後日」を `CONTRACT.md` に固定
- [x] **13.1 拡張:** セグメント完了時は stdout/stderr/exit を一次情報にする · `appendLogLines` / `SessionPatch` でチャネルを落とさない · `lines` は表示投影のまま
- [x] **13.2 CLI:** コマンド出力をバッファ集約してから sink · REPL=`Interactive` · インフラログとコマンド stderr を分離（§14 の NonInteractive 前提）
- [x] **13.3 conformance:** 成功一覧 → stdout・exit 0 / usage・parse → stderr・exit 2 / 未知 → 127 / 失敗で stdout を汚さない、を拡張 unit + CLI 側で検証
- [x] **13.4 ドキュメント:** README BMXt POSIX Profile に「CLI も同一意味」· 本節と §14 の前後関係を明記

**手元スモーク**

- [ ] 拡張: usage / 未知コマンドが stderr 色（または同等チャネル）で出る · compound / pipe / `| browse` が退行しない
- [ ] CLI REPL: `tab -list` 等の結果が従来どおり見え、handshake / `| browse` が Interactive で動く
- [ ] CLI: 意図的に stderr へ出した診断が結果行と FD 上で分離できる（またはテストで同等を確認）

**後日（参考 · 本節の完了条件に含めない）— 真のインクリメンタル配信**

大容量一覧・長い search 等向け。完了バッファ契約の **同じ口**（stdout/stderr/exit）のまま、中身だけ逐次化する。

| 候補順 | 内容 |
|--------|------|
| 1 | §14 exec IPC のチャンク転送（常駐 → exec クライアント） |
| 2 | DataChannel の tabs/search chunk |
| 3 | 拡張端末の逐次ログ |
| 4 | パイプ `BmxtRuleStream` の lazy / NDJSON 投影 |
| 5 | WASM 境界のストリーム化（最後・または見送り） |

消費側が完了待ちバッファする限り LLM 体感は変わらない点、短いコマンドでは投資対効果が低い点に注意。

**参照:** plan `posix_i_o_foundation` · Archive 旧 §10（Profile 公開）· §14 · `shared/lib/features/command-line/` · `hosts/cli/src/adapter.rs` · `_context/cli-peer/CONTRACT.md`

### 14. BMXtCLI — ワンショット実行（LLM / 非対話）

**前提:** §13（POSIX 実行契約）で拡張・CLI の stdout/stderr/exit 意味が揃っていること。

**目標:** LLM エージェントやシェルスクリプトが、対話 REPL なしで **1 行（または少数行）の BMXt 文法**を実行し、stdout / stderr と **数値 exit status** を受け取れるようにする。拡張プロンプトと同じ `bmxt-core` 意味を保つ。

**現状（未対応）**

| 項目 | 内容 |
|------|------|
| 入口 | clap は `status` / `sync-*` / `repl` 等のみ。文法コマンドは **REPL 内 `CliHostAdapter::run_line` のみ** |
| 接続 | タブ操作等は Family DataChannel 必須。localhost 待ち受け（§11）は **常駐 CLI プロセス**が宿主 |
| 対話依存 | 握手の code/file 確認（§12 周辺）等が stdin 待ち。非対話では事前設定必須 |

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| 入口 | `bmxt exec -- '<line>'`（および任意で複数 `--` 引数／stdin 1 行モード）。短別名 `-c` は後続でも可 |
| 実行核 | 既存 `CliHostAdapter::run_line` をそのまま呼ぶ（新文法・別パーサは作らない） |
| 接続モデル | **常駐前提（推奨）:** 先に `bmxt` / `bmxt repl`（localhost 待ち受け起動済み）を動かし、`exec` は同一マシンの常駐へ **コマンドだけ送って終了**。ワンショットプロセス単体で WebRTC を張り直して即切断する経路は非推奨（LLM 多段呼び出しに向かない） |
| IPC | 常駐 ↔ `exec` は **loopback のみ**（既存待ち受けポート近傍、または Unix domain socket）。Family 認証／ローカル認証の要否は 14.0 で契約固定 |
| 非対話ルール | `exec` 中は握手 ask / zenity 等を **禁止**。未接続・未設定は明確な stderr + 非 0 exit。`handshake-delivery` 等は事前 `setting` / `config.json` で済ませる |
| 出力 | §13 契約どおり stdout = コマンド結果行、stderr = 診断。exit = `bmxt-core` の exit status をプロセス終了コードへ伝播（当面は完了バッファ） |
| スコープ外（当面） | TUI / `| browse` ピッカー、対話 handshake ウィザード、常駐なしでの完全自己完結 peer 起動、真のインクリメンタル配信（§13 後日） |

**アーキテクチャ（要約）**

```
常駐: bmxt repl (+ localhost listener §11)
         ↑ loopback IPC（契約は 14.0）
ワンショット: bmxt exec -- 'tab -list --peers'
         → CliHostAdapter::run_line（常駐側 · NonInteractive · §13 シンク）
         → stdout / stderr / exit
```

| Path（想定） | 役割 |
|--------------|------|
| `hosts/cli/src/main.rs` | clap `exec` / `-c` |
| `hosts/cli/src/adapter.rs` | 既存 `run_line`（§13 の集約シンクを再利用） |
| `hosts/cli/src/door.rs` または新規 IPC モジュール | 常駐へのコマンド投入 |
| `_context/cli-peer/CONTRACT.md` | exec IPC 契約・非対話制約 |

**実装チェック（段階）**

- [x] **14.0 契約:** 本節 · IPC 形（HTTP on door vs UDS）· 認証 · タイムアウト · 非対話エラー表を `CONTRACT.md` / 本節に固定（§13.0 の I/O 表を参照）
- [x] **14.1 常駐側:** 待ち受けまたは専用 endpoint で「1 行実行 → 結果 + exit」を受け付け（既存 hub / adapter 再利用）
- [x] **14.2 クライアント:** `bmxt exec -- '…'` · 未常駐時は分かりやすい失敗 · exit 伝播
- [x] **14.3 非対話ガード:** handshake ask / GUI pick を `exec` 経路で起動しない · i18n msgs
- [x] **14.4 ドキュメント:** `hosts/cli/README.md` · root Terminal CLI · LLM 利用例（接続済み前提）
- [ ] **14.5（任意）:** stdin 複数行バッチ · JSON 結果ラッパ · `-c` 別名

**手元スモーク**

- [ ] 常駐 `bmxt` + ブラウザ peer 接続済み → `bmxt exec -- 'sync -status'` が非 0 でなく終わる
- [ ] `bmxt exec -- 'tab -list --peers'` が REPL と同じ一覧を stdout に出し、プロセスが終了する
- [ ] 常駐なしで `exec` → 明確なエラー + 非 0（ハングしない）
- [ ] `exec` 中に code/file の対話プロンプトが出ない
- [ ] 不正行で misuse 相当の exit になる

**参照:** §10 · §11 · §12 · §13 · `hosts/cli/` · `hosts/cli/src/adapter.rs` · `_context/cli-peer/CONTRACT.md`

### 15. BMXt POSIX Profile — 追加時の規格強制（ゲート）

**前提:** §13（I/O 契約）· §14（`bmxt exec`）でホスト横断の **口**（stdout / stderr / exit）は揃っている。本節は、今後のコマンド・機能追加が契約から外れないよう **機械チェック／経路集約で守らせる**。

**目標:** 「新機能を書けば自動で Profile 準拠」までは求めないが、逸脱を CI / conformance / lint で検知できる状態にする。IEEE 1003.1 準拠ではなく **BMXt Profile の規律維持**。

**製品方針（決定済み）**

| # | 規律 | 強制の強さ（現実解） |
|---|------|----------------------|
| 1 | **exit は core 定数のみ**（`0/1/2/127` · TS `exit-status.ts` / Rust `bmxt_core::ir::EXIT_*`） | 高 — マジックナンバー禁止 + unit/conformance |
| 2 | **成功行 → stdout、usage/error → stderr** | 中〜高 — 集約経路で exit により振り分け + ゴールデン。文言スクレイプの完全禁止はしない |
| 3 | **対話 UI は Interactive のみ**（`\| browse` · TUI · handshake ask / zenity） | 高 — `InteractionMode` ガードを入口に集約（§14 NonInteractive 既存） |
| 4 | **CLI コマンド出力は `CommandIo` のみ**（adapter 経路の直 `println!` / `eprintln!` 禁止。インフラログは `repl_log` 等に限定） | 高 — `hosts/cli` の lint / CI grep |
| 5 | **パイプは閉じた consumer / `bmxtRule` のみ**（未知 consumer は misuse、勝手な FD パイプは作らない） | 高 — レジストリ + conformance 強化 |

**アーキテクチャ（要約）**

```
新コマンド / 変更
  → bmxt-core（exit 定数 · DispatchBundle）
  → ホスト: stdout/stderr 振り分け（SegmentOutcome / CommandIo）
  → 対話入口: InteractionMode ガード
  → CI: Profile conformance · CLI print grep · pipe registry
```

| Path（想定） | 役割 |
|--------------|------|
| `shared/crates/bmxt-core` · `exit-status.ts` | exit SoT |
| `command-output.ts` · `CommandIo` · `classify-outcome.ts` | チャネル振り分け |
| `hosts/cli/src/adapter.rs` · `command_io.rs` | Interactive / NonInteractive · 直 print 禁止対象 |
| `pipe/consumers/` · `bmxt-core` pipe_consumer | 閉じた consumer |
| `tests/.../posix-profile.test.ts` · `hosts/cli` posix_io tests · verify/CI | ゲート |

**実装チェック（段階）**

- [x] **15.0 契約:** 本節 5 規律を `CONTRACT.md`（または Profile 節）に「追加時必須」として追記。skill `bmxt-add-command` へチェックリスト反映
- [x] **15.1 exit 定数:** ホスト／コマンド追加で生の `1`/`2`/`127` を避け `EXIT_*` のみ。既存の散在を棚卸し + unit
- [x] **15.2 チャネル振り分け:** 成功一覧は stdout・診断は stderr のゴールデン（拡張 + CLI）。集約経路以外からの「結果 print」を減らす
- [x] **15.3 Interactive ガード:** NonInteractive（`exec`）入口で browse / TUI / ask が起動しないことをテスト固定。新規対話 UI は `InteractionMode::Interactive` 分岐必須
- [x] **15.4 CLI `CommandIo`:** `hosts/cli/src/adapter.rs`（およびコマンド結果経路）で直 `println!`/`eprintln!` を禁止する CI grep または clippy 相当。インフラ用は allowlist
- [x] **15.5 パイプ閉じ語彙:** 未知 consumer → exit 2 の conformance 維持。新 consumer はレジストリ + `bmxtRule` kind のみ（skill / codegen と連携）

**スコープ外（本節）**

- 真のインクリメンタル配信（§13 後日）
- 全コマンドの Writer フレームワーク大改装
- OS パス redirect / 外部プロセス / POSIX shell 互換

**参照:** §13 · §14 · plan `posix_i_o_foundation` · skill `bmxt-add-command` · `_context/cli-peer/CONTRACT.md` · `tests/unit/features/command-line/conformance/posix-profile.test.ts`

### 16. CLI bookmark/history パリティ + 拡張残ギャップ

**前提:** §9（拡張側 `bookmark` / `history` 本線完了）· §10（CLI = ブラウザ API なし・Family DataChannel）· §7（picker = コマンド組み立て）· §15（POSIX Profile ゲート）。

**目標:** CLI peer で tabs 相当に bookmark / history を操作できるようにし、拡張側の残ギャップ（picker send モード · peer `bookmarks_ops` · スモーク）を閉じる。コマンド文法は既存 `bmxt-core` のまま。picker は引き続き `submitConstructedLine` のみ。

**現状ギャップ**

| 面 | 状態 |
|----|------|
| 拡張 `bookmark` / `history` | CRUD · picker · backup · `bookmarks_import`（TS）まで実装済 |
| CLI | `tab` のみフル。`OpenPlainList` / `OpenPicker` の `bookmark`/`history` は `listLimited` / `pickerLimited`。`--peers` 経由の flat `search_query` のみ可 |
| Wire | TS に `bookmarks_import` あり。**Rust `bmxt-sync-wire` / CLI `BusClient` 未移植**。`bookmarks_ops` 未着手 |

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| CLI 在庫 | ローカル Chrome 無し → bare `bookmark -list` / `history -list` は接続 peer へ fan-out（初段は既存 `search_query`） |
| 一覧の初段 | **flat のみ**。フォルダ／日付ツリー TUI · 専用 `bookmarks_list` RPC は後段（16.7） |
| peer BM 変更 | **`bookmarks_ops`** を新設（`tabs_ops` 同型: create / create_folder / remove / move）。拡張 handler + CLI effect を同じ RPC に載せる |
| peer history delete | **作らない**（§9 どおり）。CLI の `history -delete*` は当面 unsupported / misuse |
| 送信 | `bookmark -send --open\|--save\|--both` を CLI でも実装（`open_tabs` + `bookmarks_import`） |
| スコープ外 | CLI backup/restore · `window` first-command 拡張 · downloads 等の未着手 API · 真のインクリメンタル配信 |

**アーキテクチャ（要約）**

```
CLI / 拡張 同一文法（bmxt-core）
  → DispatchBundle（OpenPlainList / SyncBookmarkSend / Bookmark* effects）
  → CLI adapter:
       list  → search_query fan-out（flat）→ stdout / Interactive browse → open_tabs
       send  → open_tabs_on / bookmarks_import_on
       mutate → bookmarks_ops_on（接続 peer）
  → 拡張:
       picker send モード UI → submitConstructedLine
       apply-remote-bookmarks-ops ← DataChannel
```

| Path（想定） | 役割 |
|--------------|------|
| `hosts/cli/src/adapter.rs` | `list_id` bookmark/history 許可 · SyncBookmarkSend · Bookmark* → RPC · pipe consumers |
| `hosts/cli/src/bus.rs` | `bookmarks_import_on` · `bookmarks_ops_on` |
| `shared/crates/bmxt-sync-wire` | `bookmarks_import` / `_result` · `bookmarks_ops` / `_result`（TS と同期） |
| `shared/lib/features/sync/types.ts` · `adapters/webrtc-command-bus.ts` | 拡張側 wire · waiter |
| `shared/lib/features/sync/bus/apply-remote-bookmarks-ops.ts`（新） | peer 上 `chrome.bookmarks.*` |
| `shared/lib/features/bookmark/` · `picker/build-picker-command-line.ts` | picker `--save`/`--both` UI |
| `SyncRemoteSearchHit` | optional `bookmarkId` / `parentId`（remove/move の id 手渡し） |

**実装チェック（段階）**

- [x] **16.0 契約:** 本節方針を `_context/cli-peer/CONTRACT.md`（または本節参照）に追記。§9 スコープ外の `bookmarks_ops` を本節へ移管済みであること
- [x] **16.1 拡張 picker send モード（A1）:** bookmark picker から `--open\|--save\|--both` を選択可能。typed CUI と同形行を `submitConstructedLine`
- [x] **16.2 CLI flat 一覧（B1）:** `OpenPlainList` / `OpenPicker` で `list_id` ∈ {bookmark, history} を許可し `search_query` へ寄せる。Interactive flat browse → `open_tabs`。NonInteractive は stdout のみ。i18n `listLimited` / `pickerLimited` 更新
- [x] **16.3 CLI Family send（B2）:** Rust wire に `bookmarks_import` / `_result` · `BusClient` · adapter `UiAction::SyncBookmarkSend`（`--open`/`--save`/`--both`）。pipe `| bookmark -send` は URL materialize 後に同経路
- [x] **16.4 peer `bookmarks_ops`（B3 · 拡張+CLI）:** wire（TS+Rust）· `apply-remote-bookmarks-ops` · search hit に optional `bookmarkId` · CLI の `BookmarkCreate`/`_Folder`/`_Remove`/`_Move` → `bookmarks_ops_on` · pipe `BookmarkSend`（Remove/Move/Add は HostEffect 経路）
- [x] **16.5 検証（A2）:** `apply-remote-bookmarks-ops` unit · `check:cli-command-io` · `verify:host-blind` · `cargo check -p bmxt-cli` · `tsc`。§9 手元スモーク（ローカル CRUD · send · Chrome↔Firefox · backup）は下記「手元スモーク」で実施
- [ ] **16.6（任意）:** bookmark picker の add / new-folder ウィザード（§7 任意の続き · `submitConstructedLine` のみ）
- [ ] **16.7（後続・必須でない）:** 構造化 `bookmarks_list` RPC · フォルダ／日付ツリー plain print · ratatui ツリー TUI

**手元スモーク**

- [ ] 拡張: picker から `bookmark -send <id> --save` / `--both` が history/ログに残り、peer で期待どおり動く
- [ ] CLI: `bookmark -list` / `history -list` が接続 peer の flat 一覧を stdout に出す
- [ ] CLI Interactive: `bookmark -list | browse` → Enter で peer に URL open
- [ ] CLI: `bookmark -send <deviceId> --open|--save|--both <url…>` 成功
- [ ] CLI: `bookmark -add` / `-folder` / `-remove` / `-move` が `bookmarks_ops` 経由で peer に反映
- [ ] CLI: `history -delete*` が明確に unsupported（ハングしない）
- [ ] `bmxt exec -- 'bookmark -list'` が NonInteractive で一覧のみ（browse なし）

**スコープ外（本節）**

- peer 履歴削除 · 履歴 DB 書き戻し
- CLI 上の `bookmark|history -backup/-restore`（拡張 FSA のまま）
- `window` の list/manage first-command 化（既存 `tab` / `close --window` で足りる）
- downloads / cookies / browsingData / readingList / `chrome.sessions`
- 16.7 完了前のツリー TUI 必須化

**参照:** §7 · §9 · §10 · §15 · `hosts/cli/src/adapter.rs` · `shared/crates/bmxt-sync-wire` · `shared/lib/features/sync/` · `shared/lib/features/bookmark/` · skill `bmxt-add-command` · `_context/cli-peer/CONTRACT.md`

### 17. CLI `aboutbmxt` / `dom` / `nav`（probe · DOM 取得 · overlay 遠隔操作）

**前提:** §10（CLI = ブラウザ API なし・Family DataChannel · 端末上 overlay 非描画）· §13–15（POSIX / Interactive ガード）· §16（CLI list/browse / wire 拡張の型）。plan `cli_dom_nav_about`。

**目標:** 拡張にある `aboutbmxt` / `dom` / `nav` を CLI から使えるようにする。DOM はワンショット（LLM/`bmxt exec`）優先。人間向けは `dom -wizard`。nav は **サイト上の overlay 動作は拡張と同じ**にし、CLI は WebRTC 経由で命令を注入して肩代わりする。

**現状ギャップ**

| 面 | 状態 |
|----|------|
| 拡張 `aboutbmxt` / `dom` / `nav` | welcome · capability probe · DOM scrape · nav overlay（`nav-tab-bridge`）実装済 |
| CLI | `OpenWelcomePage` 拒否 · `DomList` / `ProbeCapabilities` 汎用 unsupported · `NavArm`/`NavDisarm`/`NavConfirmClose` → `uiUnsupported` |
| Wire | **`probe_capabilities` / `dom_list` / `nav_control` 未存在**（`SyncBusCommand` に載せ替えが必要） |

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| `aboutbmxt` | CLI ローカル: welcome URL を stdout（Interactive なら `$BROWSER` / `xdg-open` 試行）。`-system`: CLI 自己診断 + **接続 peer へ `probe_capabilities` 新 RPC** |
| `dom` ワンショット | `dom -list --device <id> --tab <tabId> [--document\|--viewport] [--html\|--react] …` → RPC → **stdout に DOM 行**（LLM/シェル向け）。欠落は exit 2 |
| `dom -wizard` | **第二コマンド**（Interactive のみ）。① peer 番号選択 → ② tab 番号選択 → ③ document/viewport → ④ html/react → 取得してログ |
| `dom --with` 完全再現 | **本節スコープ外**（semantic menu / Alt 連動は拡張のまま） |
| `dom \| jump` | **後続**（本節必須にしない） |
| `nav` | CLI **端末に overlay を描かない**。`nav -enter` で peer(+tab) 選択 → RPC `nav_control start` → **raw キー転送ループ**。`nav -exit` で `stop`。サイト UI 上の見え方は拡張プロンプト操作と同等 |
| `nav -windowclose` | 確認後、peer の window close（`tabs_ops` / 対象 window 解決） |
| NonInteractive | `-wizard` / `nav -enter` キーループは拒否（§14／§15 どおり） |
| 宿主 | RPC 実行は **拡張プロンプト窓**（既存 search/tabs と同様。SW-only では CS inject / WebRTC 文脈が足りない） |

**アーキテクチャ（要約）**

```
CLI
  aboutbmxt [-system] → (local URL / self-diag) + probe_capabilities RPC
  dom -list …          → dom_list RPC → stdout lines
  dom -wizard          → Interactive 4 段 → dom_list RPC → stdout
  nav -enter / -exit   → nav_control (start|key|stop|…) RPC
       ⇄ DataChannel SyncBusCommand
拡張プロンプト窓
  probe → runCapabilityReport
  dom_list → captureDom* (tab_id / scope / flavor)
  nav_control → nav-tab-bridge / run-nav-inject（既存 overlay）
```

| Path（想定） | 役割 |
|--------------|------|
| `shared/crates/bmxt-sync-wire` · `shared/lib/features/sync/types.ts` | `probe_capabilities` · `dom_list` · `nav_control` (+ result) |
| 拡張 UI bus ハンドラ | prompt 宿主で上記 RPC を実行 |
| `hosts/cli/src/dom_nav_host.rs` · `adapter.rs` | **CLI 専用** `dom -list --device/--tab` · `dom -wizard`（共有コア文法には載せない） |
| `hosts/cli/src/adapter.rs` · `bus.rs` · `tui.rs` | about / dom oneshot+wizard / nav キー転送 |
| `_context/cli-peer/CONTRACT.md` | 新 RPC · 「端末 overlay 非描画 / 遠隔 nav 可」 |

**実装チェック（段階）**

- [x] **17.0 契約:** 本節方針を `CONTRACT.md` に追記。§10「overlay 非目標」を **端末描画非目標／遠隔操作は本節** に整合
- [x] **17.1 Wire:** TS+Rust に `probe_capabilities` / `dom_list` / `nav_control`（+ result）。巨大 HTML は行数 soft-cap（chunk は後続可）
- [x] **17.2 拡張 handlers:** prompt bus で probe · `captureDom*` · `nav-tab-bridge` へディスパッチ
- [x] **17.3 `aboutbmxt` CLI:** welcome URL · `-system` = 自己診断 + peer probe。拒否メッセージ撤去
- [x] **17.4 `dom` CLI 入口:** 共有コアは拡張どおり据え置き。CLI host が `dom -list --device/--tab` · `dom -wizard` を横取り（peer RPC）
- [x] **17.5 `dom` CLI:** oneshot → stdout · `-wizard` 4 段（番号選択）· NonInteractive で wizard 拒否
- [x] **17.6 `nav` CLI:** `-enter` キー転送 · `-exit` · `-windowclose` は hint（misuse）· NonInteractive 拒否
- [x] **17.7 検証:** i18n EN+JA · `cargo test -p bmxt-core` · `cargo check -p bmxt-cli` · README / map_command.csv（手元スモークは下記）

**手元スモーク**

- [ ] `aboutbmxt` が URL を出し、Interactive でブラウザが開く（または URL のみで足りる）
- [ ] `aboutbmxt -system` が CLI 行 + 接続 peer の OK/NG 行を stdout に出す
- [ ] `bmxt exec -- 'dom -list --device <id> --tab <n> --html'` が DOM 行のみ（対話なし）
- [ ] REPL: `dom -wizard` で peer→tab→scope→flavor 後にログへ DOM
- [ ] REPL: `nav -enter` 後、キー操作が peer ページ overlay に反映 · `nav -exit` で消える
- [ ] `bmxt exec` で `dom -wizard` / `nav -enter` が明確に拒否（ハングしない）

**スコープ外（本節）**

- CLI 端末内へのページオーバーレイ HUD 描画
- `dom -list --with` の拡張フル UX（semantic menu / ビューポート連動フィルタ）の完全移植
- `dom \| jump` pipe（後続）
- `session` / `translate` / `tutorial` / `group` / `snapshot` 等の別ギャップ
- peer history delete

**参照:** plan `cli_dom_nav_about` · §10 · §13–15 · `shared/lib/features/dom/` · `shared/lib/features/nav/nav-tab-bridge.ts` · `shared/lib/features/capability/` · `hosts/cli/` · skill `bmxt-add-command` · `_context/cli-peer/CONTRACT.md`

### 18. CLI `nav`/`dom` ウィザードを ratatui picker 化し、picker を独立ディレクトリへ

**前提:** §17（`nav_control` / `dom_list` RPC · CLI host 専用 wizard · 共有コアの `nav`/`dom` 表示仕様は変えない）· §10（端末 overlay 非描画）· §14–15（Interactive のみ）。plan `cli_nav_picker_wizard`。

**目標:**

1. `nav -enter` を `dom -wizard` と同様、**実施ピア選択 → 実施ページ（tab）選択**のウィザードにする
2. 各選択は `tab -list | browse` と同じ **ratatui picker**（↑↓ `/` Enter / q）にする
3. picker 機能自体を拡張の `shared/lib/features/picker/` に倣い、CLI Rust では **`hosts/cli/src/picker/` 独立ディレクトリ**で管理する

**現状ギャップ**

| 面 | 状態 |
|----|------|
| `tab -list \| browse` | ratatui `run_tab_picker`（Enter=activate・開きっぱなし · live refresh）が [`hosts/cli/src/tui.rs`](hosts/cli/src/tui.rs) に同居 |
| `nav -enter` / `dom -wizard` | peer は `pick_peer_by_number`（stderr+stdin 番号）、tab/scope/flavor も番号選択 |
| ディレクトリ | picker 実装が `tui.rs` 一枚 (~751 行)。拡張側のような独立 `picker/` がない |

**製品方針（決定済み）**

| 項目 | 内容 |
|------|------|
| 共有コア / 拡張 | **変更しない**（`NavArm` のまま。peer/tab 選択は CLI host 専用） |
| `nav -enter` | Interactive: peer picker → tab one-shot picker → 既存 `nav_control` Start / key loop / Stop |
| `dom -wizard` | 同じ peer/tab picker に統一。scope / flavor も同ディレクトリの短い one-shot list |
| tab browse | Enter=activate・開きっぱなしの意味は維持（one-shot とは API 分離） |
| `--device/--tab` oneshot for nav | **本節では入れない**（要求はウィザード UI） |
| NonInteractive | 現状どおり wizard / キーループ拒否 |

**アーキテクチャ（要約）**

```
hosts/cli/src/picker/          ← 拡張 features/picker 相当（独立ディレクトリ）
  mod.rs / terminal.rs
  tab.rs      run_tab_picker（browse）· pick_tab_once（wizard）
  url.rs      run_url_picker
  peer.rs     pick_peer（ratatui one-shot · 番号入力廃止）
  oneshot.rs  汎用 short list（scope/flavor 等）

nav -enter / dom -wizard  → picker::peer → picker::tab oneshot → RPC
tab -list | browse        → picker::tab live（既存意味）
```

| Path（想定） | 役割 |
|--------------|------|
| `hosts/cli/src/picker/` | ratatui picker 実装の単一の置き場（`tui.rs` から移設） |
| `hosts/cli/src/dom_nav_host.rs` | wizard オーケストレーションのみ（番号 UI を持たない） |
| `hosts/cli/src/adapter.rs` | `tui::` → `picker::` 参照置換 · bare `--device` も `pick_peer` |
| `hosts/cli/src/tui.rs` | デモ薄いラッパに縮小、または削除して `picker` へ寄せる |
| `_context/cli-peer/CONTRACT.md` · README | picker ディレクトリ · nav/dom wizard UX |

**実装チェック（段階）**

- [ ] **18.0 契約:** 本節を `CONTRACT.md` / README に追記（CLI picker dir · nav/dom wizard = ratatui）
- [ ] **18.1 移設:** `tui.rs` → `hosts/cli/src/picker/{mod,terminal,tab,url,peer,oneshot}.rs` · `main.rs` に `mod picker` · 呼び出しを `picker::` へ
- [ ] **18.2 one-shot API:** `pick_peer` · `pick_tab_once`（Enter で閉じて返す · activate しない）· scope/flavor 用 short oneshot
- [ ] **18.3 `nav` wizard:** `run_nav_enter_session` を peer→tab picker → key loop に変更
- [ ] **18.4 `dom` wizard:** `run_dom_wizard` の peer/tab/scope/flavor を同 picker に統一
- [ ] **18.5 検証:** `cargo check -p bmxt-cli` · `check:cli-command-io` · i18n（必要なら）· 手元スモーク

**手元スモーク**

- [ ] REPL: `nav -enter` → peer picker → tab picker → キーが peer overlay に反映 · q/Esc で終了
- [ ] REPL: `dom -wizard` → 同 peer/tab picker → scope/flavor → DOM 行
- [ ] REPL: `tab -list | browse` が移設後も activate / live refresh 動作
- [ ] bare `--device`（history/bookmark/tab/search）が peer picker で選べる
- [ ] `bmxt exec` で `nav -enter` / `dom -wizard` が明確に拒否

**スコープ外（本節）**

- `nav -enter --device/--tab` oneshot
- 共有コアへの wizard 文法追加
- 拡張側 picker / nav / dom 表示・ロジック変更
- CLI 端末内へのページ overlay 描画

**参照:** plan `cli_nav_picker_wizard` · §17 · `hosts/cli/src/tui.rs` · `hosts/cli/src/dom_nav_host.rs` · `shared/lib/features/picker/` · `_context/cli-peer/CONTRACT.md`

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
| §15 | float ホスト — 廃止（Phase 3 ドキュメント整理済み） |
| §16 | `tab -back` 等 → **§18 で独立 first に置換済み** |
| §17 | Host IR bmxt-host/2（当時 Phases A–E・完了） |
| §18–19 | `back`/`forward`/`reload`/`close` + `tab:` チップ — 実装済・スモークは Active 3 |

**語彙索引:** `shared/lib/features/command-line/inter-command/` · `shared/manifest/templates/` · README アーキテクチャ節 · `hosts/README.md`。
