# Adding a built-in shell command

真実は **`manifest/bmxt-codegen.json`**。**`npm run codegen`** が `registry/table.rs`・補完フォールバック・Effect 型・`apply-dispatch.gen.ts` を再生成する。

## クイック（スキャフォールド）

```bash
npm run new:command -- <rust_module> <canonical_name> [aliases...]
# 例: npm run new:command -- probe probe p
```

`cmd/<module>.rs`・`manifest` の `commands[]`・`cmd/mod.rs` を更新し **codegen** する。`run` の中身と **manifest の `usagePrimary`** を仕上げる。

## 手動

1. **`manifest/bmxt-codegen.json`** の **`commands`** に `{ module, canonicalName, aliases, usagePrimary }` を追加（**`module`** は `cmd/*.rs` のファイル名と一致させる）。
2. **`wasm/bmxt-core/src/cmd/<module>.rs`** を追加。`pub const CMD` の `name` / `aliases` / `usage_primary` を manifest と一致させる。
3. **`cmd/mod.rs`** に `pub mod <module>;`。
4. **`npm run codegen`** — **`registry/table.rs`** が生成され `command_registry!` が埋まる。
5. 振る舞いを `run` に実装。Chrome が要るときは下記 **Effect** も参照。

## Chrome Effect を足す場合

1. **`manifest/bmxt-codegen.json`** の **`effects`** に 1 エントリ（`kind`, `rustVariant`, `shape`, `fields`, `tsHandlerFile`, `tsHandlerExport`）。
2. **`npm run codegen`**。
3. **`lib/features/dispatch/handlers/effects/<tsHandlerFile>.ts`** を新規作成し、**`tsHandlerExport`** 関数を実装（引数は `Extract<ChromeEffect, { kind: ... }>`）。
4. **`cargo test`** / **`npx tsc --noEmit`**。

## 検証

- **`npm run verify:manifest`** — manifest の各コマンドと `cmd/*.rs` の `CMD` が一致するか。
- **`npm run check:generated`** — codegen 後に生成物に未コミット差分がないか（CI でも実行）。

## Interactive-only（このパイプ外）

タブピッカーなど、`cmd/` 経由しない UI 処理は引き続き `lib/features/bmxt-window/` 等。

**English:** The single source of truth is **`manifest/bmxt-codegen.json`**. Run **`npm run codegen`** after edits. **`npm run new:command`** scaffolds a command module and manifest entry.
