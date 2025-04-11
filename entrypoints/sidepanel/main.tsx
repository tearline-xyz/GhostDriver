import React, { useEffect, useCallback } from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./style.css"
import { authService } from "../auth/authService"
import LoginPrompt from "./components/LoginPrompt"
import useAuth from "../auth/useAuth"
import { AuthMessageType, AuthStatus } from "../auth/models"

const SidePanelApp: React.FC = () => {
  const showStatus = (message: string, type: string) => {
    console.log(`${type}: ${message}`);
  };

  const { authStatus, handleLogin } = useAuth();

  const updateAuthStatus = useCallback((newStatus: AuthStatus, error?: boolean) => {
    if (error) {
      console.error(`Login ${newStatus === AuthStatus.ERROR ? "failed" : "timed out"}`);
    }
  }, []);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const loggedIn = await authService.isLoggedIn()
      updateAuthStatus(loggedIn ? AuthStatus.SUCCESS : AuthStatus.NONE)
    }
    checkLoginStatus()
  }, [updateAuthStatus])

  useEffect(() => {
    const messageListener = (message) => {
      if (message.type === AuthMessageType.LOGIN_STATE_CHANGED) {
        updateAuthStatus(AuthStatus.SUCCESS, true);
      }

      if (message.type === AuthMessageType.LOGOUT_STATE_CHANGED) {
        updateAuthStatus(AuthStatus.NONE, true);
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
      {authStatus === AuthStatus.SUCCESS ? (
        <App />
      ) : (
        <LoginPrompt onLogin={() => handleLogin(showStatus)} authStatus={authStatus as AuthStatus} />
      )}
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<SidePanelApp />)

export default SidePanelApp
