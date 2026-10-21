import pickerMessages from "../namespaces/picker.json"
import { createNamespaceTranslator } from "../namespace-translator"

export type PickerMessageKey = keyof typeof pickerMessages

const { t: tPicker } = createNamespaceTranslator(pickerMessages)

export { tPicker }
