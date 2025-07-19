/**
 * ログインページ - オーナー・現場監督の権限分離対応
 * デモモード時はログインスキップ機能付き
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { User, Lock, Eye, EyeOff, LogIn, UserCheck, Settings } from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { useDemoMode } from '../../contexts/DemoModeContext';
import { DEMO_STAFF } from '../../utils/demoData';

// スタイリング
const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%);
  padding: 20px;
  box-sizing: border-box;

  @media (max-width: 768px) {
    min-height: 100vh;
    min-height: 100dvh; /* Dynamic viewport height for mobile */
    padding: 16px;
    align-items: flex-start;
    padding-top: max(16px, env(safe-area-inset-top));
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }

  @media (max-width: 480px) {
    padding: 10px;
    padding-top: max(10px, env(safe-area-inset-top));
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }

  /* キーボード表示時の調整 */
  @media (max-width: 768px) and (max-height: 600px) {
    align-items: flex-start;
    padding-top: 10px;
    padding-bottom: 10px;
  }
`;

const LoginCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(26, 71, 42, 0.3);
  box-sizing: border-box;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 24px;
    margin: 10px;
    border-radius: 8px;
    max-width: calc(100% - 20px);
  }

  @media (max-width: 480px) {
    padding: 20px;
    margin: 8px;
    border-radius: 6px;
    max-width: calc(100% - 16px);
  }

  @media (max-width: 360px) {
    padding: 16px;
    margin: 4px;
    border-radius: 4px;
    max-width: calc(100% - 8px);
  }
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 30px;

  h1 {
    color: #1a472a;
    font-size: 1.8rem;
    font-weight: 700;
    margin: 10px 0 5px;
  }

  p {
    color: #6b7280;
    margin: 0;
  }

  @media (max-width: 768px) {
    margin-bottom: 24px;

    h1 {
      font-size: 1.6rem;
    }
  }

  @media (max-width: 480px) {
    margin-bottom: 20px;

    h1 {
      font-size: 1.4rem;
    }

    p {
      font-size: 0.9rem;
    }
  }

  @media (max-width: 360px) {
    margin-bottom: 16px;

    h1 {
      font-size: 1.3rem;
    }

    p {
      font-size: 0.85rem;
    }
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 768px) {
    gap: 18px;
  }

  @media (max-width: 480px) {
    gap: 16px;
  }
`;

const InputGroup = styled.div`
  position: relative;

  label {
    display: block;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 40px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
  display: block;
  background-color: white;
  color: #1a472a;
  height: 48px;

  &:focus {
    outline: none;
    border-color: #1a472a;
    box-shadow: 0 0 0 3px rgba(26, 71, 42, 0.1);
  }

  &:focus-visible {
    outline: 2px solid #1a472a;
    outline-offset: 2px;
  }

  &::placeholder {
    color: #9ca3af;
  }

  ${props =>
    props.error &&
    `
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  `}

  @media (max-width: 768px) {
    height: 50px;
    padding: 14px 40px;
    font-size: 16px;
  }

  @media (max-width: 480px) {
    height: 52px;
    padding: 16px 40px;
    font-size: 16px;
    border-radius: 6px;
  }
`;

const IconLeft = styled.div`
  position: absolute;
  left: 12px;
  color: #9ca3af;
  pointer-events: none;
`;

const IconRight = styled.button`
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  min-width: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #1a472a;
    background-color: rgba(26, 71, 42, 0.1);
  }

  &:focus {
    outline: 2px solid #1a472a;
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    min-width: 44px;
    min-height: 44px;
    padding: 10px;
  }

  @media (max-width: 480px) {
    min-width: 48px;
    min-height: 48px;
    padding: 12px;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 14px;
  background: ${props => (props.disabled ? '#9ca3af' : '#1a472a')};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 48px;

  &:hover:not(:disabled) {
    background: #2d5a3d;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);
  }

  &:focus {
    outline: 2px solid #1a472a;
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    min-height: 50px;
    padding: 16px;
    font-size: 16px;
  }

  @media (max-width: 480px) {
    min-height: 52px;
    padding: 18px;
    font-size: 16px;
    border-radius: 6px;
  }
`;

const Message = styled.div`
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;

  ${props =>
    props.type === 'success' &&
    `
    background: rgba(16, 185, 129, 0.1);
    color: #065f46;
    border: 1px solid rgba(16, 185, 129, 0.3);
  `}

  ${props =>
    props.type === 'error' &&
    `
    background: rgba(239, 68, 68, 0.1);
    color: #991b1b;
    border: 1px solid rgba(239, 68, 68, 0.3);
  `}
  
  ${props =>
    props.type === 'info' &&
    `
    background: rgba(59, 130, 246, 0.1);
    color: #1e40af;
    border: 1px solid rgba(59, 130, 246, 0.3);
  `}
`;

const Links = styled.div`
  text-align: center;
  margin-top: 20px;

  a {
    color: #1a472a;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  color: #1a472a;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
  padding: 4px 8px;
  border-radius: 4px;
  min-height: 32px;

  &:hover {
    text-decoration: underline;
    background-color: rgba(26, 71, 42, 0.1);
  }

  &:focus {
    outline: 2px solid #1a472a;
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    padding: 8px 12px;
    min-height: 40px;
  }

  @media (max-width: 480px) {
    padding: 10px 16px;
    min-height: 44px;
  }
`;

const DevMode = styled.div`
  background: #fef3cd;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  text-align: center;

  p {
    margin: 0;
    color: #92400e;
    font-weight: 500;
  }
`;

const LoginPage = ({ onLogin }) => {
  const { isDemoMode } = useDemoMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('owner');
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { signInWithPassword, signUp, loading, error, isConnected, isAuthenticated, clearError } =
    useSupabaseAuth();

  // デモモード用のプリセット認証情報
  const demoCredentials = {
    owner: {
      email: 'owner@garden-dx.example.com',
      password: 'demo2024',
      name: '田中社長',
      role: 'owner',
    },
    supervisor: {
      email: 'supervisor@garden-dx.example.com',
      password: 'demo2024',
      name: '佐藤現場監督',
      role: 'supervisor',
    },
  };

  // ログイン済みの場合はリダイレクト
  useEffect(() => {
    if (typeof isAuthenticated === 'function' && isAuthenticated()) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // エラークリア
  useEffect(() => {
    if (typeof clearError === 'function') {
      clearError();
    }
    setMessage(null);
  }, [mode, clearError]);

  // フォーム送信
  const handleSubmit = async e => {
    e.preventDefault();
    if (typeof clearError === 'function') {
      clearError();
    }
    setMessage(null);
    setIsLoading(true);

    if (!email || !password) {
      setMessage({ type: 'error', text: 'メールアドレスとパスワードを入力してください' });
      setIsLoading(false);
      return;
    }

    try {
      // デモモード時の認証処理
      if (isDemoMode) {
        const creds = demoCredentials[selectedRole];
        if (email === creds.email && password === creds.password) {
          // ログイン成功
          const userData = {
            ...creds,
            id: `demo-${selectedRole}-001`,
            permissions:
              selectedRole === 'owner'
                ? ['view_profit', 'create_invoice', 'manage_staff', 'view_all_projects']
                : ['create_estimate', 'manage_project', 'view_schedule'],
          };

          await new Promise(resolve => setTimeout(resolve, 1000)); // ロード時間シミュレート

          if (onLogin) {
            onLogin(userData);
          } else {
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
          }
          return;
        } else {
          throw new Error('メールアドレスまたはパスワードが間違っています');
        }
      }

      // 本番環境での認証処理
      if (mode === 'login') {
        const result = await signInWithPassword(email, password);
        if (result.success) {
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        } else {
          setMessage({ type: 'error', text: result.error });
        }
      } else {
        const result = await signUp(email, password, {
          fullName: email.split('@')[0],
          companyName: '造園業株式会社',
          role: selectedRole,
        });

        if (result.success) {
          setMessage({
            type: 'success',
            text: result.message || 'アカウントを作成しました。メールを確認してください。',
          });
          setMode('login');
        } else {
          setMessage({ type: 'error', text: result.error });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'エラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  };

  // デモログインスキップ
  const handleDemoSkip = () => {
    const userData = {
      ...demoCredentials[selectedRole],
      id: `demo-${selectedRole}-001`,
      permissions:
        selectedRole === 'owner'
          ? ['view_profit', 'create_invoice', 'manage_staff', 'view_all_projects']
          : ['create_estimate', 'manage_project', 'view_schedule'],
    };

    if (onLogin) {
      onLogin(userData);
    } else {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  };

  // 役割変更時の認証情報自動入力
  useEffect(() => {
    if (isDemoMode) {
      const creds = demoCredentials[selectedRole];
      setEmail(creds.email);
      setPassword(creds.password);
    }
  }, [selectedRole, isDemoMode, demoCredentials]);

  // 開発モード用自動ログイン
  const handleDevLogin = () => {
    setEmail('dev@example.com');
    setPassword('password');
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} });
    }, 100);
  };

  // デモモードの確認は上部で既に宣言済み（useDemoModeから取得）
  // const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>
          <div style={{ fontSize: '3rem' }}>🏡</div>
          <h1>庭想システム</h1>
          <p>造園業向け統合業務管理システム</p>
        </Logo>

        {/* 役割選択セクション */}
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            background: 'rgba(26, 71, 42, 0.05)',
            borderRadius: '8px',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a472a',
              margin: '0 0 15px 0',
              textAlign: 'center',
            }}
          >
            ログイン権限を選択
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setSelectedRole('owner')}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: selectedRole === 'owner' ? '#1a472a' : 'white',
                color: selectedRole === 'owner' ? 'white' : '#1a472a',
                border: `2px solid ${selectedRole === 'owner' ? '#1a472a' : '#e5e7eb'}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <UserCheck size={16} />
              オーナー（経営者）
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('supervisor')}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: selectedRole === 'supervisor' ? '#1a472a' : 'white',
                color: selectedRole === 'supervisor' ? 'white' : '#1a472a',
                border: `2px solid ${selectedRole === 'supervisor' ? '#1a472a' : '#e5e7eb'}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <User size={16} />
              現場監督スタッフ
            </button>
          </div>
        </div>

        {isDemoMode && (
          <DevMode>
            <p>
              🚀 テスト・デモ用機能
              <br />
              <small>造園業者様の動作確認用です。ログイン情報が自動入力されています。</small>
            </p>
            <button
              type="button"
              onClick={handleDemoSkip}
              style={{
                background: '#4a7c3c',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                marginTop: '12px',
                fontWeight: 'bold',
                fontSize: '16px',
                minHeight: '48px',
                width: '100%',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={e => (e.target.style.background = '#2d5a3d')}
              onMouseOut={e => (e.target.style.background = '#4a7c3c')}
            >
              今すぐテスト開始（ログインスキップ）
            </button>
          </DevMode>
        )}

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <label htmlFor="email" id="email-label">
              メールアドレス
            </label>
            <InputWrapper>
              <IconLeft>
                <User size={20} />
              </IconLeft>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="メールアドレスを入力"
                required
                autoComplete="email"
                aria-label="メールアドレス"
                aria-describedby="email-label"
              />
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <label htmlFor="password" id="password-label">
              パスワード
            </label>
            <InputWrapper>
              <IconLeft>
                <Lock size={20} />
              </IconLeft>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                aria-label="パスワード"
                aria-describedby="password-label"
              />
              <IconRight
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
                title={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </IconRight>
            </InputWrapper>
          </InputGroup>

          {(error || message) && (
            <Message type={message?.type || 'error'}>
              {message?.type === 'success' && <User size={20} />}
              {(message?.type === 'error' || error) && <User size={20} />}
              {message?.text || error}
            </Message>
          )}

          <Button type="submit" disabled={isLoading || loading}>
            {(isLoading || loading) && (
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
            {isLoading || loading ? (
              'ログイン中...'
            ) : (
              <>
                <LogIn size={20} />
                {mode === 'login' ? 'ログイン' : 'アカウント作成'}
              </>
            )}
          </Button>
        </Form>

        {!isDemoMode && (
          <Links>
            {mode === 'login' ? (
              <>
                <p>
                  アカウントをお持ちでない方は{' '}
                  <LinkButton
                    type="button"
                    onClick={() => setMode('signup')}
                    aria-label="アカウント作成ページに切り替え"
                  >
                    こちら
                  </LinkButton>
                </p>
              </>
            ) : (
              <p>
                既にアカウントをお持ちの方は{' '}
                <LinkButton
                  type="button"
                  onClick={() => setMode('login')}
                  aria-label="ログインページに切り替え"
                >
                  ログイン
                </LinkButton>
              </p>
            )}
          </Links>
        )}
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;
