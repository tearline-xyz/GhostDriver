export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 处理来自 sidepanel 的 INIT_LOGIN 消息
    if (message.type === "INIT_LOGIN") {
      // 转发给所有匹配的 content scripts
      chrome.tabs.query({ url: "*://www1.test.tearline.io/*" }, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: "INIT_LOGIN" })
          }
        })
      })
    }
  })

  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})
