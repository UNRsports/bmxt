import type { DomHtmlToken, DomHtmlTokenKind } from "./dom-html-syntax.ts"

function pushToken(tokens: DomHtmlToken[], kind: DomHtmlTokenKind, text: string): void {
  if (text.length > 0) {
    tokens.push({ kind, text })
  }
}

function isTagNameChar(ch: string): boolean {
  return /[a-zA-Z0-9:-]/.test(ch)
}

function isAttrNameChar(ch: string): boolean {
  return /[^\s=>/]/.test(ch)
}

function readTextUntilMarkup(source: string, start: number): { text: string; next: number } {
  let i = start
  while (i < source.length && source[i] !== "<") {
    i += 1
  }
  return { text: source.slice(start, i), next: i }
}

function readComment(source: string, start: number): { text: string; next: number } | null {
  if (!source.startsWith("<!--", start)) {
    return null
  }
  const end = source.indexOf("-->", start + 4)
  if (end < 0) {
    return { text: source.slice(start), next: source.length }
  }
  return { text: source.slice(start, end + 3), next: end + 3 }
}

function readQuotedAttrValue(
  source: string,
  start: number,
  quote: "'" | '"'
): { value: string; quote: string; next: number } {
  let i = start
  let value = ""
  while (i < source.length && source[i] !== quote) {
    value += source[i]!
    i += 1
  }
  let quoteText = ""
  if (i < source.length && source[i] === quote) {
    quoteText = quote
    i += 1
  }
  return { value, quote: quoteText, next: i }
}

function readTag(source: string, start: number, tokens: DomHtmlToken[]): number {
  let i = start
  pushToken(tokens, "punct", "<")
  i += 1

  if (i < source.length && source[i] === "/") {
    pushToken(tokens, "punct", "/")
    i += 1
  }

  let tagStart = i
  while (i < source.length && isTagNameChar(source[i]!)) {
    i += 1
  }
  pushToken(tokens, "tag", source.slice(tagStart, i))

  while (i < source.length) {
    while (i < source.length && /\s/.test(source[i]!)) {
      i += 1
    }
    if (i >= source.length) {
      break
    }
    if (source[i] === ">") {
      pushToken(tokens, "punct", ">")
      return i + 1
    }
    if (source[i] === "/" && source[i + 1] === ">") {
      pushToken(tokens, "punct", "/>")
      return i + 2
    }

    const attrStart = i
    while (i < source.length && isAttrNameChar(source[i]!)) {
      i += 1
    }
    if (i === attrStart) {
      pushToken(tokens, "punct", source[i]!)
      i += 1
      continue
    }
    pushToken(tokens, "attrName", source.slice(attrStart, i))

    while (i < source.length && /\s/.test(source[i]!)) {
      i += 1
    }
    if (i < source.length && source[i] === "=") {
      pushToken(tokens, "punct", "=")
      i += 1
      while (i < source.length && /\s/.test(source[i]!)) {
        i += 1
      }
      if (i < source.length && (source[i] === '"' || source[i] === "'")) {
        const quote = source[i] as "'" | '"'
        pushToken(tokens, "punct", quote)
        i += 1
        const quoted = readQuotedAttrValue(source, i, quote)
        pushToken(tokens, "attrValue", quoted.value)
        if (quoted.quote.length > 0) {
          pushToken(tokens, "punct", quoted.quote)
        }
        i = quoted.next
      } else {
        const unquotedStart = i
        while (i < source.length && !/\s|>/.test(source[i]!)) {
          i += 1
        }
        pushToken(tokens, "attrValue", source.slice(unquotedStart, i))
      }
    }
  }

  return i
}

/**
 * EN: Best-effort HTML snippet tokenizer for dom picker rows (not a full HTML parser).
 * JA: dom picker 行向けの HTML スニペットトークナイザ（厳密パースではない）。
 */
export function tokenizeDomHtmlSnippet(source: string): DomHtmlToken[] {
  const tokens: DomHtmlToken[] = []
  let i = 0

  while (i < source.length) {
    if (source[i] !== "<") {
      const textChunk = readTextUntilMarkup(source, i)
      pushToken(tokens, "text", textChunk.text)
      i = textChunk.next
      continue
    }

    const comment = readComment(source, i)
    if (comment) {
      pushToken(tokens, "comment", comment.text)
      i = comment.next
      continue
    }

    i = readTag(source, i, tokens)
  }

  return tokens
}
