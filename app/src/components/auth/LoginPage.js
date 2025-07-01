import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiMail, FiLock, FiUser, FiAlertCircle } from 'react-icons/fi';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 50%, #e8f5e8 100%);
  padding: 20px;
`;

const LoginCard = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  animation: fadeInUp 0.5s ease-out;

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 30px;
  
  h1 {
    color: #2e7d32;
    font-size: 28px;
    margin: 10px 0;
  }
  
  .logo-icon {
    font-size: 50px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  position: relative;
  
  input {
    width: 100%;
    padding: 12px 40px 12px 15px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 16px;
    transition: all 0.3s ease;
    
    &:focus {
      outline: none;
      border-color: #2e7d32;
    }
    
    &::placeholder {
      color: #999;
    }
  }
  
  .icon {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    font-size: 20px;
  }
`;

const SubmitButton = styled.button`
  background: #2e7d32;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #1b5e20;
    transform: translateY(-2px);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  background: #f5f5f5;
  padding: 5px;
  border-radius: 10px;
`;

const Tab = styled.button`
  flex: 1;
  padding: 10px;
  border: none;
  background: ${props => props.active ? '#2e7d32' : 'transparent'};
  color: ${props => props.active ? 'white' : '#666'};
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.active ? '#2e7d32' : '#e0e0e0'};
  }
`;

const ErrorMessage = styled.div`
  background: #ffebee;
  color: #c62828;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
`;

const DemoInfo = styled.div`
  background: #e3f2fd;
  color: #1565c0;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  font-size: 14px;
  text-align: center;
  
  strong {
    display: block;
    margin-bottom: 5px;
  }
`;

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useSupabaseAuth();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    companyName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(formData.email, formData.password);
        if (error) throw error;
        navigate('/wizard-pro');
      } else {
        const { error } = await signUp(formData.email, formData.password, {
          name: formData.name,
          company_name: formData.companyName,
          role: 'admin'
        });
        if (error) throw error;
        navigate('/wizard-pro');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>
          <div className="logo-icon">🏡</div>
          <h1>Garden DX System</h1>
        </Logo>

        <TabContainer>
          <Tab 
            active={mode === 'login'} 
            onClick={() => setMode('login')}
          >
            ログイン
          </Tab>
          <Tab 
            active={mode === 'register'} 
            onClick={() => setMode('register')}
          >
            新規登録
          </Tab>
        </TabContainer>

        <Form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <InputGroup>
                <input
                  type="text"
                  name="companyName"
                  placeholder="会社名"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                />
                <FiUser className="icon" />
              </InputGroup>
              
              <InputGroup>
                <input
                  type="text"
                  name="name"
                  placeholder="担当者名"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
                <FiUser className="icon" />
              </InputGroup>
            </>
          )}

          <InputGroup>
            <input
              type="email"
              name="email"
              placeholder="メールアドレス"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <FiMail className="icon" />
          </InputGroup>

          <InputGroup>
            <input
              type="password"
              name="password"
              placeholder="パスワード"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={6}
            />
            <FiLock className="icon" />
          </InputGroup>

          {error && (
            <ErrorMessage>
              <FiAlertCircle />
              {error}
            </ErrorMessage>
          )}

          <SubmitButton type="submit" disabled={loading}>
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
          </SubmitButton>
        </Form>

        <DemoInfo>
          <strong>デモアカウント</strong>
          Email: demo@garden-dx.com<br />
          Password: demo123
        </DemoInfo>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;