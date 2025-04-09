import React from 'react';

const LoginPrompt: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div style={{
    backgroundColor: '#1e1e1e',
    color: 'white',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column'
  }}>
    <div style={{
      transform: 'translateY(-20vh)'
    }}>
      <p>Please login to continue.</p>
      <button style={{
        backgroundColor: '#2b7eef',
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        padding: '2px 12px',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        height: '24px',
        boxSizing: 'border-box',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s'
      }} onClick={onLogin}>Login with Tearline</button>
    </div>
  </div>
);

export default LoginPrompt;
