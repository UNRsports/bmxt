import domListMessages from "../namespaces/domList.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type DomListMessageKey = keyof typeof domListMessages

const { t: tDomList } = createNamespaceTranslator(domListMessages)

export { tDomList }
