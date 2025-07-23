import React, { useState } from 'react';
import styled from 'styled-components';
import { FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 50%, #e8f5e8 100%);
  padding: 20px;
`;

const LoginCard = styled.div`
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 420px;
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 30px;
`;

const LogoTitle = styled.h1`
  color: #2d5a2d;
  font-size: 32px;
  margin-bottom: 10px;
`;

const LogoSubtitle = styled.p`
  color: #666;
  font-size: 14px;
`;

const Title = styled.h2`
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 24px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  position: relative;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Icon = styled.div`
  position: absolute;
  left: 15px;
  color: #999;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 15px 12px 45px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4a7c4a;
  }

  &::placeholder {
    color: #999;
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 15px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;

  &:hover {
    color: #666;
  }
`;

const RememberMe = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
`;

const LoginButton = styled.button`
  background: linear-gradient(135deg, #4a7c4a, #2d5a2d);
  color: white;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(74, 124, 74, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  background: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  margin-bottom: 20px;
`;

const DemoInfo = styled.div`
  background: #e8f5e8;
  border: 1px solid #4a7c4a;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  font-size: 14px;
  color: #2d5a2d;
`;

const DemoButton = styled.button`
  background: transparent;
  color: #4a7c4a;
  border: 2px solid #4a7c4a;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  margin-top: 15px;

  &:hover {
    background: #4a7c4a;
    color: white;
  }
`;

const Footer = styled.div`
  text-align: center;
  margin-top: 30px;
  color: #999;
  font-size: 12px;
`;

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 簡易的な管理者認証（本番環境では適切な認証を実装）
    if (email === 'admin@garden-dx.jp' && password === 'admin123') {
      const adminUser = {
        id: 'admin-001',
        name: '管理者',
        email: email,
        role: 'admin',
        permissions: ['view_all', 'edit_all', 'delete_all', 'manage_users']
      };
      
      if (rememberMe) {
        localStorage.setItem('adminUser', JSON.stringify(adminUser));
      }
      
      setTimeout(() => {
        onLogin(adminUser);
      }, 1000);
    } else {
      setLoading(false);
      setError('メールアドレスまたはパスワードが正しくありません');
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-admin-001',
      name: 'デモ管理者',
      email: 'demo@garden-dx.jp',
      role: 'admin',
      permissions: ['view_all', 'edit_all', 'delete_all', 'manage_users'],
      isDemo: true
    };
    onLogin(demoUser);
  };

  return (
    <Container>
      <LoginCard>
        <Logo>
          <LogoTitle>Garden DX</LogoTitle>
          <LogoSubtitle>造園業向け統合業務管理システム</LogoSubtitle>
        </Logo>

        <Title>管理者ログイン</Title>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label>メールアドレス</Label>
            <InputWrapper>
              <Icon>
                <FiUser size={18} />
              </Icon>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <Label>パスワード</Label>
            <InputWrapper>
              <Icon>
                <FiLock size={18} />
              </Icon>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </PasswordToggle>
            </InputWrapper>
          </InputGroup>

          <RememberMe>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            ログイン状態を保持する
          </RememberMe>

          <LoginButton type="submit" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </LoginButton>
        </Form>

        <DemoInfo>
          <strong>デモアカウント情報</strong><br />
          メール: admin@garden-dx.jp<br />
          パスワード: admin123
        </DemoInfo>

        <DemoButton onClick={handleDemoLogin}>
          デモモードで試す
        </DemoButton>

        <Footer>
          &copy; 2024 Garden DX System. All rights reserved.
        </Footer>
      </LoginCard>
    </Container>
  );
};

export default AdminLogin;