import bookmarkMessages from "../namespaces/bookmark.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type BookmarkMessageKey = keyof typeof bookmarkMessages

const { t: tBookmark } = createNamespaceTranslator(bookmarkMessages)

export { tBookmark }
