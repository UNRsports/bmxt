---
name: bmxt-i18n
description: >-
  Adds or updates bilingual (EN + JA) user-visible strings in BMXt via i18n
  namespaces and translators. Use when adding UI text, command usage/errors,
  terminal logs, picker labels, status bars, help text, or editing
  lib/features/setting/i18n/.
---

# BMXt — Internationalization (i18n)

## Invariants

- **Bilingual default:** Every user-visible string = **EN + JA**.
- **No hard-coded UI text** in source (terminal logs, picker labels, command usage/errors, status bars, help).
- **Both locales grammatically natural** — not literal word-for-word translation.

## Where to add keys

Namespace JSON under **`lib/features/setting/i18n/namespaces/`**:

| Namespace file | Typical use |
|----------------|-------------|
| `cmd.json` | Command usage, errors |
| `tabs.json` | Tab / session UI |
| `setting.json` | Settings UI |

Resolve via namespace translators: **`tCmd`**, **`tTabs`**, **`tSetting`**, etc.

## Runtime locale

| Context | Locale source |
|---------|---------------|
| React UI | `useUiSettings().locale` |
| Non-React / shell handlers | `getRunLocale()` |
| Placeholders | `{name}` in JSON → `formatMessage` / namespace translators |

## Checklist

```
Task progress:
- [ ] Key added to correct namespace JSON (EN + JA)
- [ ] Source uses translator (tCmd / tTabs / tSetting / formatMessage) — not literal string
- [ ] Placeholders match between locales
- [ ] messages.test.ts catalog count updated if test asserts size
```

## Example

**cmd.json:**

```json
{
  "myCommand.usage": {
    "en": "Usage: mycommand -list",
    "ja": "使い方: mycommand -list"
  },
  "myCommand.error.missingArg": {
    "en": "Missing required argument: {name}",
    "ja": "必須引数がありません: {name}"
  }
}
```

**TypeScript:**

```typescript
tCmd("myCommand.usage");
tCmd("myCommand.error.missingArg", { name: argName });
```
