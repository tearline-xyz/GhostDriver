import React, { useEffect, useState, useCallback } from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./style.css"
import { authService } from "../common/services/authService.ts"
import { TEARLINE_HOST } from "../common/settings"
import LoginPrompt from "./components/LoginPrompt.tsx"

const SidePanelApp: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<"none" | "pending" | "success" | "error">("none")

  const updateAuthStatus = useCallback((newStatus: "none" | "pending" | "success" | "error", error?: boolean) => {
    setAuthStatus(newStatus)
    if (error) {
      console.error(`Login ${newStatus === "error" ? "failed" : "timed out"}`)
    }
  }, [])

  useEffect(() => {
    const checkLoginStatus = async () => {
      const loggedIn = await authService.isLoggedIn()
      updateAuthStatus(loggedIn ? "success" : "none")
    }
    checkLoginStatus()
  }, [updateAuthStatus])

  useEffect(() => {
    const messageListener = (message) => {
      if (message.type === "LOGIN_STATE_CHANGED") {
        updateAuthStatus("success", true);
      }

      if (message.type === "LOGOUT_STATE_CHANGED") {
        updateAuthStatus("none", true);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Clean up listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [updateAuthStatus]);

  const handleLogin = useCallback(async () => {
    try {
      // Check current auth status first
      const isLoggedIn = await authService.isLoggedIn();
      if (isLoggedIn) {
        updateAuthStatus("success", true);
        return;
      }

      // Set pending state and open login page
      updateAuthStatus("pending");

      // Set a timeout to revert to "none" if login doesn't complete
      const timeoutId = window.setTimeout(() => {
        updateAuthStatus("error", true);
        console.error("Login timed out. Please try again.");
      }, 120000); // 2 minutes timeout

      // Open the login page
      const url = `https://${TEARLINE_HOST}/#`;
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error("Login error:", error);
      updateAuthStatus("error", true);
    }
  }, [updateAuthStatus]);


  return (
    <React.StrictMode>
      {authStatus === "success" ? (
        <App />
      ) : (
        <LoginPrompt onLogin={handleLogin} />
      )}
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<SidePanelApp />)

export default SidePanelApp
