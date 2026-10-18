import httpHostMessages from "../namespaces/httpHost.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type HttpHostMessageKey = keyof typeof httpHostMessages

const { t: tHttpHost } = createNamespaceTranslator(httpHostMessages)

export { tHttpHost }
