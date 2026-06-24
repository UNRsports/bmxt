import optionalHostMessages from "../namespaces/optionalHost.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type OptionalHostMessageKey = keyof typeof optionalHostMessages

const { t: tOptionalHost } = createNamespaceTranslator(optionalHostMessages)

export { tOptionalHost }
