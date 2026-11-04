/**
 * EN: Firefox action.default_popup trampoline (classic script, no imports).
 *     Asks the background to open the shell (popup on PC, tab on Android SP), then closes.
 * JA: Firefox 起動用（クラシック script・依存なし）。
 *     background にシェル起動を依頼（PC=popup / SP=タブ）して閉じる。
 */
;(function () {
  "use strict"

  function setStatus(text) {
    var el = document.getElementById("status")
    if (el) {
      el.textContent = text
    }
  }

  var loading =
    (chrome.i18n && chrome.i18n.getMessage("actionPopupLoading")) || "Opening BMXt…"
  setStatus(loading)

  chrome.runtime.sendMessage({ type: "BMXT_LAUNCH_FROM_ACTION" }, function () {
    var err = chrome.runtime.lastError
    if (err) {
      var prefix =
        (chrome.i18n && chrome.i18n.getMessage("actionPopupLaunchFailed")) ||
        "Failed to open BMXt"
      setStatus(prefix + ": " + (err.message || String(err)))
      return
    }
    window.close()
  })
})()
