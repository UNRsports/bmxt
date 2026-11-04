/**
 * EN: Dispatcher — PC vs SP `commands` implementation.
 * JA: PC / SP の commands 実装を振り分ける。
 */

import { resolveFormFactor } from "./resolve-form-factor.ts"
import * as pc from "./pc/commands-api.ts"
import * as sp from "./sp/commands-api.ts"

function impl() {
  return resolveFormFactor() === "sp" ? sp : pc
}

export function hasCommandsApi(): boolean {
  return impl().hasCommandsApi()
}

export function getCommandsOnCommand(): typeof chrome.commands.onCommand | undefined {
  return impl().getCommandsOnCommand()
}
