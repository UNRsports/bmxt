import {
  pickUiLabel,
  pickUiLines,
  uiBulletPrefix,
  type BilingualLines,
  type BilingualUiLabel,
  type UiLocale
} from "./locale"
import type { TranslationPairId } from "../translate/translation-pair"
import { getTranslationPairDef } from "../translate/translation-pair"
import type { TabsPageActiveMode } from "../tabs/page-active-setting"

export type { BilingualLines, BilingualUiLabel }

export const SHELL_WELCOME: BilingualUiLabel = {
  en: "Welcome to BMXt! This program is a test version.",
  ja: "BMXtへようこそ！本プログラムはテストバージョンです。"
}

export const SHELL_HELP_HINT: BilingualUiLabel = {
  en: "Type help and press Enter. Tab completes commands.",
  ja: "help と入力して Enter。Tab でコマンドを補完します。"
}

export function versionUpgradeTitle(locale: UiLocale, version: string): string {
  return locale === "en"
    ? `◆Version upgrade — ${version}`
    : `◆バージョンアップ — ${version}`
}

export const WELCOME_PAGE_TITLE: BilingualUiLabel = {
  en: "Welcome to BMXt",
  ja: "BMXtへようこそ"
}

export const WELCOME_PREVIEW_SUBTITLE: BilingualUiLabel = {
  en: "Preview: welcome content for",
  ja: "プレビュー: URL の"
}

export const WELCOME_PREVIEW_SUFFIX: BilingualUiLabel = {
  en: "(URL query).",
  ja: "で指定した版のウェルカム内容を表示しています。"
}

export const SEARCH_PAGE_SCAN_HINT: BilingualUiLabel = {
  en: "Page scan may take a while when many tabs are open. Ctrl+C cancels.",
  ja: "タブが多いと時間がかかります。Ctrl+C で中断できます。"
}

export const SEARCH_PAGE_SCAN_CANCELLED: BilingualUiLabel = {
  en: "Page scan cancelled.",
  ja: "ページ走査を中断しました。"
}

export const SEARCH_PAGE_NO_TEXT_HINT: BilingualUiLabel = {
  en: "With site access enabled, reload the pages you want to search (F5), then run search -list --page again.",
  ja: "サイトアクセスを有効にしている場合は、検索したいページを再読み込み（F5）してから search -list --page を再実行してください。"
}

export const TABS_SETTING_HINT: BilingualUiLabel = {
  en: "`-setting -page-active` controls tab preview on highlight (`--auto` default, `--manual` needs Alt).",
  ja: "`-setting -page-active` でハイライト時のタブアクティブ化を切替（`--auto` 既定、`--manual` は Alt）。"
}

export const TRANSLATE_USAGE_HINT: BilingualUiLabel = {
  en: "`-on` enables translation assist (nav typing preview under the prompt).",
  ja: "`-on` で翻訳アシストを有効化（nav typing 時はプロンプト下に訳プレビュー）。`-setting` でペアを選びます。"
}

export function translateOnLogLine(locale: UiLocale, pairToken: string): string {
  return locale === "en"
    ? `translate: ON (${pairToken}) — nav typing preview under prompt · Alt hold to commit`
    : `translate: ON (${pairToken}) — nav typing でプロンプト下に訳プレビュー · Alt 長押しで送信`
}

export const NAV_EXIT_ACTIVE_ERROR: BilingualUiLabel = {
  en: "error: turn nav off with Alt on the prompt first, then run nav -exit.",
  ja: "error: 先に Alt で nav を OFF にしてから nav -exit を実行してください。"
}

export const NAV_ARMED_LOG: BilingualUiLabel = {
  en: "nav — armed (Alt on prompt toggles page cursor ON/OFF · ↑↓←→ move · Enter click/type · nav -exit to quit)",
  ja: "nav — 起動済み（プロンプトで Alt がページカーソル ON/OFF · ↑↓←→ 移動 · Enter クリック/入力 · nav -exit で終了）"
}

export const NAV_HOST_ACCESS_WARNING: BilingualUiLabel = {
  en: "warning: http(s) site access was not granted — allow it before Alt ON, or enable site access under chrome://extensions.",
  ja: "warning: http(s) のサイトアクセスが未許可です — Alt ON の前に許可するか、chrome://extensions でサイトアクセスを有効にしてください。"
}

export const SECOND_COMMAND_PICKER_ARIA: BilingualUiLabel = {
  en: "Second command",
  ja: "第二コマンド"
}

export const SECOND_COMMAND_PICKER_HINT: BilingualUiLabel = {
  en: "Second command · ↑↓ / Tab · Enter · Esc",
  ja: "第二コマンド · ↑↓ / Tab · Enter · Esc"
}

export const DOM_PROMPT_HEADLINE: BilingualUiLabel = {
  en: "dom -list — permission / target check · Enter=Allow / Y · Esc/N → prompt",
  ja: "dom -list — 許可 / 対象確認 · Enter=許可 / Y · Esc/N → prompt"
}

export const DOM_PROMPT_ARIA: BilingualUiLabel = {
  en: "Permission prompt",
  ja: "許可ダイアログ"
}

export const DOM_PROMPT_APPROVE: BilingualUiLabel = {
  en: "Allow (Enter / Y)",
  ja: "許可 (Enter / Y)"
}

export const DOM_PROMPT_APPROVE_BUSY: BilingualUiLabel = {
  en: "Requesting…",
  ja: "要求中…"
}

export const DOM_PROMPT_RETURN: BilingualUiLabel = {
  en: "Return to prompt (Esc / N)",
  ja: "プロンプトへ (Esc / N)"
}

export const DOM_PROMPT_SCROLL_HINT: BilingualUiLabel = {
  en: "↑↓ / j k to scroll messages",
  ja: "↑↓ / j k でメッセージをスクロール"
}

export const DOM_PROMPT_DENIED: BilingualUiLabel = {
  en: "Permission was not granted by the browser; keeping the picker open so you can retry.",
  ja: "ブラウザで許可されませんでした。ピッカーを開いたままにします — 再度 Enter で許可、または Esc でプロンプトへ。"
}

export const OPTIONAL_HOST_DENIED_HINT: BilingualUiLabel = {
  en: "Approve access when prompted, or enable site access for BMXt under chrome://extensions → Details.",
  ja: "表示されたダイアログで許可するか、chrome://extensions の詳細でサイトへのアクセスを有効にしてから再度実行してください。"
}

export const PLAIN_PICKER_KEYS_HINT: BilingualUiLabel = {
  en: "Plain picker keys",
  ja: "ピッカー操作"
}

export const PLAIN_PICKER_SEARCH_HINT: BilingualUiLabel = {
  en: "Search highlight",
  ja: "検索ハイライト"
}

export const PLAIN_PICKER_COMMAND_HINT: BilingualUiLabel = {
  en: "Command input",
  ja: "コマンド入力"
}

export function navStatusHint(
  locale: UiLocale,
  mode: "typing" | "typingMultiline" | "selStart" | "selEnd" | "copyOpen" | "copyClosed" | "menu" | "idle"
): string {
  const copy: Record<typeof mode, BilingualUiLabel> = {
    typing: {
      en: "Type on the BMXt prompt · Alt hold to commit · Esc hold to cancel",
      ja: "BMXt コマンドラインで入力 · Alt 長押しで送信 · Esc 長押しでキャンセル"
    },
    typingMultiline: {
      en: "Type on the BMXt prompt · Shift+Enter newline · Alt hold to commit · Esc hold to cancel",
      ja: "BMXt コマンドラインで入力 · Shift+Enter で改行 · Alt 長押しで送信 · Esc 長押しでキャンセル"
    },
    selStart: {
      en: "↑↓ move · Enter to start selection · Esc/Ctrl to cancel",
      ja: "↑↓ 移動 · Enter で選択開始 · Esc/Ctrl で取消"
    },
    selEnd: {
      en: "↑↓ move · range preview · Enter to confirm · Esc/Ctrl to cancel",
      ja: "↑↓ 移動 · 範囲プレビュー · Enter で確定 · Esc/Ctrl で取消"
    },
    copyOpen: {
      en: "Copy · Enter to run · Esc to clear selection",
      ja: "コピー · Enter 実行 · Esc で選択解除"
    },
    copyClosed: {
      en: "Esc to clear selection",
      ja: "Esc で選択解除"
    },
    menu: {
      en: "↑↓ items · Enter run · ←→ history · Ctrl/Esc close",
      ja: "↑↓ 項目 · Enter 実行 · ←→ 履歴 · Ctrl/Esc で閉じる"
    },
    idle: {
      en: "↑↓←→ move · Enter click/type · Ctrl menu · Alt toggle · nav -exit to quit",
      ja: "↑↓←→ 移動 · Enter クリック/入力 · Ctrl メニュー · Alt 切替 · nav -exit で終了"
    }
  }
  return pickUiLabel(copy[mode], locale)
}

export function translateStatusMeta(
  locale: UiLocale,
  busy: boolean,
  navTypingAssist: boolean,
  statusNote: string | null
): string {
  if (statusNote !== null && statusNote.length > 0) {
    return statusNote
  }
  if (busy) {
    return locale === "en" ? "translating…" : "翻訳中…"
  }
  if (navTypingAssist) {
    return locale === "en" ? "nav typing assist" : "nav typing アシスト"
  }
  return locale === "en" ? "assist ON" : "アシスト ON"
}

export function translateStatusHint(
  locale: UiLocale,
  pairId: TranslationPairId,
  navTypingAssist: boolean,
  navTypingMultiline: boolean
): string {
  if (!navTypingAssist) {
    const pairLabel = getTranslationPairDef(pairId).statusLabel
    return locale === "en"
      ? `translate -off to disable · ${pairLabel} · nav typing for preview · 500ms idle triggers translation`
      : `translate -off で無効化 · ${pairLabel} · nav typing で訳 · 入力停止500msで 訳`
  }
  const commitEn = getTranslationPairDef(pairId).commitLanguage === "en"
  const commitHint = commitEn
    ? locale === "en"
      ? "Alt hold to send English"
      : "Alt 長押しで英訳を送信"
    : locale === "en"
      ? "Alt hold to send Japanese"
      : "Alt 長押しで和訳を送信"
  const base =
    locale === "en"
      ? `nav typing · 500ms idle triggers translation · ${commitHint}`
      : `nav typing · 入力停止500msで 訳 · ${commitHint}`
  return navTypingMultiline
    ? locale === "en"
      ? `${base} · Shift+Enter newline`
      : `${base} · Shift+Enter で改行`
    : base
}

export function tabsStatusHint(locale: UiLocale, pageActiveMode: TabsPageActiveMode): string {
  if (pageActiveMode === "auto") {
    return locale === "en"
      ? "↑↓ activates tab on highlight (window stays behind) · Enter to jump"
      : "↑↓ でハイライト移動時にタブをアクティブ化（ウィンドウは背面） · Enter でジャンプ"
  }
  return locale === "en"
    ? "Alt+↑↓ to activate tab · Enter to jump · tabs -setting -page-active to switch"
    : "Alt+↑↓ でタブをアクティブ化 · Enter でジャンプ · tabs -setting -page-active で切替"
}

export function optionalHostDeniedLines(locale: UiLocale): string[] {
  return [
    "error: http(s) site access was not granted (optional host permission).",
    pickUiLabel(OPTIONAL_HOST_DENIED_HINT, locale)
  ]
}

export function formatBulletedLines(
  entry: BilingualLines,
  locale: UiLocale
): string[] {
  const prefix = uiBulletPrefix(locale)
  return pickUiLines(entry, locale).map((line) => `${prefix}${line}`)
}

const DOM_LIST_UNAVAILABLE: BilingualUiLabel = {
  en: "dom -list — unavailable",
  ja: "dom -list — 表示不可"
}

const DOM_LIST_NO_TARGET: BilingualUiLabel = {
  en: "No target tab — focus a normal browser window with a page.",
  ja: "対象タブがありません。通常のブラウザウィンドウでページを開いてください。"
}

const DOM_LIST_UNSCRIPTABLE: BilingualUiLabel = {
  en: "This extension cannot show DOM on pages Chrome blocks from scripting (chrome://, Web Store, extension pages, etc.).",
  ja: "権限のないページのため、本拡張機能では DOM を表示できません。"
}

const DOM_LIST_CAPTURE_FAILED: BilingualUiLabel = {
  en: "Could not capture DOM on this page.",
  ja: "このページでは DOM を取得できませんでした。"
}

export function domListNoTargetLines(
  locale: UiLocale,
  title: string,
  url: string
): string[] {
  return [
    pickUiLabel(DOM_LIST_UNAVAILABLE, locale),
    pickUiLabel(DOM_LIST_NO_TARGET, locale),
    `target: ${title}`,
    `url: ${url}`
  ]
}

export function domListUnscriptableLines(
  locale: UiLocale,
  title: string,
  url: string,
  reason?: string
): string[] {
  const lines = [
    pickUiLabel(DOM_LIST_UNAVAILABLE, locale),
    pickUiLabel(DOM_LIST_UNSCRIPTABLE, locale),
    `target: ${title}`,
    `url: ${url}`
  ]
  if (reason) {
    lines.push(`detail: ${reason}`)
  }
  return lines
}

export function domListCaptureFailedLines(
  locale: UiLocale,
  title: string,
  url: string,
  detail: string
): string[] {
  return [
    pickUiLabel(DOM_LIST_UNAVAILABLE, locale),
    pickUiLabel(DOM_LIST_CAPTURE_FAILED, locale),
    `detail: ${detail}`,
    `target: ${title}`,
    `url: ${url}`
  ]
}
