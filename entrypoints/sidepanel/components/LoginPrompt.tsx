import React from 'react';
import { TearlineLogo, ErrorIcon } from '../../../assets/icons';
import { EXTENSION_NAME } from '../../common/settings';
import { AuthStatus } from '../../auth/models';

const LoginPrompt: React.FC<{ onLogin: () => void, authStatus: string }> = ({ onLogin, authStatus }) => (
  <div style={{
    backgroundColor: '#1e1e1e',
    color: 'white',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column'
  }}>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      transform: 'translateY(-15vh)'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        {authStatus === AuthStatus.NONE && (
          <>
            <img src={TearlineLogo} alt="Copy" style={{ width: '60px', height: '60px' }} />
            <p style={{ fontSize: '1.2em', textAlign: 'center' }}>Please login with Tearline to use {EXTENSION_NAME}.</p>
            <button style={{
              backgroundColor: '#2b7eef',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1.2em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '30px',
              boxSizing: 'border-box',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s'
            }} onClick={onLogin}>Login with Tearline</button>
          </>
        )}

        {authStatus === AuthStatus.PENDING && (
          <>
            <div className="loader" style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #2b7eef',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontSize: '1.2em', textAlign: 'center' }}>Login in progress</p>
            <p style={{ fontSize: '1em', textAlign: 'center', color: '#888' }}>Please complete login in the opened page...</p>
          </>
        )}

        {authStatus === AuthStatus.ERROR && (
          <>
            <img src={ErrorIcon} alt="Error" style={{ width: '60px', height: '60px' }} />
            <p style={{ fontSize: '1.2em', textAlign: 'center' }}>Login failed or timed out</p>
            <button style={{
              backgroundColor: '#2b7eef',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1.2em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '30px',
              boxSizing: 'border-box',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s'
            }} onClick={onLogin}>Try Again</button>
          </>
        )}
      </div>
    </div>
  </div>
);

export default LoginPrompt;
