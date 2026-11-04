/**
 * EN: Firefox action.default_popup trampoline (classic script, no imports).
 *     Opens/focuses bmxt.html as a normal tab, then closes this popup.
 * JA: Firefox 起動用（クラシック script・依存なし）。bmxt.html をタブで開いて閉じる。
 */
;(function () {
  "use strict"

  var SHELL_PAGE = "bmxt.html"

  function setStatus(text) {
    var el = document.getElementById("status")
    if (el) {
      el.textContent = text
    }
  }

  function shellUrl() {
    return chrome.runtime.getURL(SHELL_PAGE)
  }

  function isShellTabUrl(candidate, shell) {
    if (typeof candidate !== "string" || candidate.length === 0) {
      return false
    }
    if (candidate === shell) {
      return true
    }
    try {
      var parsed = new URL(candidate)
      return parsed.pathname === "/" + SHELL_PAGE || parsed.pathname === SHELL_PAGE
    } catch (_e) {
      return false
    }
  }

  function focusTab(tab) {
    return chrome.tabs.update(tab.id, { active: true }).then(function () {
      if (typeof tab.windowId === "number" && chrome.windows && chrome.windows.update) {
        return chrome.windows.update(tab.windowId, { focused: true }).catch(function () {
          /* Android has no windows API */
        })
      }
    })
  }

  function openOrFocusShellTab(url) {
    return chrome.tabs
      .query({ url: url })
      .catch(function () {
        return []
      })
      .then(function (existing) {
        if (existing.length > 0) {
          return existing
        }
        return chrome.tabs
          .query({ url: "*://*/bmxt.html" })
          .then(function (tabs) {
            return tabs.filter(function (tab) {
              return isShellTabUrl(tab.url, url)
            })
          })
          .catch(function () {
            return chrome.tabs.query({}).then(function (all) {
              return all.filter(function (tab) {
                return isShellTabUrl(tab.url, url)
              })
            })
          })
      })
      .then(function (existing) {
        for (var i = 0; i < existing.length; i++) {
          var tab = existing[i]
          if (typeof tab.id === "number") {
            return focusTab(tab)
          }
        }
        return chrome.tabs.create({ url: url })
      })
  }

  var loading =
    (chrome.i18n && chrome.i18n.getMessage("actionPopupLoading")) || "Opening BMXt…"
  setStatus(loading)

  openOrFocusShellTab(shellUrl())
    .then(function () {
      window.close()
    })
    .catch(function (e) {
      var detail = e && e.message ? e.message : String(e)
      var prefix =
        (chrome.i18n && chrome.i18n.getMessage("actionPopupLaunchFailed")) ||
        "Failed to open BMXt"
      setStatus(prefix + ": " + detail)
    })
})()
