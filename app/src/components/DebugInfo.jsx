/**
 * デバッグ情報表示コンポーネント
 * 本番環境での問題診断用
 */

import React from 'react';

const DebugInfo = () => {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    environment: process.env.REACT_APP_ENVIRONMENT || 'not_set',
    demoMode: process.env.REACT_APP_DEMO_MODE || 'not_set',
    nodeEnv: process.env.NODE_ENV || 'not_set'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: '#ff0000',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      <div><strong>🐛 Debug Info (Garden DX System)</strong></div>
      {Object.entries(debugInfo).map(([key, value]) => (
        <div key={key}>
          <strong>{key}:</strong> {String(value)}
        </div>
      ))}
      <div><strong>React version:</strong> {React.version}</div>
    </div>
  );
};

export default DebugInfo;