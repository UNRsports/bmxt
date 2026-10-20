import { tTabs, type TabsMessageKey } from "../../setting/i18n/ns/tabs"
import type { UiLocale } from "../../setting/locale"

export type HeadlineContext = {
  bulkSubMode?: string | null
  groupNewPhase?: string
  variant?: string
  editPanelKind?: string | null
  actionMenuOpen?: boolean
}

function commonPart(locale: UiLocale): string {
  return tTabs("tabs.picker.headline.common", locale)
}

function withCommon(key: TabsMessageKey, locale: UiLocale): string {
  return tTabs(key, locale, { common: commonPart(locale) })
}

export function resolveHeadline(ctx: HeadlineContext, locale: UiLocale): string {
  const bulkSubMode = ctx.bulkSubMode ?? null
  const groupNewPhase = ctx.groupNewPhase ?? "tabs"
  const variant = ctx.variant ?? "default"
  const editPanelKind = ctx.editPanelKind ?? null
  const actionMenuOpen = ctx.actionMenuOpen ?? false

  if (actionMenuOpen && bulkSubMode === null && editPanelKind === null) {
    return withCommon("tabs.picker.headline.actionMenu", locale)
  }

  if (bulkSubMode === "group" && groupNewPhase === "meta") {
    return tTabs("tabs.picker.headline.groupMeta", locale)
  }
  if (variant === "groupNew" && groupNewPhase === "meta") {
    return tTabs("tabs.picker.headline.groupNewMeta", locale)
  }
  if (variant === "groupNew" && groupNewPhase === "tabs") {
    return tTabs("tabs.picker.headline.groupNewTabs", locale)
  }

  switch (bulkSubMode) {
    case "move":
      return withCommon("tabs.picker.headline.move", locale)
    case "close":
      return withCommon("tabs.picker.headline.close", locale)
    case "newTab":
      return withCommon("tabs.picker.headline.newTab", locale)
    case "group":
      return withCommon("tabs.picker.headline.group", locale)
    case "newWindow":
      return withCommon("tabs.picker.headline.newWindow", locale)
    case "reload":
      return withCommon("tabs.picker.headline.reload", locale)
    case "edit":
      if (editPanelKind === "windowRename") {
        return withCommon("tabs.picker.headline.editWindowRename", locale)
      }
      if (editPanelKind === "groupRename") {
        return withCommon("tabs.picker.headline.editGroupRename", locale)
      }
      if (editPanelKind === "groupMenu") {
        return withCommon("tabs.picker.headline.editGroupMenu", locale)
      }
      return withCommon("tabs.picker.headline.edit", locale)
    default:
      return withCommon("tabs.picker.headline.default", locale)
  }
}

export function resolveTabsPickerHeadline(context: HeadlineContext, locale: UiLocale): string {
  return resolveHeadline(context, locale)
}
