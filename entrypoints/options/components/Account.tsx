import React from "react"
import "./Account.css"
import { CopyIcon, UserIcon, ErrorIcon } from "../../../assets/icons"
import { AuthStatus } from "../../auth/models"
import useAuth from "../../auth/useAuth"

interface AccountProps {
  showStatus: (message: string, type: string, duration?: number) => void
}

const Account: React.FC<AccountProps> = ({ showStatus }) => {
  const { authStatus, userInfo, handleLogin, handleLogout } = useAuth()

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showStatus("Copied to clipboard!", "success")
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
        showStatus("Failed to copy!", "error")
      })
  }

  return (
    <>
      <h2>Account Settings</h2>
      <div className="account-container">
        {authStatus === AuthStatus.NONE && (
          <div className="profile-card not-logged-in">
            <div className="profile-avatar">
              <img src={UserIcon} alt="User" />
            </div>
            <div className="profile-status">Not logged in</div>
            <p className="profile-message">
              Sign in to access Tearline services
            </p>
            <button
              className="auth-button login-button"
              onClick={() => handleLogin(showStatus)}
            >
              Login with Tearline
            </button>
          </div>
        )}

        {authStatus === AuthStatus.PENDING && (
          <div className="profile-card pending">
            <div className="loader"></div>
            <div className="profile-status">Login in progress</div>
            <p className="profile-message">
              Please complete login in the opened page...
            </p>
          </div>
        )}

        {authStatus === AuthStatus.ERROR && (
          <div className="profile-card error">
            <div className="profile-avatar error">
              <img src={ErrorIcon} alt="Error" />
            </div>
            <div className="profile-status">
              Login failed or timed out
            </div>
            <button
              className="auth-button login-button"
              onClick={() => handleLogin(showStatus)}
            >
              Try Again
            </button>
          </div>
        )}

        {authStatus === AuthStatus.SUCCESS && (
          <div className="profile-card logged-in">
            <div className="profile-header">
              <div className="profile-avatar success">
                <img src={UserIcon} alt="User" />
              </div>
            </div>

            <div className="profile-info-container">
              {userInfo?.name && (
                <div className="profile-detail">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{userInfo.name}</span>
                </div>
              )}

              {userInfo?.email && (
                <div className="profile-detail">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{userInfo.email}</span>
                </div>
              )}

              {userInfo?.userId && (
                <div className="profile-detail">
                  <span className="detail-label">User ID</span>
                  <div className="detail-value-with-action">
                    <span className="detail-value user-id">
                      {userInfo.userId}
                    </span>
                    <button
                      className="copy-button"
                      onClick={() =>
                        userInfo.userId &&
                        copyToClipboard(userInfo.userId)
                      }
                      title="Copy User ID"
                    >
                      <img src={CopyIcon} alt="Copy" />
                    </button>
                  </div>
                </div>
              )}

              {!userInfo?.name &&
                !userInfo?.email &&
                !userInfo?.userId && (
                  <div className="profile-detail">
                    <span className="detail-value">
                      Account connected successfully
                    </span>
                  </div>
                )}
            </div>

            <button
              className="auth-button logout-button"
              onClick={() => handleLogout(showStatus)}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default Account
