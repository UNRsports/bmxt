# BMXt — open work

Living checklist. Completed historical phases are summarized under **Archive** (not re-checked).

---

## Active

### 0. Test / CI hygiene（次対応・優先）

評価どおり現行 CI は実用レベル。運用スケール前に漏れ防止を先に潰す。

- [x] **① ユニットテストのグロブ化（最優先）** — `package.json` の `test` を `node --experimental-strip-types --test "lib/**/*.test.ts" "scripts/**/*.test.mjs"` に変更。未掲載だったテストを回収（`session-state-ops` を node:test 化、`withoutLogPatches` を軽量モジュールへ移動、node ESM 用に `.ts` 拡張子を補完）
- [ ] **② E2E ハッピーパスの拡充** — 現状 `e2e/prompt-cjk.spec.ts` のみ。タブ操作・DOM・session・Welcome 等の主要正常系を Playwright で段階追加（ドメインは unit、E2E は統合に寄せる）
- [ ] **③ カバレッジ可視化** — `c8` または Node `--experimental-test-coverage`。生成物・注入スクリプトは除外。最初は可視化用途（% ゲートは慎重）
- [ ] **④ Prettier / ESLint を verify へ** — Prettier は依存・`.prettierrc.mjs` あり → `prettier --check` を低コストで追加可。ESLint は未導入のため導入判断・設定設計が必要（既存 `tsc` / `check:no-fetch` / `check:generated` と役割分担）

### A. `| browse` pipe-only（実装済み — 手元スモーク）

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

### B. Open product

- [ ] **dom Enter** — ピッカー行 Enter の確定挙動（旧 §7）
- [ ] （任意）find/dom 系の `PickerListShell` 統合
- [ ] （任意）`TabPickerOverlay` リネーム掃除

### C. Manual smoke backlog

実装は完了扱い。退行確認のみ。

| 領域 | 確認 |
|------|------|
| nav | HUD / 属性ジャンプ / typing · Alt ON/OFF |
| float | デュアルホスト・handoff・ショートカット |
| 独立動詞 | `back` / `forward` / `reload` / `close`（裸 + `tab -list \| …` + `#t:… \| …`） |
| `tab:` チップ | 複数選択 → パイプ |
| compound / pipe | `&&` `\|\|` `;` と `|` の併用・短絡 |
| list columns | tab / search / dom / setting / session |

### D. Float 表示失敗時: 注入優先 → 選択肢A（実装済み — 手元スモーク）

**背景:** float モードで tabs ピッカー（page-active **auto** 含む）がタブを活性化したとき、移動先に常駐 CS（`bmxt-nav-overlay`）が未注入だと `showBmxtFloatOnTabAsync` が `sendMessage` 失敗を握りつぶし、プロンプトが出ない。

**方針（採用）**

1. **本線:** ページリロードなし。nav と同様に CS 優先 → 失敗時 `chrome.scripting.executeScript` で常駐 CS を注入 → 再 show → 短リトライ
2. **フォールバック（選択肢A）:** 注入後も show 不可、または非 scriptable なら既存 `switchwindow` 相当で **自動 float→popup**（sessions/browse/pickers を pending handoff）
3. **復帰:** popup ホストのピッカー活性化で dest が show 可能なら **自動 popup→float** して外部窓を閉じる
4. **採らない:** 選択肢B（float で auto 禁止）、`tabs.reload` 前提、auto 中の `permissions.request`

| 原因 | リロードなしで直るか |
|------|----------------------|
| 拡張有効前から開いていたタブ / 拡張再読込後 | 可（注入） |
| `document_idle` 前のレース | 可（短リトライ + 注入） |
| discarded タブ | ほぼ可（活性化後に注入） |
| `chrome://` / Web Store / PDF 等 | 不可 → A |
| optional host 未許可で executeScript も拒否 | 不可 → A |

**実装チェック**

- [x] Phase 1 — `showBmxtFloatOnTabAsync`: 成否 boolean + CS inject fallback（`canScriptHttpHostPages`）+ 短リトライ
- [x] Phase 1 — `runFloatActivateHandoff` / `placeFloatHandoffOnTab` が show 成否を見る
- [x] Phase 2 — SW ヘルパ `autoSwitchFloatToPopup` / `autoSwitchPopupToFloat`（`switch_window` / popup pending 再利用）
- [x] Phase 2 — activate handoff 失敗 → 自動 float→popup
- [x] Phase 2 — popup ピッカー活性化で show 可なら自動 popup→float（serialize・同一タブ連続トグル禁止）
- [x] Phase 3 — 単体テスト（CS あり / 注入後成功 / 注入不可→A）
- [x] Phase 3 — i18n ログ1行（自動退避・自動復帰、EN+JA）

**主なファイル:** `lib/features/bmxt-float/float-host-control.ts` · `float-activate-handoff.ts` · `entrypoints/background/float-launch.ts` · `background-services.ts` · `switch-window.ts` · tabs picker activate 経路

**手元スモーク（実装後）**

- [ ] float + auto: CS 未注入の http(s) タブへ移動 → リロードなしでフロートが出る
- [ ] float + auto: 非 scriptable / 注入不可タブへ移動 → popup に退避しログが出る
- [ ] popup 退避後、フロート可能なタブへ auto 移動 → float へ復帰し popup が閉じる

---

## Archive（ポインタのみ）

| 旧節 | 要約 |
|------|------|
| §1–7 | side-picker 再構成 → `lib/features/side-picker/` |
| §8–9 | `ListResult` / `-list` レジストリ（`--picker` は廃止済み） |
| §10 | BMXt POSIX Profile（README 公開・conformance テスト） |
| §11 | 旧プレフィックス `picker`/`browse <list>` 時代。**`| browse` に置換**（本 Active A） |
| §12 | nav インクリメンタル — 実装済・スモークは Active C |
| §13–14 | WASM prompt / complete SoT |
| §15 | float ホスト — 実装済・スモークは Active C |
| §16 | `tab -back` 等 → **§18 で独立 first に置換済み** |
| §17 | Host IR bmxt-host/2（Phases A–E 完了） |
| §18–19 | `back`/`forward`/`reload`/`close` + `tab:` チップ — 実装済・スモークは Active C |

**語彙索引:** `lib/features/command-line/inter-command/` · `manifest/templates/` · README アーキテクチャ節。
