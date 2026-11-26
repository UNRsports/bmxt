/**
 * EN: Soft in-tab Sheets focus via Name Box only (MAIN world).
 *     Do not combine with Find shortcuts or location.assign — that crashes Sheets UI
 *     (especially with filters); host `tabs.update` is the fallback.
 * JA: Name Box のみでタブ内フォーカス（MAIN world）。
 *     Find ショートカットや location.assign と併用しない（フィルタ時に Sheets が落ちる）。
 *     失敗時はホストの `tabs.update` に任せる。
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function findNameBoxInput(): HTMLInputElement | null {
  const selectors = [
    "input#t-name-box-input",
    "input.docs-name-box-input",
    "#t-name-box input",
    'input[aria-label="Name box"]',
    'input[aria-label="名前ボックス"]'
  ]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el instanceof HTMLInputElement) {
      return el
    }
  }
  return null
}

function setInputValue(input: HTMLInputElement, value: string): void {
  input.focus()
  input.select()
  const proto = Object.getPrototypeOf(input) as object
  const desc = Object.getOwnPropertyDescriptor(proto, "value")
  if (desc?.set) {
    desc.set.call(input, value)
  } else {
    input.value = value
  }
  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

function pressEnter(input: HTMLInputElement): void {
  const opts: KeyboardEventInit = {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  }
  input.dispatchEvent(new KeyboardEvent("keydown", opts))
  input.dispatchEvent(new KeyboardEvent("keypress", opts))
  input.dispatchEvent(new KeyboardEvent("keyup", opts))
}

/**
 * EN: Runs via `executeScript({ func, world: "MAIN" })` — no imports.
 * JA: executeScript MAIN 用。import 禁止。
 */
export async function bmxtNavigateSheetsCellInPage(
  _gid: string,
  cellRef: string,
  _cellValue: string,
  _preferFind: boolean
): Promise<boolean> {
  const ref = typeof cellRef === "string" ? cellRef.trim().toUpperCase() : ""
  if (!/^[A-Z]{1,3}\d{1,7}$/.test(ref)) {
    return false
  }
  const input = findNameBoxInput()
  if (!input) {
    return false
  }
  try {
    setInputValue(input, ref)
    pressEnter(input)
    await sleep(80)
    return true
  } catch {
    return false
  }
}
