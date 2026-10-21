import tutorialMessages from "../namespaces/tutorial.json"
import { createNamespaceTranslator } from "../namespace-translator"

const { t: tTutorial } = createNamespaceTranslator(tutorialMessages)

export { tTutorial }
