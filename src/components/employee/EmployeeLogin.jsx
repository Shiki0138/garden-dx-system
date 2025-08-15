import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { User, Lock, LogIn, Users } from 'lucide-react';
import { validateLandscapingInput, csrfProtection } from '../../utils/securityUtils';
import { useSecureAuth } from '../../hooks/useSecureAuth';
import { secureApi } from '../../utils/apiClient';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%);
  padding: 20px;
`;

const LoginCard = styled.div`
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  border: 1px solid #e8f5e8;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 35px;
  
  .icon {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #4a7c4a, #2d5a2d);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    color: white;
  }
`;

const Title = styled.h1`
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #2d5a2d;
  font-weight: 700;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #666;
  font-size: 14px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  position: relative;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px 12px 45px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #4a7c4a;
    box-shadow: 0 0 0 3px rgba(74, 124, 74, 0.1);
  }
  
  &::placeholder {
    color: #999;
  }
`;

const InputIcon = styled.div`
  position: absolute;
  left: 14px;
  color: #999;
  z-index: 1;
`;

const LoginButton = styled.button`
  background: linear-gradient(135deg, #4a7c4a, #2d5a2d);
  color: white;
  border: none;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
  margin-top: 10px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(74, 124, 74, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  background: #f8d7da;
  border: 1px solid #f5c2c7;
  color: #721c24;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 20px;
`;

const DemoCredentials = styled.div`
  background: #d1ecf1;
  border: 1px solid #b8daff;
  border-radius: 6px;
  padding: 15px;
  margin-top: 25px;
  font-size: 13px;
  
  h4 {
    margin: 0 0 10px 0;
    color: #055160;
    font-size: 14px;
  }
  
  .credential {
    margin: 5px 0;
    color: #055160;
    font-family: monospace;
  }
`;

const EmployeeLogin = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login: secureLogin } = useSecureAuth();

  // Generate CSRF token on component mount
  useEffect(() => {
    const token = csrfProtection.generateToken();
    csrfProtection.sessionToken.set(token);
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // エラーメッセージをクリア
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.password) {
      setError('従業員IDとパスワードを入力してください');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // 入力検証
      const idValidation = validateLandscapingInput.customerName(formData.employeeId);
      if (!idValidation.isValid) {
        setError('従業員IDの形式が正しくありません');
        setIsLoading(false);
        return;
      }
      
      // APIを使用した認証（本番環境）
      if (process.env.NODE_ENV === 'production') {
        try {
          const response = await secureApi.post('/api/auth/employee/login', {
            employeeId: idValidation.sanitizedValue,
            password: formData.password
          });
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            
            // セキュアな認証フックを使用してログイン
            const loginResult = await secureLogin(user, token);
            
            if (loginResult.success) {
              onLogin(user);
              return;
            } else {
              setError(loginResult.error || 'ログインに失敗しました');
            }
          }
        } catch (apiError) {
          console.error('API authentication error:', apiError);
          setError('認証サーバーへの接続に失敗しました');
        }
      } else {
        // 開発環境のみ：環境変数から認証
        const devEmployeePrefix = process.env.REACT_APP_DEV_EMPLOYEE_PREFIX || 'DEV-EMP';
        
        if (formData.employeeId.startsWith(devEmployeePrefix)) {
          // 開発用の簡易認証（本番では絶対に使用しない）
          console.warn('⚠️ Using development authentication');
          const employee = {
            id: formData.employeeId,
            name: `開発従業員 ${formData.employeeId}`,
            role: 'employee',
            user_metadata: {
              name: `開発従業員 ${formData.employeeId}`,
              employee_id: formData.employeeId
            },
            isDevelopment: true
          };
          
          const loginResult = await secureLogin(employee, 'dev-emp-token-' + Date.now());
          
          if (loginResult.success) {
            onLogin(employee);
            return;
          }
        }
        
        setError('従業員IDまたはパスワードが正しくありません');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setError('ログインに失敗しました。しばらく後でもう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Header>
          <div className="icon">
            <Users size={28} />
          </div>
          <Title>従業員ログイン</Title>
          <Subtitle>工事進捗管理システム</Subtitle>
        </Header>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>従業員ID</Label>
            <InputWrapper>
              <InputIcon>
                <User size={18} />
              </InputIcon>
              <Input
                type="text"
                value={formData.employeeId}
                onChange={(e) => handleInputChange('employeeId', e.target.value)}
                placeholder="従業員ID (例: EMP001)"
                maxLength="10"
                required
              />
            </InputWrapper>
          </FormGroup>

          <FormGroup>
            <Label>パスワード</Label>
            <InputWrapper>
              <InputIcon>
                <Lock size={18} />
              </InputIcon>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="パスワードを入力"
                required
              />
            </InputWrapper>
          </FormGroup>

          <LoginButton type="submit" disabled={isLoading}>
            {isLoading ? (
              '認証中...'
            ) : (
              <>
                <LogIn size={20} />
                ログイン
              </>
            )}
          </LoginButton>
        </Form>

        {process.env.NODE_ENV === 'development' && (
          <DemoCredentials>
            <h4>📋 開発環境</h4>
            <div className="credential">従業員IDプレフィックス: {process.env.REACT_APP_DEV_EMPLOYEE_PREFIX || 'DEV-EMP'}</div>
            <div className="credential">例: DEV-EMP001, DEV-EMP002</div>
            <div className="credential">パスワード: 任意（開発環境のみ）</div>
          </DemoCredentials>
        )}
      </LoginCard>
    </LoginContainer>
  );
};

export default EmployeeLogin;