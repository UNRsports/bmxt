import domPromptMessages from "../namespaces/domPrompt.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type DomPromptMessageKey = keyof typeof domPromptMessages

const { t: tDomPrompt } = createNamespaceTranslator(domPromptMessages)

export { tDomPrompt }
