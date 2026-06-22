import groupMessages from "../namespaces/group.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type GroupMessageKey = keyof typeof groupMessages

const { t: tGroup } = createNamespaceTranslator(groupMessages)

export { tGroup }
