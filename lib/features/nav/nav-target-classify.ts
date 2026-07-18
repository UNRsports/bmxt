/**
 * EN: Nav target classification + identity keys (pure facts; page extracts facts from Element).
 * JA: nav 対象の分類と識別キー（純関数。Element → facts はページ側）。
 */

export type NavTargetKind =
  | "link"
  | "button-like"
  | "editable"
  | "media"
  | "maybe-interactive"
  | "inert"

export type NavTargetFacts = {
  tag: string
  role: string
  href: string | null
  ariaLabel: string | null
  alt: string | null
  nameAttr: string | null
  id: string | null
  title: string | null
  text: string
  disabled: boolean
  ariaHidden: boolean
  pointerEventsNone: boolean
  tabIndex: number
  contentEditable: boolean
  inputType: string | null
  cursorPointer: boolean
  isImg: boolean
  parentLinkHref: string | null
}

export type NavTargetIdentity = {
  kind: NavTargetKind
  /** EN: Primary display / memory key (not locale-dependent). */
  key: string
  /** EN: Lowercased strings used for incremental substring match. */
  matchKeys: string[]
  confidence: number
}

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "password",
  "url",
  "tel",
  "number"
])

function normalizeKeyPart(raw: string): string {
  return raw.replace(/\s+/g, " ").trim()
}

function pushUnique(list: string[], value: string): void {
  const n = normalizeKeyPart(value)
  if (n.length === 0) {
    return
  }
  const lower = n.toLowerCase()
  if (list.some((x) => x.toLowerCase() === lower)) {
    return
  }
  list.push(n)
}

/** EN: Stable URL fragment for matching (pathname + search; drop hash). */
export function stableHrefKey(href: string): string {
  const trimmed = href.trim()
  if (trimmed.length === 0) {
    return ""
  }
  try {
    const base =
      typeof location !== "undefined" && typeof location.href === "string"
        ? location.href
        : "https://example.invalid/"
    const u = new URL(trimmed, base)
    return `${u.pathname}${u.search}`
  } catch {
    return trimmed.split("#")[0] ?? trimmed
  }
}

function isEditableFacts(facts: NavTargetFacts): boolean {
  if (facts.contentEditable) {
    return true
  }
  const tag = facts.tag.toLowerCase()
  if (tag === "textarea") {
    return !facts.disabled
  }
  if (tag === "input") {
    if (facts.disabled) {
      return false
    }
    const t = (facts.inputType ?? "text").toLowerCase()
    return TEXT_INPUT_TYPES.has(t)
  }
  return false
}

function isLinkFacts(facts: NavTargetFacts): boolean {
  const tag = facts.tag.toLowerCase()
  const role = facts.role.toLowerCase()
  const href = (facts.href ?? "").trim()
  if (tag === "a" && href.length > 0) {
    return true
  }
  if (tag === "area" && href.length > 0) {
    return true
  }
  if (role === "link") {
    return true
  }
  if (href.length > 0 && tag !== "base" && tag !== "link") {
    return true
  }
  if (tag === "summary") {
    return true
  }
  return false
}

function isButtonLikeFacts(facts: NavTargetFacts): boolean {
  const tag = facts.tag.toLowerCase()
  const role = facts.role.toLowerCase()
  const inputType = (facts.inputType ?? "").toLowerCase()
  if (tag === "button") {
    return !facts.disabled
  }
  if (role === "button" || role === "menuitem" || role === "menuitemcheckbox" || role === "menuitemradio") {
    return !facts.disabled
  }
  if (tag === "input" && (inputType === "button" || inputType === "submit" || inputType === "reset")) {
    return !facts.disabled
  }
  return false
}

function isMediaFacts(facts: NavTargetFacts): boolean {
  if (facts.isImg) {
    return true
  }
  const tag = facts.tag.toLowerCase()
  const role = facts.role.toLowerCase()
  return tag === "img" || tag === "picture" || role === "img"
}

function isInertFacts(facts: NavTargetFacts): boolean {
  if (facts.ariaHidden || facts.disabled || facts.pointerEventsNone) {
    return true
  }
  return false
}

function buildLinkKeys(facts: NavTargetFacts): string[] {
  const keys: string[] = []
  const href = (facts.href ?? "").trim()
  if (href.length > 0) {
    pushUnique(keys, stableHrefKey(href))
    pushUnique(keys, href)
  }
  pushUnique(keys, facts.text)
  pushUnique(keys, facts.ariaLabel ?? "")
  pushUnique(keys, facts.title ?? "")
  return keys
}

function buildButtonKeys(facts: NavTargetFacts): string[] {
  const keys: string[] = []
  pushUnique(keys, facts.ariaLabel ?? "")
  pushUnique(keys, facts.text)
  pushUnique(keys, facts.title ?? "")
  pushUnique(keys, facts.nameAttr ?? "")
  pushUnique(keys, facts.id ?? "")
  return keys
}

function buildEditableKeys(facts: NavTargetFacts): string[] {
  const keys: string[] = []
  pushUnique(keys, facts.nameAttr ?? "")
  pushUnique(keys, facts.id ?? "")
  pushUnique(keys, facts.ariaLabel ?? "")
  pushUnique(keys, facts.title ?? "")
  pushUnique(keys, facts.text)
  return keys
}

function buildMediaKeys(facts: NavTargetFacts): string[] {
  const keys: string[] = []
  pushUnique(keys, facts.alt ?? "")
  pushUnique(keys, facts.ariaLabel ?? "")
  pushUnique(keys, facts.title ?? "")
  const parentHref = (facts.parentLinkHref ?? "").trim()
  if (parentHref.length > 0) {
    pushUnique(keys, stableHrefKey(parentHref))
  }
  return keys
}

function buildMaybeKeys(facts: NavTargetFacts): string[] {
  const keys: string[] = []
  pushUnique(keys, facts.ariaLabel ?? "")
  pushUnique(keys, facts.text)
  pushUnique(keys, facts.title ?? "")
  pushUnique(keys, facts.id ?? "")
  return keys
}

function primaryKey(keys: string[], fallback: string): string {
  if (keys.length > 0) {
    return keys[0]!
  }
  return fallback
}

/**
 * EN: Score-based classification from element facts (self → already-resolved real target).
 * JA: facts から確信度つき分類（実ターゲット解決後のノードを想定）。
 */
export function classifyNavTarget(facts: NavTargetFacts): NavTargetIdentity {
  if (isInertFacts(facts)) {
    return {
      kind: "inert",
      key: "",
      matchKeys: [],
      confidence: 1
    }
  }

  if (isEditableFacts(facts)) {
    const keys = buildEditableKeys(facts)
    return {
      kind: "editable",
      key: primaryKey(keys, facts.tag.toLowerCase()),
      matchKeys: keys.map((k) => k.toLowerCase()),
      confidence: keys.length > 0 ? 0.9 : 0.55
    }
  }

  if (isLinkFacts(facts)) {
    const keys = buildLinkKeys(facts)
    return {
      kind: "link",
      key: primaryKey(keys, "link"),
      matchKeys: keys.map((k) => k.toLowerCase()),
      confidence: keys.length > 0 ? 0.95 : 0.6
    }
  }

  if (isButtonLikeFacts(facts)) {
    const keys = buildButtonKeys(facts)
    return {
      kind: "button-like",
      key: primaryKey(keys, "button"),
      matchKeys: keys.map((k) => k.toLowerCase()),
      confidence: keys.length > 0 ? 0.9 : 0.55
    }
  }

  if (isMediaFacts(facts)) {
    const keys = buildMediaKeys(facts)
    return {
      kind: "media",
      key: primaryKey(keys, "img"),
      matchKeys: keys.map((k) => k.toLowerCase()),
      confidence: keys.length > 0 ? 0.85 : 0.5
    }
  }

  const maybeKeys = buildMaybeKeys(facts)
  const tabOk = facts.tabIndex >= 0
  const weak = facts.cursorPointer || tabOk
  if (weak) {
    return {
      kind: "maybe-interactive",
      key: primaryKey(maybeKeys, facts.tag.toLowerCase()),
      matchKeys: maybeKeys.map((k) => k.toLowerCase()),
      confidence: maybeKeys.length > 0 ? 0.45 : 0.3
    }
  }

  return {
    kind: "inert",
    key: "",
    matchKeys: [],
    confidence: 0.2
  }
}

export function formatNavTargetLabel(identity: NavTargetIdentity): string {
  if (identity.kind === "inert" || identity.key.length === 0) {
    return identity.kind
  }
  const short =
    identity.key.length > 48 ? `${identity.key.slice(0, 45)}…` : identity.key
  return `${identity.kind}:${short}`
}

/** EN: Resolve real activation target (prefer ancestor link / button). */
export function resolveNavRealTarget(el: Element): Element {
  if (!(el instanceof Element)) {
    return el
  }
  const link = el.closest("a[href], area[href], [role='link'], summary")
  if (link) {
    return link
  }
  const button = el.closest(
    "button, [role='button'], input[type='button'], input[type='submit'], input[type='reset']"
  )
  if (button) {
    return button
  }
  return el
}

function visibleTextOf(el: Element): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const labelled = el.getAttribute("aria-label") ?? el.getAttribute("placeholder") ?? ""
    return normalizeKeyPart(labelled || el.value || "")
  }
  const raw = (el.textContent ?? "").replace(/\s+/g, " ").trim()
  if (raw.length > 120) {
    return raw.slice(0, 120)
  }
  return raw
}

/** EN: Build facts from a DOM element (page / content-script context). */
export function collectNavTargetFacts(el: Element): NavTargetFacts {
  const html = el instanceof HTMLElement ? el : null
  const tag = el.tagName.toLowerCase()
  const role = (el.getAttribute("role") ?? "").trim()
  const hrefAttr = el.getAttribute("href")
  const parentLink = el.closest("a[href]")
  const parentHref =
    parentLink && parentLink !== el ? parentLink.getAttribute("href") : null

  let cursorPointer = false
  let pointerEventsNone = false
  if (html && typeof getComputedStyle === "function") {
    try {
      const st = getComputedStyle(html)
      cursorPointer = st.cursor === "pointer"
      pointerEventsNone = st.pointerEvents === "none"
    } catch {
      /* ignore */
    }
  }

  const disabled =
    (html instanceof HTMLButtonElement && html.disabled) ||
    (html instanceof HTMLInputElement && html.disabled) ||
    (html instanceof HTMLTextAreaElement && html.disabled) ||
    (html instanceof HTMLSelectElement && html.disabled) ||
    el.getAttribute("aria-disabled") === "true"

  const inputType =
    html instanceof HTMLInputElement ? (html.type || "text").toLowerCase() : null

  const isImg =
    tag === "img" ||
    tag === "picture" ||
    role.toLowerCase() === "img" ||
    (html instanceof HTMLInputElement && inputType === "image")

  return {
    tag,
    role,
    href: hrefAttr,
    ariaLabel: el.getAttribute("aria-label"),
    alt: el.getAttribute("alt"),
    nameAttr: el.getAttribute("name"),
    id: el.getAttribute("id"),
    title: el.getAttribute("title"),
    text: visibleTextOf(el),
    disabled,
    ariaHidden:
      el.getAttribute("aria-hidden") === "true" ||
      (html?.closest("[aria-hidden='true']") != null && html.getAttribute("aria-hidden") !== "false"),
    pointerEventsNone,
    tabIndex: html?.tabIndex ?? -1,
    contentEditable: html?.isContentEditable === true,
    inputType,
    cursorPointer,
    isImg,
    parentLinkHref: parentHref
  }
}

export function identifyNavElement(el: Element): NavTargetIdentity {
  const real = resolveNavRealTarget(el)
  return classifyNavTarget(collectNavTargetFacts(real))
}
