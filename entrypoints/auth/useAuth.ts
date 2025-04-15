import { useState, useCallback, useEffect } from 'react';
import { authService } from './authService';
import { TEARLINE_WEBSITE } from '../common/settings';
import { authStateMachineActor } from './models';
import { AuthEventType, AuthMessageType, TokenData } from './models';

const useAuth = () => {
  const [authStatus, setAuthStatus] = useState(authStateMachineActor.getSnapshot().value);
  const [userInfo, setUserInfo] = useState<TokenData | null>(null);
  const [loginTimeoutId, setLoginTimeoutId] = useState<number | null>(null);

  const loadAuthStatus = useCallback(async () => {
    try {
      const isLoggedIn = await authService.isLoggedIn();
      if (isLoggedIn) {
        const authInfo = await authService.getAuthInfo();

        let userData: TokenData | null = null;

        if (authInfo?.token) {
          userData = authService.parseTokenString(authInfo.token);
        } else if (authInfo?.user) {
          // 如果没有有效的token数据但有user信息，将user转换为TokenData格式
          userData = {
            name: authInfo.user.name,
            email: authInfo.user.email,
            // 没有userId和authId
          };
        }

        authStateMachineActor.send({ type: AuthEventType.LOGIN_SUCCESS });
        setUserInfo(userData);
      } else {
        authStateMachineActor.send({ type: AuthEventType.LOGOUT });
        setUserInfo(null);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      authStateMachineActor.send({ type: AuthEventType.LOGIN_ERROR });
    }
  }, []);

  const handleLogin = useCallback(async (showStatus: (message: string, type: string) => void) => {
    try {
      const isLoggedIn = await authService.isLoggedIn();
      if (isLoggedIn) {
        authStateMachineActor.send({ type: AuthEventType.LOGIN_SUCCESS });
        return;
      }

      authStateMachineActor.send({ type: AuthEventType.LOGIN });

      const timeoutId = window.setTimeout(() => {
        authStateMachineActor.send({ type: AuthEventType.LOGIN_ERROR });
        showStatus('Login timed out. Please try again.', 'error');
      }, 120000);
      setLoginTimeoutId(timeoutId);

      const url = `https://${TEARLINE_WEBSITE}/#`;
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error('Login error:', error);
      authStateMachineActor.send({ type: AuthEventType.LOGIN_ERROR });
      showStatus('Login failed. Please try again.', 'error');
    }
  }, []);

  const handleLogout = useCallback(async (showStatus: (message: string, type: string) => void) => {
    try {
      await authService.clearAuthInfo();
      await authService.broadcastLoginState(false);
      authStateMachineActor.send({ type: AuthEventType.LOGOUT });
      setUserInfo(null);
    } catch (error) {
      console.error('Logout error:', error);
      showStatus('Logout failed. Please try again.', 'error');
    }
  }, []);

  useEffect(() => {
    // 立即加载认证状态
    loadAuthStatus();

    // 设置消息监听器
    const messageListener = (message) => {
      if (message.type === AuthMessageType.LOGIN_STATE_CHANGED) {
        if (loginTimeoutId) {
          window.clearTimeout(loginTimeoutId);
          setLoginTimeoutId(null);
        }
        loadAuthStatus();
      }

      if (message.type === AuthMessageType.LOGOUT_STATE_CHANGED) {
        authStateMachineActor.send({ type: AuthEventType.LOGOUT });
        setUserInfo(null);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      if (loginTimeoutId) {
        window.clearTimeout(loginTimeoutId);
      }
    };
  }, [loadAuthStatus, loginTimeoutId]);

  // 监听状态机变化
  useEffect(() => {
    console.log('Setting up state machine subscription');
    const subscription = authStateMachineActor.subscribe((state) => {
      console.log('Auth state changed:', state.value);
      setAuthStatus(state.value);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { authStatus, userInfo, handleLogin, handleLogout, loadAuthStatus };
};

export default useAuth;
