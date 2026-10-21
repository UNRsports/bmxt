import domMessages from "../namespaces/dom.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type DomMessageKey = keyof typeof domMessages

const { t: tDom } = createNamespaceTranslator(domMessages)

export { tDom }
