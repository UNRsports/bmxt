/**
 * EN: Shared child-index paths for injected DOM scripts (light DOM + shadow + same-origin iframe).
 * JA: 注入 DOM 用 path（通常 DOM・shadow・同一オリジン iframe）。
 */

/** EN: Next segment indexes into `element.shadowRoot.children`. */
export const DOM_PATH_SHADOW = -1

/** EN: Next segments are relative to `iframe.contentDocument.body`. */
export const DOM_PATH_IFRAME = -2

function parentElementChain(el: Element): Element | null {
  if (el.parentElement) {
    return el.parentElement
  }
  const parent = el.parentNode
  return parent instanceof Element ? parent : null
}

function childIndex(parent: Element, child: Element): number {
  for (let i = 0; i < parent.children.length; i += 1) {
    if (parent.children[i] === child) {
      return i
    }
  }
  return -1
}

export function resolveNodeFromPath(
  segments: readonly number[],
  topBody: Element = document.body
): Element | null {
  if (segments.length === 0) {
    return topBody
  }
  let node: Element | null = topBody
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!
    if (seg === DOM_PATH_SHADOW) {
      const shadow = node?.shadowRoot
      if (!shadow) {
        return null
      }
      i += 1
      if (i >= segments.length) {
        return null
      }
      const idx = segments[i]!
      if (idx < 0) {
        return null
      }
      node = shadow.children[idx] ?? null
      continue
    }
    if (seg === DOM_PATH_IFRAME) {
      if (!(node instanceof HTMLIFrameElement)) {
        return null
      }
      const subBody = node.contentDocument?.body ?? null
      if (!subBody) {
        return null
      }
      node = subBody
      continue
    }
    if (seg < 0) {
      return null
    }
    node = node?.children[seg] ?? null
    if (!node) {
      return null
    }
  }
  return node
}

export function buildPathForElement(
  el: Element,
  topBody: Element = document.body
): number[] | null {
  const doc = el.ownerDocument
  if (!doc.body) {
    return null
  }
  const innerPath: number[] = []
  let node: Element | null = el

  while (node && node !== doc.body) {
    const parent = parentElementChain(node)
    if (parent) {
      const idx = childIndex(parent, node)
      if (idx < 0) {
        return null
      }
      innerPath.unshift(idx)
      node = parent
      continue
    }
    const root = node.getRootNode()
    if (root instanceof ShadowRoot && root.host instanceof Element) {
      innerPath.unshift(DOM_PATH_SHADOW)
      node = root.host
      continue
    }
    return null
  }

  if (node !== doc.body) {
    return null
  }

  if (doc === topBody.ownerDocument) {
    return innerPath
  }

  const frameEl = doc.defaultView?.frameElement
  if (!(frameEl instanceof HTMLIFrameElement)) {
    return null
  }
  const outerPath = buildPathForElement(frameEl, topBody)
  if (outerPath === null) {
    return null
  }
  return [...outerPath, DOM_PATH_IFRAME, ...innerPath]
}

export function pathTargetsElement(path: readonly number[], el: Element): boolean {
  const resolved = resolveNodeFromPath(path)
  return resolved === el
}

export function walkAllElements(
  visit: (el: Element) => void,
  topDocument: Document = document
): void {
  const seenDocs = new Set<Document>()

  function walkElement(el: Element): void {
    visit(el)
    if (el.shadowRoot) {
      for (let i = 0; i < el.shadowRoot.children.length; i += 1) {
        walkElement(el.shadowRoot.children[i]!)
      }
    }
    for (let i = 0; i < el.children.length; i += 1) {
      walkElement(el.children[i]!)
    }
  }

  function walkDocument(doc: Document): void {
    if (seenDocs.has(doc)) {
      return
    }
    seenDocs.add(doc)
    if (doc.body) {
      walkElement(doc.body)
    }
    const iframes = doc.querySelectorAll("iframe")
    for (let i = 0; i < iframes.length; i += 1) {
      const iframe = iframes[i]
      if (!(iframe instanceof HTMLIFrameElement)) {
        continue
      }
      try {
        const subDoc = iframe.contentDocument
        if (subDoc) {
          walkDocument(subDoc)
        }
      } catch {
        /* cross-origin */
      }
    }
  }

  walkDocument(topDocument)
}
