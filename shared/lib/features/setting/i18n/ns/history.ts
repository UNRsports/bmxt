import historyMessages from "../namespaces/history.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type HistoryMessageKey = keyof typeof historyMessages

const { t: tHistory } = createNamespaceTranslator(historyMessages)

export { tHistory }
