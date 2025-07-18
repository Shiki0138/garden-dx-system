import React, { useState, useEffect } from 'react';
import { supabaseClient, checkSupabaseConnection } from '../lib/supabase';

const ConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [envVars, setEnvVars] = useState({});
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    // 環境変数の確認
    const envInfo = {
      REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
      REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      REACT_APP_DEMO_MODE: process.env.REACT_APP_DEMO_MODE,
      REACT_APP_ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT,
    };
    setEnvVars(envInfo);

    // 接続テスト
    const testConnection = async () => {
      try {
        const result = await checkSupabaseConnection();
        setConnectionStatus(result);
      } catch (error) {
        setConnectionStatus({
          connected: false,
          message: `接続テストエラー: ${error.message}`,
          error,
        });
      }
    };

    testConnection();
  }, []);

  const testLogin = async () => {
    setTestResult({ loading: true });

    try {
      if (!supabaseClient) {
        setTestResult({
          success: false,
          message: 'Supabaseクライアントが初期化されていません',
        });
        return;
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: 'admin@teisou.com',
        password: 'Teisou2025!',
      });

      if (error) {
        setTestResult({
          success: false,
          message: `ログインエラー: ${error.message}`,
          error,
        });
      } else {
        setTestResult({
          success: true,
          message: 'ログイン成功！',
          data,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `予期しないエラー: ${error.message}`,
        error,
      });
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔧 Supabase接続テスト</h2>

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #ccc',
          borderRadius: '5px',
        }}
      >
        <h3>環境変数</h3>
        <pre>{JSON.stringify(envVars, null, 2)}</pre>
      </div>

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #ccc',
          borderRadius: '5px',
        }}
      >
        <h3>接続状況</h3>
        {connectionStatus ? (
          <pre>{JSON.stringify(connectionStatus, null, 2)}</pre>
        ) : (
          <p>接続テスト中...</p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={testLogin}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          管理者ログインテスト
        </button>
      </div>

      {testResult && (
        <div
          style={{
            padding: '15px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            backgroundColor: testResult.success ? '#d4edda' : '#f8d7da',
          }}
        >
          <h3>テスト結果</h3>
          <pre>{JSON.stringify(testResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;
