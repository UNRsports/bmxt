# BMXt — open work

Living checklist. Completed historical phases are summarized under **Archive** (not re-checked).

---

## Active

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
