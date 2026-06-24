import sessionMessages from "../namespaces/session.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type SessionMessageKey = keyof typeof sessionMessages

const { t: tSession } = createNamespaceTranslator(sessionMessages)

export { tSession }
