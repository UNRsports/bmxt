import tabsMessages from "../namespaces/tabs.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type TabsMessageKey = keyof typeof tabsMessages

const { t: tTabs } = createNamespaceTranslator(tabsMessages)

export { tTabs }
