/**
 * EN: SP (Fenix) — `commands` unsupported; never touch `chrome.commands`.
 * JA: SP（Fenix）— commands 非対応。chrome.commands に触らない。
 */

export function hasCommandsApi(): boolean {
  return false
}

export function getCommandsOnCommand(): typeof chrome.commands.onCommand | undefined {
  return undefined
}
