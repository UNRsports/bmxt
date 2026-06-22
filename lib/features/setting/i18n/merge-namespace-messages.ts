/**
 * EN: Merge per-namespace JSON catalogs into one lookup table (source of truth for `t()`).
 * JA: namespace 別 JSON を 1 つの lookup に統合（`t()` のソース）。
 */

import cmd from "./namespaces/cmd.json"
import common from "./namespaces/common.json"
import dom from "./namespaces/dom.json"
import domList from "./namespaces/domList.json"
import domPrompt from "./namespaces/domPrompt.json"
import effect from "./namespaces/effect.json"
import error from "./namespaces/error.json"
import group from "./namespaces/group.json"
import help from "./namespaces/help.json"
import imeToken from "./namespaces/imeToken.json"
import modeStatus from "./namespaces/modeStatus.json"
import nav from "./namespaces/nav.json"
import optionalHost from "./namespaces/optionalHost.json"
import picker from "./namespaces/picker.json"
import plainPicker from "./namespaces/plainPicker.json"
import prompt from "./namespaces/prompt.json"
import search from "./namespaces/search.json"
import secondCommandPicker from "./namespaces/secondCommandPicker.json"
import session from "./namespaces/session.json"
import setting from "./namespaces/setting.json"
import shell from "./namespaces/shell.json"
import tabs from "./namespaces/tabs.json"
import translate from "./namespaces/translate.json"
import versionUpgrade from "./namespaces/versionUpgrade.json"
import welcome from "./namespaces/welcome.json"
import windows from "./namespaces/windows.json"
import type { UiLocale } from "../locale"

export type LocaleMessageEntry = Partial<Record<UiLocale, string>>

const MERGED = {
  ...cmd,
  ...common,
  ...dom,
  ...domList,
  ...domPrompt,
  ...effect,
  ...error,
  ...group,
  ...help,
  ...imeToken,
  ...modeStatus,
  ...nav,
  ...optionalHost,
  ...picker,
  ...plainPicker,
  ...prompt,
  ...search,
  ...secondCommandPicker,
  ...session,
  ...setting,
  ...shell,
  ...tabs,
  ...translate,
  ...versionUpgrade,
  ...welcome,
  ...windows
} as const satisfies Record<string, LocaleMessageEntry>

export type MergedMessageKey = keyof typeof MERGED

export const MERGED_MESSAGES: Record<MergedMessageKey, LocaleMessageEntry> = MERGED
