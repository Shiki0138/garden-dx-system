import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Package, 
  Users, 
  Settings,
  BarChart3,
  Download,
  Bell,
  Menu,
  X,
  FileCheck,
  Home,
  ChevronRight
} from 'lucide-react';
import { useSafeSupabaseAuth } from './AuthContextWrapper';
import ErrorBoundary from './ErrorBoundary';
import { useDemoMode } from '../contexts/DemoModeContext';

// コンポーネントのインポート
import ProcessManagement from './ProcessManagement';
import ProcessScheduleManager from './ProcessScheduleManager';
import BudgetManagement from './BudgetManagement';
import PurchaseManagement from './PurchaseManagement';
import MobileWorkflow from './MobileWorkflow';
import EstimateCreator from './EstimateCreator';
import EstimateWizard from './EstimateWizard';
import InvoiceForm from './invoices/InvoiceForm';
import DashboardTop from './DashboardTop';
import EstimateTemplateDemo from './EstimateTemplateDemo';
import DocumentTemplates from './DocumentTemplates';
import { generateProcessPDF } from '../utils/processPDFGenerator';
import { generateProcessSchedule } from '../utils/processGenerator';

// メインコンポーネント
const MobileOptimizedGardenDX = () => {
  const authContext = useSafeSupabaseAuth();
  const { user, isAuthenticated: isAuthenticatedFn, loading: authLoading } = authContext;
  const isAuthenticated = typeof isAuthenticatedFn === 'function' ? isAuthenticatedFn() : false;
  const { isDemoMode } = useDemoMode();
  
  const [activeModule, setActiveModule] = useState('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalProjects: 0,
    activeEstimates: 0,
    monthlyRevenue: 0,
    completedProcesses: 0
  });

  // モバイル判定
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || 
                    ('ontouchstart' in window) || 
                    (navigator.maxTouchPoints > 0);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ダッシュボードデータの取得
  useEffect(() => {
    if (isAuthenticated || isDemoMode) {
      fetchDashboardData();
      fetchNotifications();
    }
  }, [isAuthenticated, isDemoMode]);

  const fetchDashboardData = useCallback(async () => {
    try {
      if (isDemoMode) {
        setDashboardData({
          totalProjects: 5,
          activeEstimates: 3,
          monthlyRevenue: 1250000,
          completedProcesses: 8
        });
        return;
      }
      
      const response = await fetch('/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('ダッシュボードデータの取得に失敗:', error);
      setDashboardData({
        totalProjects: 0,
        activeEstimates: 0,
        monthlyRevenue: 0,
        completedProcesses: 0
      });
    }
  }, [isDemoMode]);

  const fetchNotifications = useCallback(async () => {
    try {
      if (isDemoMode) {
        setNotifications([
          { id: 1, type: 'info', message: 'デモモードで実行中です' },
          { id: 2, type: 'success', message: '見積書が作成されました' }
        ]);
        return;
      }
      
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('通知の取得に失敗:', error);
      setNotifications([]);
    }
  }, [isDemoMode]);

  // メインナビゲーション
  const navigationItems = [
    { id: 'dashboard', label: 'ダッシュボード', icon: BarChart3, description: 'システム概要と統計' },
    { id: 'estimate', label: '見積作成', icon: FileText, description: '新規見積の作成・編集' },
    { id: 'templates', label: '様式テンプレート', icon: FileCheck, description: '見積書・請求書テンプレート' },
    { id: 'process', label: '工程表作成', icon: Calendar, description: '見積から工程表を自動生成' },
    { id: 'budget', label: '予算管理', icon: DollarSign, description: '予算と実績の管理' },
    { id: 'invoice', label: '請求書作成', icon: Package, description: '請求書の作成・発行' }
  ];

  // モバイル判定でUIを切り替え
  if (isMobile) {
    return (
      <MobileWorkflow 
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        currentProject={currentProject}
        onProjectChange={setCurrentProject}
        user={user}
        isDemoMode={isDemoMode}
        notifications={notifications}
        dashboardData={dashboardData}
      />
    );
  }

  return (
    <ErrorBoundary>
      <Container>
        <Sidebar $expanded={!showMobileMenu}>
          <SidebarHeader>
            <Logo>
              <h2>Garden DX</h2>
              {isDemoMode && <DemoTag>DEMO</DemoTag>}
            </Logo>
            <MenuToggle onClick={() => setShowMobileMenu(!showMobileMenu)}>
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </MenuToggle>
          </SidebarHeader>

          <Navigation>
            {navigationItems.map(item => (
              <NavItem
                key={item.id}
                $active={activeModule === item.id}
                onClick={() => setActiveModule(item.id)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setActiveModule(item.id);
                }}
              >
                <NavItemIcon $active={activeModule === item.id}>
                  <item.icon size={24} />
                </NavItemIcon>
                <NavItemContent>
                  <NavItemLabel>{item.label}</NavItemLabel>
                  <NavItemDescription>{item.description}</NavItemDescription>
                </NavItemContent>
              </NavItem>
            ))}
          </Navigation>

          <SidebarFooter>
            <UserInfo>
              <UserAvatar>
                {user?.user_metadata?.name?.charAt(0) || 'U'}
              </UserAvatar>
              <UserDetails>
                <UserName>{user?.user_metadata?.name || 'ユーザー'}</UserName>
                <UserRole>{user?.user_metadata?.role || '従業員'}</UserRole>
              </UserDetails>
            </UserInfo>
          </SidebarFooter>
        </Sidebar>

        <MainContent>
          <TopBar>
            <PageTitle>
              {navigationItems.find(item => item.id === activeModule)?.label || 'ダッシュボード'}
            </PageTitle>
            <TopBarActions>
              <NotificationButton>
                <Bell size={20} />
                {notifications.length > 0 && (
                  <NotificationBadge>{notifications.length}</NotificationBadge>
                )}
              </NotificationButton>
            </TopBarActions>
          </TopBar>

          <ContentArea>
            {activeModule === 'dashboard' && (
              <DashboardTop
                data={dashboardData}
                onModuleChange={setActiveModule}
                user={user}
              />
            )}
            {activeModule === 'estimate' && (
              <EstimateModule
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
              />
            )}
            {activeModule === 'templates' && (
              <DocumentTemplates />
            )}
            {activeModule === 'process' && (
              <ProcessModule
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
              />
            )}
            {activeModule === 'budget' && (
              <BudgetModule
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
              />
            )}
            {activeModule === 'invoice' && (
              <InvoiceModule
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
              />
            )}
          </ContentArea>
        </MainContent>
      </Container>
    </ErrorBoundary>
  );
};

// 見積作成モジュール
const EstimateModule = ({ currentProject, onProjectChange }) => {
  const [estimateType, setEstimateType] = useState('wizard');

  return (
    <ModuleContainer>
      <ModuleHeader>
        <ModuleTitle>見積作成</ModuleTitle>
        <ModuleActions>
          <ActionButton
            $variant={estimateType === 'wizard' ? 'primary' : 'default'}
            onClick={() => setEstimateType('wizard')}
          >
            ウィザード形式
          </ActionButton>
          <ActionButton
            $variant={estimateType === 'classic' ? 'primary' : 'default'}
            onClick={() => setEstimateType('classic')}
          >
            クラシック形式
          </ActionButton>
        </ModuleActions>
      </ModuleHeader>
      
      <ModuleContent>
        {estimateType === 'wizard' ? (
          <EstimateWizard 
            currentProject={currentProject}
            onProjectChange={onProjectChange}
          />
        ) : (
          <EstimateCreator 
            currentProject={currentProject}
            onProjectChange={onProjectChange}
          />
        )}
      </ModuleContent>
    </ModuleContainer>
  );
};

// 工程表作成モジュール
const ProcessModule = ({ currentProject, onProjectChange }) => {
  const [estimateData, setEstimateData] = useState(null);
  const [processData, setProcessData] = useState(null);

  const fetchEstimateData = useCallback(async () => {
    if (!currentProject?.estimateId) {
      const demoEstimateData = {
        id: 'demo_estimate_001',
        customerName: '田中造園株式会社',
        projectName: 'オフィスビル前庭園リニューアル工事',
        items: [
          {
            name: '既存植栽撤去・整地',
            description: '既存の植栽を撤去し、土壌を整備',
            category: '土工事',
            quantity: 1,
            unit: '式'
          },
          {
            name: '新規植栽工事',
            description: '中高木・低木・地被類の植栽',
            category: '植栽工事', 
            quantity: 1,
            unit: '式'
          }
        ],
        totalAmount: 850000
      };
      setEstimateData(demoEstimateData);
      return;
    }
    
    try {
      const response = await fetch(`/api/estimates/${currentProject.estimateId}`);
      const data = await response.json();
      setEstimateData(data);
    } catch (error) {
      console.error('見積データの取得に失敗:', error);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchEstimateData();
  }, [currentProject, fetchEstimateData]);

  const handleGenerateSchedule = async () => {
    if (!estimateData) return;
    
    try {
      const processSchedule = generateProcessSchedule(estimateData);
      setProcessData(processSchedule);
      
      await generateProcessPDF(processSchedule, {
        format: 'gantt',
        filename: `${estimateData.customerName || 'プロジェクト'}-工程表.pdf`
      });
    } catch (error) {
      console.error('工程表の生成に失敗:', error);
    }
  };

  return (
    <ModuleContainer>
      <ModuleHeader>
        <ModuleTitle>工程表作成</ModuleTitle>
        <ModuleActions>
          <ActionButton onClick={handleGenerateSchedule} disabled={!estimateData}>
            工程表を自動生成
          </ActionButton>
        </ModuleActions>
      </ModuleHeader>
      
      <ModuleContent>
        {estimateData ? (
          <ProcessScheduleManager
            estimateData={estimateData}
            onScheduleUpdate={(schedule) => {
              setProcessData(schedule);
              console.log('工程表が更新されました:', schedule);
            }}
          />
        ) : (
          <EmptyState>
            <EmptyStateIcon>📅</EmptyStateIcon>
            <EmptyStateTitle>工程表を作成しましょう</EmptyStateTitle>
            <EmptyStateDescription>
              工程表を作成するには、まず見積書を作成してください。
            </EmptyStateDescription>
          </EmptyState>
        )}
      </ModuleContent>
    </ModuleContainer>
  );
};

// 予算管理モジュール
const BudgetModule = ({ currentProject, onProjectChange }) => {
  return (
    <ModuleContainer>
      <ModuleHeader>
        <ModuleTitle>予算管理</ModuleTitle>
        <ModuleActions>
          <ActionButton>予算レポート</ActionButton>
        </ModuleActions>
      </ModuleHeader>
      
      <ModuleContent>
        <BudgetManagement
          projectId={currentProject?.id}
          estimateId={currentProject?.estimateId}
          onBudgetUpdate={() => {
            console.log('Budget updated');
          }}
        />
      </ModuleContent>
    </ModuleContainer>
  );
};

// 請求書作成モジュール
const InvoiceModule = ({ currentProject, onProjectChange }) => {
  const [invoiceData, setInvoiceData] = useState(null);

  const handleCreateInvoice = async () => {
    if (!currentProject?.estimateId) return;
    
    try {
      const response = await fetch(`/api/estimates/${currentProject.estimateId}`);
      const estimateData = await response.json();
      
      const invoiceData = {
        customerName: estimateData.customerName,
        items: estimateData.items,
        totalAmount: estimateData.totalAmount,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      setInvoiceData(invoiceData);
    } catch (error) {
      console.error('請求書の作成に失敗:', error);
    }
  };

  return (
    <ModuleContainer>
      <ModuleHeader>
        <ModuleTitle>請求書作成</ModuleTitle>
        <ModuleActions>
          <ActionButton onClick={handleCreateInvoice} disabled={!currentProject?.estimateId}>
            見積から請求書作成
          </ActionButton>
        </ModuleActions>
      </ModuleHeader>
      
      <ModuleContent>
        {invoiceData ? (
          <InvoiceForm 
            initialData={invoiceData}
            onSave={(data) => {
              console.log('Invoice saved:', data);
            }}
          />
        ) : (
          <EmptyState>
            <EmptyStateIcon>📋</EmptyStateIcon>
            <EmptyStateTitle>請求書を作成しましょう</EmptyStateTitle>
            <EmptyStateDescription>
              請求書を作成するには、まず見積書を選択してください。
            </EmptyStateDescription>
          </EmptyState>
        )}
      </ModuleContent>
    </ModuleContainer>
  );
};

// スタイルコンポーネント（タッチ最適化）
const Container = styled.div`
  display: flex;
  height: 100vh;
  background: #f8fafc;
  overflow: hidden;
`;

const Sidebar = styled.nav`
  width: ${props => props.$expanded ? '260px' : '60px'};
  background: #1f2937;
  color: white;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    width: ${props => props.$expanded ? '100%' : '0'};
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    height: 100vh;
  }
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #374151;
  display: flex;
  align-items: center;
  justify-content: space-between;
  -webkit-user-select: none;
  user-select: none;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }
`;

const DemoTag = styled.span`
  background: #ef4444;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
`;

const MenuToggle = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  display: none;
  padding: 8px;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const Navigation = styled.div`
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  cursor: pointer;
  background: ${props => props.$active ? '#374151' : 'transparent'};
  border: none;
  border-right: ${props => props.$active ? '4px solid #3b82f6' : 'none'};
  border-radius: 8px;
  margin: 4px 12px;
  transition: all 0.2s ease;
  width: calc(100% - 24px);
  text-align: left;
  color: white;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
  
  &:hover {
    background: #374151;
    transform: translateX(4px);
  }

  &:active {
    background: #4b5563;
    transform: scale(0.98);
  }

  @media (max-width: 768px) {
    padding: 20px;
    margin: 8px 12px;
  }
`;

const NavItemIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${props => props.$active ? '#3b82f6' : 'rgba(59, 130, 246, 0.1)'};
  color: ${props => props.$active ? 'white' : '#3b82f6'};
  flex-shrink: 0;
`;

const NavItemContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const NavItemLabel = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: white;
`;

const NavItemDescription = styled.span`
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.3;
`;

const SidebarFooter = styled.div`
  padding: 20px;
  border-top: 1px solid #374151;
  -webkit-user-select: none;
  user-select: none;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
`;

const UserDetails = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-size: 14px;
  font-weight: 600;
`;

const UserRole = styled.div`
  font-size: 12px;
  color: #9ca3af;
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const TopBar = styled.header`
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  -webkit-user-select: none;
  user-select: none;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const NotificationButton = styled.button`
  position: relative;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  
  &:hover {
    background: #f3f4f6;
  }

  &:active {
    background: #e5e7eb;
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  background: #ef4444;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 50%;
  min-width: 16px;
  text-align: center;
`;

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  background: #f8fafc;
  -webkit-overflow-scrolling: touch;
`;

const ModuleContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const ModuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const ModuleTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
`;

const ModuleActions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  background: ${props => props.$variant === 'primary' ? '#3b82f6' : 'white'};
  color: ${props => props.$variant === 'primary' ? 'white' : '#374151'};
  border: 1px solid ${props => props.$variant === 'primary' ? '#3b82f6' : '#e5e7eb'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
  
  &:hover:not(:disabled) {
    background: ${props => props.$variant === 'primary' ? '#2563eb' : '#f9fafb'};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 12px 24px;
    font-size: 16px;
  }
`;

const ModuleContent = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
    border-radius: 8px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
`;

const EmptyStateIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const EmptyStateTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
`;

const EmptyStateDescription = styled.p`
  color: #6b7280;
  max-width: 400px;
  margin: 0 auto;
`;

export default MobileOptimizedGardenDX;