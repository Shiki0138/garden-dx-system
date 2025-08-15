import React, { useState, createContext, useContext } from 'react';
import EmployeeLogin from './EmployeeLogin';
import EmployeeProjectDashboard from './EmployeeProjectDashboard';

// 従業員認証コンテキスト
const EmployeeAuthContext = createContext();

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    throw new Error('useEmployeeAuth must be used within EmployeeAuthProvider');
  }
  return context;
};

export const EmployeeAuthProvider = ({ children }) => {
  const [employeeUser, setEmployeeUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (userData) => {
    setEmployeeUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('employeeAuth', JSON.stringify(userData));
  };

  const logout = () => {
    setEmployeeUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('employeeAuth');
  };

  // ページリロード時に認証状態を復元
  React.useEffect(() => {
    const stored = localStorage.getItem('employeeAuth');
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        setEmployeeUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to restore employee auth:', error);
        localStorage.removeItem('employeeAuth');
      }
    }
  }, []);

  const value = {
    user: employeeUser,
    isAuthenticated,
    login,
    logout
  };

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

// 従業員権限ガードコンポーネント
const EmployeeGuard = () => {
  const { isAuthenticated, login } = useEmployeeAuth();

  if (!isAuthenticated) {
    return <EmployeeLogin onLogin={login} />;
  }

  return <EmployeeProjectDashboard />;
};

export default EmployeeGuard;