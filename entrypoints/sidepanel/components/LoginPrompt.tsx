import React from 'react';
import { TearlineLogo } from '../../../assets/icons';

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
        <img src={TearlineLogo} alt="Copy" style={{ width: '60px', height: '60px' }} />
        <p style={{ fontSize: '1.2em', textAlign: 'center' }}>Please login with Tearline to use GhostDriver.</p>
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
      </div>
    </div>
  </div>
);

export default LoginPrompt;
