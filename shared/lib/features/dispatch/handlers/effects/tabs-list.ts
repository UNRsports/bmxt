import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import type { UiLocale } from "../../../setting/locale"
import { getRunLocale } from "../../../setting/i18n/run-locale"
import type { DeviceListScope } from "../../../sync/bus/device-list-scope"
import { runTabsListPlain } from "../../../tabs/tabs-list-plain"

type E = Extract<HostEffect, { kind: "tabs_list" }>

function scopeFromEffect(e: E): DeviceListScope {
  if (e.device_scope === "peers") {
    return { kind: "peers" }
  }
  if (e.device_scope === "device" && e.device_id.trim().length > 0) {
    return { kind: "device", deviceId: e.device_id.trim() }
  }
  return { kind: "local" }
}

export async function applyTabsListEffect(_ctx: DispatchHostContext, e: E): Promise<string[]> {
  const locale: UiLocale = _ctx.uiLocale ?? getRunLocale()
  const showUrl = e.show_url === "true"
  const scope = scopeFromEffect(e)
  return runTabsListPlain({ showUrl, locale, scope })
}
