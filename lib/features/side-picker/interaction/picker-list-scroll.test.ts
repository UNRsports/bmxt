import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { scrollPickerListRowIntoView } from "./picker-list-scroll.ts"

describe("scrollPickerListRowIntoView", () => {
  it("scrolls down when row extends below list viewport", () => {
    const listEl = {
      scrollTop: 0,
      getBoundingClientRect: () => ({ top: 100, bottom: 200, left: 0, right: 100 })
    } as unknown as HTMLElement
    const rowEl = {
      getBoundingClientRect: () => ({ top: 180, bottom: 240, left: 0, right: 100 })
    } as unknown as HTMLElement

    scrollPickerListRowIntoView(listEl, rowEl)
    assert.equal(listEl.scrollTop, 40)
  })

  it("scrolls up when row extends above list viewport", () => {
    const listEl = {
      scrollTop: 120,
      getBoundingClientRect: () => ({ top: 100, bottom: 200, left: 0, right: 100 })
    } as unknown as HTMLElement
    const rowEl = {
      getBoundingClientRect: () => ({ top: 60, bottom: 90, left: 0, right: 100 })
    } as unknown as HTMLElement

    scrollPickerListRowIntoView(listEl, rowEl)
    assert.equal(listEl.scrollTop, 80)
  })

  it("does not scroll when row is fully visible", () => {
    const listEl = {
      scrollTop: 50,
      getBoundingClientRect: () => ({ top: 100, bottom: 200, left: 0, right: 100 })
    } as unknown as HTMLElement
    const rowEl = {
      getBoundingClientRect: () => ({ top: 120, bottom: 160, left: 0, right: 100 })
    } as unknown as HTMLElement

    scrollPickerListRowIntoView(listEl, rowEl)
    assert.equal(listEl.scrollTop, 50)
  })

  it("alignStart scrolls when row is fully visible", () => {
    const listEl = {
      scrollTop: 50,
      getBoundingClientRect: () => ({ top: 100, bottom: 200, left: 0, right: 100 })
    } as unknown as HTMLElement
    const rowEl = {
      getBoundingClientRect: () => ({ top: 120, bottom: 160, left: 0, right: 100 })
    } as unknown as HTMLElement

    scrollPickerListRowIntoView(listEl, rowEl, { alignStart: true })
    assert.equal(listEl.scrollTop, 70)
  })
})
