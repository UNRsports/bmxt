/**
 * EN: Build bmxtRule stream of `page.open` records from numeric tab ids (chip pipe LHS).
 */

import {
  BMXT_RULE_SCHEMA,
  type BmxtRuleStream
} from "../../bmxt-rule/types.ts"
import { bmxtRuleProducer, bmxtRuleRecord } from "../../bmxt-rule/entries.ts"

export function bmxtRuleStreamFromTabIds(tabIds: readonly number[]): BmxtRuleStream {
  const records = tabIds.map((tabId) =>
    bmxtRuleRecord("page.open", {
      tabId,
      url: "",
      pageTitle: ""
    })
  )
  return {
    schema: BMXT_RULE_SCHEMA,
    producer: bmxtRuleProducer({
      command: "tab-chip",
      subcommand: "picker"
    }),
    records
  }
}
