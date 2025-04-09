import { useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';
import { TEARLINE_HOST } from '../settings';
import { AuthStatus } from '../model/authStatus';
import { MessageType } from '../model/messageTypes';

const useAuth = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.NONE);
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string; userId?: string } | null>(null);

  const updateAuthStatus = useCallback((newStatus: AuthStatus, shouldOverridePending: boolean = false) => {
    setAuthStatus((currentStatus) => {
      if (!shouldOverridePending && currentStatus === AuthStatus.PENDING) {
        return AuthStatus.PENDING;
      }
      return newStatus;
    });
  }, []);

  const handleLogin = useCallback(async (showStatus: (message: string, type: string) => void) => {
    try {
      const isLoggedIn = await authService.isLoggedIn();
      if (isLoggedIn) {
        updateAuthStatus(AuthStatus.SUCCESS, true);
        return;
      }

      updateAuthStatus(AuthStatus.PENDING);

      const timeoutId = window.setTimeout(() => {
        updateAuthStatus(AuthStatus.ERROR, true);
        showStatus('Login timed out. Please try again.', 'error');
      }, 120000);

      const url = `https://${TEARLINE_HOST}/#`;
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error('Login error:', error);
      updateAuthStatus(AuthStatus.ERROR, true);
      showStatus('Login failed. Please try again.', 'error');
    }
  }, [updateAuthStatus]);

  const handleLogout = useCallback(async (showStatus: (message: string, type: string) => void) => {
    try {
      await authService.clearAuthInfo();
      await authService.broadcastLoginState(false);
      updateAuthStatus(AuthStatus.NONE, true);
      setUserInfo(null);
    } catch (error) {
      console.error('Logout error:', error);
      showStatus('Logout failed. Please try again.', 'error');
    }
  }, [updateAuthStatus]);

  useEffect(() => {
    const messageListener = (message) => {
      if (message.type === MessageType.LOGIN_STATE_CHANGED) {
        updateAuthStatus(AuthStatus.SUCCESS, true);
      }

      if (message.type === MessageType.LOGOUT_STATE_CHANGED) {
        updateAuthStatus(AuthStatus.NONE, true);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [updateAuthStatus]);

  return { authStatus, userInfo, handleLogin, handleLogout, updateAuthStatus };
};

export default useAuth;
