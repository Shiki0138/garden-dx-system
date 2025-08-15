import React, { useState } from 'react';
import styled from 'styled-components';
import { User, Lock, LogIn, Users } from 'lucide-react';

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

  // デモ用従業員アカウント
  const demoEmployees = [
    { id: 'EMP001', password: 'worker123', name: '田中太郎', role: 'employee' },
    { id: 'EMP002', password: 'worker123', name: '佐藤花子', role: 'employee' },
    { id: 'EMP003', password: 'worker123', name: '山田次郎', role: 'employee' }
  ];

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
      // デモ認証ロジック
      const employee = demoEmployees.find(emp => 
        emp.id === formData.employeeId && emp.password === formData.password
      );
      
      if (employee) {
        // ログイン成功
        onLogin({
          id: employee.id,
          name: employee.name,
          role: employee.role,
          user_metadata: {
            name: employee.name,
            employee_id: employee.id
          }
        });
      } else {
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

        <DemoCredentials>
          <h4>📋 デモ用アカウント</h4>
          <div className="credential">従業員ID: EMP001 / パスワード: worker123</div>
          <div className="credential">従業員ID: EMP002 / パスワード: worker123</div>
          <div className="credential">従業員ID: EMP003 / パスワード: worker123</div>
        </DemoCredentials>
      </LoginCard>
    </LoginContainer>
  );
};

export default EmployeeLogin;