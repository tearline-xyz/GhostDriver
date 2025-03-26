export default defineContentScript({
  matches: ["*://www1.test.tearline.io/*"],
  main() {
    const postLoginMessage = (inp) => {
      chrome.runtime.sendMessage({
        type: "LOGIN",
        data: inp,
      })
    }
    //初始化登录状态
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("init login")
      if (request.type === "INIT_LOGIN") {
        if (localStorage.getItem("AUTHINFO")) {
          postLoginMessage(localStorage.AUTHINFO)
        }
      }
    })
    // 注入脚本到页面上下文中
    const injectScript = (file, node) => {
      const targetNode = document.querySelector(node)
      const s = document.createElement("script")
      s.setAttribute("type", "module")
      s.setAttribute("src", chrome.runtime.getURL(file))
      targetNode.appendChild(s)
    }

    injectScript("injectScript.js", "body")

    // 监听页面脚本发送的消息
    window.addEventListener("message", (event) => {
      if (event.data.type === "LOGOUT") {
        chrome.runtime.sendMessage({
          type: "LOGOUT",
        })
      }
      if (event.data.type === "LOGIN") {
        console.log("login" + event)

        postLoginMessage(event.data.data)
      }
    })
  },
})
