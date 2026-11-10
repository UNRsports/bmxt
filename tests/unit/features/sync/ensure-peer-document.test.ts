/**
 * EN: ensurePeerDocument must not open tabs / offscreen — prompt host only.
 * JA: ensurePeerDocument はタブ／offscreen を開かず、プロンプト宿主前提のみ。
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { ensurePeerDocument } from "../../../../shared/lib/features/sync/peer/ensure-peer-document.ts"

describe("ensurePeerDocument", () => {
  it("resolves when RTCPeerConnection is available (in-page host)", async () => {
    const globalRef = globalThis as typeof globalThis & {
      RTCPeerConnection?: unknown
    }
    const prev = globalRef.RTCPeerConnection
    globalRef.RTCPeerConnection = function FakeRtc() {}
    try {
      await ensurePeerDocument()
    } finally {
      globalRef.RTCPeerConnection = prev
    }
  })

  it("rejects when RTCPeerConnection is missing", async () => {
    const globalRef = globalThis as typeof globalThis & {
      RTCPeerConnection?: unknown
    }
    const prev = globalRef.RTCPeerConnection
    delete globalRef.RTCPeerConnection
    try {
      await assert.rejects(
        () => ensurePeerDocument(),
        /RTCPeerConnection unavailable/
      )
    } finally {
      globalRef.RTCPeerConnection = prev
    }
  })

  it("does not call chrome.tabs.create or chrome.offscreen", async () => {
    const globalRef = globalThis as typeof globalThis & {
      RTCPeerConnection?: unknown
      chrome?: {
        tabs?: { create?: (...args: unknown[]) => unknown }
        offscreen?: { createDocument?: (...args: unknown[]) => unknown }
      }
    }
    const prevRtc = globalRef.RTCPeerConnection
    const prevChrome = globalRef.chrome
    globalRef.RTCPeerConnection = function FakeRtc() {}
    let tabsCreateCalls = 0
    let offscreenCreateCalls = 0
    globalRef.chrome = {
      tabs: {
        create: () => {
          tabsCreateCalls += 1
          return Promise.resolve({})
        }
      },
      offscreen: {
        createDocument: () => {
          offscreenCreateCalls += 1
          return Promise.resolve()
        }
      }
    }
    try {
      await ensurePeerDocument()
      assert.equal(tabsCreateCalls, 0)
      assert.equal(offscreenCreateCalls, 0)
    } finally {
      globalRef.RTCPeerConnection = prevRtc
      globalRef.chrome = prevChrome
    }
  })
})
