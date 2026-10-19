import type { TutorialDefinition } from "../types.ts"

/**
 * EN: Teach `tab -list | browse` — type each token, notice candidates, open the tab picker.
 * JA: `tab -list | browse` を段階的に体験（候補表示 → ピッカー列）。
 */
export const TAB_LIST_BROWSE_TUTORIAL: TutorialDefinition = {
  id: "tab-list-browse",
  titleKey: "tutorial.tabListBrowse.title",
  steps: [
    {
      id: "type-tab",
      instructionKey: "tutorial.tabListBrowse.step.typeTab",
      hintKey: "tutorial.tabListBrowse.hint.typeTab",
      assert: {
        kind: "any",
        of: [
          {
            kind: "all",
            of: [
              { kind: "promptMatches", pattern: "^tab$" },
              { kind: "tokenPickerVisible", tier: "second" },
              { kind: "tokenPickerHas", token: "-list" }
            ]
          },
          { kind: "promptTokenPrefix", tokens: ["tab", "-list"] }
        ]
      }
    },
    {
      id: "type-list",
      instructionKey: "tutorial.tabListBrowse.step.typeList",
      hintKey: "tutorial.tabListBrowse.hint.typeList",
      assert: {
        kind: "any",
        of: [
          { kind: "promptTokenPrefix", tokens: ["tab", "-list"] },
          { kind: "promptMatches", pattern: "^tab\\s+-list(\\s|$)" }
        ]
      }
    },
    {
      id: "type-pipe",
      instructionKey: "tutorial.tabListBrowse.step.typePipe",
      hintKey: "tutorial.tabListBrowse.hint.typePipe",
      assert: {
        kind: "any",
        of: [
          { kind: "promptTokenPrefix", tokens: ["tab", "-list", "|"] },
          { kind: "promptMatches", pattern: "^tab\\s+-list\\s+\\|" }
        ]
      }
    },
    {
      id: "type-browse",
      instructionKey: "tutorial.tabListBrowse.step.typeBrowse",
      hintKey: "tutorial.tabListBrowse.hint.typeBrowse",
      assert: {
        kind: "any",
        of: [
          { kind: "promptTokenPrefix", tokens: ["tab", "-list", "|", "browse"] },
          { kind: "promptMatches", pattern: "^tab\\s+-list\\s+\\|\\s*browse\\b" }
        ]
      }
    },
    {
      id: "open-picker",
      instructionKey: "tutorial.tabListBrowse.step.openPicker",
      hintKey: "tutorial.tabListBrowse.hint.openPicker",
      assert: { kind: "tabsPickerOpen" }
    }
  ]
}
