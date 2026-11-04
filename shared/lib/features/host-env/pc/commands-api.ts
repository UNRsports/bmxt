/**
 * EN: PC — `chrome.commands` is available.
 * JA: PC — commands API あり。
 */

export function hasCommandsApi(): boolean {
  return typeof chrome !== "undefined" && chrome.commands !== undefined
}

export function getCommandsOnCommand(): typeof chrome.commands.onCommand | undefined {
  if (!hasCommandsApi()) {
    return undefined
  }
  return chrome.commands.onCommand
}
