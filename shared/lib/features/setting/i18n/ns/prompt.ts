import promptMessages from "../namespaces/prompt.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type PromptMessageKey = keyof typeof promptMessages

const { t: tPrompt } = createNamespaceTranslator(promptMessages)

export { tPrompt }
