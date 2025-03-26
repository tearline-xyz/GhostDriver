import { defineUnlistedScript } from "wxt/sandbox"

export default defineUnlistedScript(() => {
  console.log("inject")

  const originalSetItem = localStorage.setItem
  const originalRemoveItem = localStorage.removeItem
  // 重写 setItem
  localStorage.setItem = function (key, value) {
    console.log("custom setitem", key)

    originalSetItem.apply(this, arguments)
    if (key === "USERINFO") {
      window.postMessage(
        {
          type: "LOGIN",
          key: key,
          newValue: value,
        },
        "*"
      )
    }
  }

  // 重写 removeItem
  localStorage.removeItem = function (key) {
    console.log("custom Remove", key)

    originalRemoveItem.apply(this, arguments)
    if (key === "AUTHINFO") {
      window.postMessage(
        {
          type: "LOGOUT",
          key: key,
          newValue: null,
        },
        "*"
      )
    }
  }
})
