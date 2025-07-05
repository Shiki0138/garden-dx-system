/**
 * ログインページ
 * Supabase認証統合
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { Loader, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

// スタイリング
const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%);
  padding: 20px;
  box-sizing: border-box;
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
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
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

  &::placeholder {
    color: #9ca3af;
  }

  ${props =>
    props.error &&
    `
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  `}
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

  &:hover {
    color: #1a472a;
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

  &:hover:not(:disabled) {
    background: #2d5a3d;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);
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

  &:hover {
    text-decoration: underline;
  }

  &:focus {
    outline: 2px solid #1a472a;
    outline-offset: 2px;
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

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [message, setMessage] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const { signInWithPassword, signUp, loading, error, isConnected, isAuthenticated, clearError } =
    useSupabaseAuth();

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

    if (!email || !password) {
      setMessage({ type: 'error', text: 'メールアドレスとパスワードを入力してください' });
      return;
    }

    try {
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
          role: 'employee',
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
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    }
  };

  // 開発モード用自動ログイン
  const handleDevLogin = () => {
    setEmail('dev@example.com');
    setPassword('password');
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} });
    }, 100);
  };

  // デモモードの確認
  const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>
          <div style={{ fontSize: '3rem' }}>🏡</div>
          <h1>庭想システム</h1>
          <p>造園業向け統合業務管理システム</p>
        </Logo>

        {isDemoMode && (
          <DevMode>
            <p>
              🎭 デモ版（本番リリース前）
              <br />
              <small>ログイン機能は本番リリース時に有効化されます</small>
              <br />
              <button
                type="button"
                onClick={handleDevLogin}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '8px',
                  fontWeight: 'bold',
                }}
              >
                デモ版を体験
              </button>
            </p>
          </DevMode>
        )}

        {!isDemoMode && (
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <label htmlFor="email">メールアドレス</label>
            <InputWrapper>
              <IconLeft>
                <Mail size={20} />
              </IconLeft>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <label htmlFor="password">パスワード</label>
            <InputWrapper>
              <IconLeft>
                <Lock size={20} />
              </IconLeft>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="パスワード"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <IconRight type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </IconRight>
            </InputWrapper>
          </InputGroup>

          {(error || message) && (
            <Message type={message?.type || 'error'}>
              {message?.type === 'success' && <CheckCircle size={20} />}
              {(message?.type === 'error' || error) && <AlertCircle size={20} />}
              {message?.text || error}
            </Message>
          )}

          <Button type="submit" disabled={loading}>
            {loading && <Loader size={20} className="animate-spin" />}
            {mode === 'login' ? 'ログイン' : 'アカウント作成'}
          </Button>
        </Form>
        )}

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
