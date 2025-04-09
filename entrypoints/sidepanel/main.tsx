import React, { useEffect, useCallback } from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./style.css"
import { authService } from "../auth/authService"
import LoginPrompt from "./components/LoginPrompt"
import useAuth from "../auth/useAuth"
import { AuthMessageType } from "../auth/models"

const SidePanelApp: React.FC = () => {
  const showStatus = (message: string, type: string) => {
    console.log(`${type}: ${message}`);
  };

  const { authStatus, handleLogin } = useAuth();

  const updateAuthStatus = useCallback((newStatus: "none" | "pending" | "success" | "error", error?: boolean) => {
    if (error) {
      console.error(`Login ${newStatus === "error" ? "failed" : "timed out"}`);
    }
  }, []);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const loggedIn = await authService.isLoggedIn()
      updateAuthStatus(loggedIn ? "success" : "none")
    }
    checkLoginStatus()
  }, [updateAuthStatus])

  useEffect(() => {
    const messageListener = (message) => {
      if (message.type === AuthMessageType.LOGIN_STATE_CHANGED) {
        updateAuthStatus("success", true);
      }

      if (message.type === AuthMessageType.LOGOUT_STATE_CHANGED) {
        updateAuthStatus("none", true);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Clean up listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [updateAuthStatus]);

  return (
    <React.StrictMode>
      {authStatus === "success" ? (
        <App />
      ) : (
        <LoginPrompt onLogin={() => handleLogin(showStatus)} />
      )}
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<SidePanelApp />)

export default SidePanelApp
