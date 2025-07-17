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
  X
} from 'lucide-react';
import { useSafeSupabaseAuth } from './AuthContextWrapper';
import ErrorBoundary from './ErrorBoundary';
import { useDemoMode } from '../contexts/DemoModeContext';

// 新しく作成したコンポーネントをインポート
import ProcessManagement from './ProcessManagement';
import ProcessScheduleManager from './ProcessScheduleManager';
import BudgetManagement from './BudgetManagement';
import PurchaseManagement from './PurchaseManagement';
import MobileWorkflow from './MobileWorkflow';
import EstimateCreator from './EstimateCreator';
import EstimateWizardPro from './EstimateWizardPro';
import InvoiceForm from './invoices/InvoiceForm';
import { generateProcessPDF } from '../utils/processPDFGenerator';
import { generateProcessSchedule } from '../utils/processGenerator';

const GardenDXMain = () => {
  const authContext = useSafeSupabaseAuth();
  const { user, isAuthenticated: isAuthenticatedFn, loading: authLoading } = authContext;
  const isAuthenticated = typeof isAuthenticatedFn === 'function' ? isAuthenticatedFn() : false;
  const { isDemoMode } = useDemoMode();
  
  // デバッグログ（開発環境のみ）
  useEffect(() => {
    if (process.env.REACT_APP_ENVIRONMENT === 'development') {
      console.log('GardenDXMain Auth State:', {
        isDemoMode,
        isAuthenticated,
        authLoading,
        user: user ? 'Present' : 'Null',
        authContext: authContext ? 'Available' : 'Missing'
      });
    }
  }, [isDemoMode, isAuthenticated, authLoading, user, authContext]);
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
      setIsMobile(window.innerWidth <= 768);
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
      // デモモードの場合はダミーデータを使用
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
      // エラー時はデフォルトデータを設定
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
      // デモモードの場合はダミー通知を使用
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
      // エラー時は空の配列を設定
      setNotifications([]);
    }
  }, [isDemoMode]);

  // メインナビゲーション - 5つの主要機能（ダッシュボードを追加）
  const navigationItems = [
    { id: 'dashboard', label: 'ダッシュボード', icon: BarChart3, description: 'システム概要と統計' },
    { id: 'estimate', label: '見積作成', icon: FileText, description: '新規見積の作成・編集' },
    { id: 'process', label: '工程表作成', icon: Calendar, description: '見積から工程表を自動生成' },
    { id: 'budget', label: '予算管理', icon: DollarSign, description: '予算と実績の管理' },
    { id: 'invoice', label: '請求書作成', icon: Package, description: '請求書の作成・発行' }
  ];

  // 認証情報ローディング中（開発環境では無効）
  if (process.env.REACT_APP_ENVIRONMENT === 'production' && !isDemoMode && authLoading) {
    return (
      <LoadingContainer>
        <div className="spinner">読み込み中...</div>
      </LoadingContainer>
    );
  }

  // モバイル表示の場合は専用コンポーネントを使用
  if (isMobile) {
    return <MobileWorkflow />;
  }

  // ログインしていない場合はリダイレクト（開発環境では無効）
  if (process.env.REACT_APP_ENVIRONMENT === 'production' && !isDemoMode && !isAuthenticated) {
    return (
      <LoginPrompt>
        <h2>ログインが必要です</h2>
        <p>Garden DXをご利用いただくには、ログインしてください。</p>
      </LoginPrompt>
    );
  }

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
            <DashboardView
              data={dashboardData}
              onModuleChange={setActiveModule}
              currentProject={currentProject}
              onProjectChange={setCurrentProject}
            />
          )}
          {activeModule === 'estimate' && (
            <EstimateModule
              currentProject={currentProject}
              onProjectChange={setCurrentProject}
            />
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

// ダッシュボードビュー
const DashboardView = ({ data, onModuleChange, currentProject, onProjectChange }) => {
  const [recentProjects, setRecentProjects] = useState([]);
  const [quickStats, setQuickStats] = useState({});

  useEffect(() => {
    fetchRecentProjects();
    fetchQuickStats();
  }, []);

  const fetchRecentProjects = async () => {
    try {
      const response = await fetch('/api/projects/recent', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const projectsData = await response.json();
      setRecentProjects(projectsData.projects || []);
    } catch (error) {
      console.error('最近のプロジェクトの取得に失敗:', error);
    }
  };

  const fetchQuickStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const stats = await response.json();
      setQuickStats(stats);
    } catch (error) {
      console.error('統計の取得に失敗:', error);
    }
  };

  return (
    <DashboardContainer>
      <StatsGrid>
        <StatCard>
          <StatIcon><FileText size={24} color="#3b82f6" /></StatIcon>
          <StatContent>
            <StatValue>{data.activeEstimates}</StatValue>
            <StatLabel>進行中の見積</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard>
          <StatIcon><Calendar size={24} color="#10b981" /></StatIcon>
          <StatContent>
            <StatValue>{data.completedProcesses}</StatValue>
            <StatLabel>完了工程</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard>
          <StatIcon><DollarSign size={24} color="#f59e0b" /></StatIcon>
          <StatContent>
            <StatValue>¥{data.monthlyRevenue.toLocaleString()}</StatValue>
            <StatLabel>今月の売上</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard>
          <StatIcon><Package size={24} color="#ef4444" /></StatIcon>
          <StatContent>
            <StatValue>{data.totalProjects}</StatValue>
            <StatLabel>総プロジェクト</StatLabel>
          </StatContent>
        </StatCard>
      </StatsGrid>

      <DashboardGrid>
        <DashboardSection>
          <SectionTitle>最近のプロジェクト</SectionTitle>
          <ProjectsList>
            {recentProjects.map(project => (
              <ProjectCard
                key={project.id}
                onClick={() => onProjectChange(project)}
                $active={currentProject?.id === project.id}
              >
                <ProjectTitle>{project.name}</ProjectTitle>
                <ProjectDetails>
                  <ProjectDetail>
                    <span>進捗:</span>
                    <ProgressBar>
                      <ProgressFill progress={project.progress} />
                    </ProgressBar>
                    <span>{project.progress}%</span>
                  </ProjectDetail>
                  <ProjectDetail>
                    <span>予算:</span>
                    <span>¥{project.budget.toLocaleString()}</span>
                  </ProjectDetail>
                </ProjectDetails>
              </ProjectCard>
            ))}
          </ProjectsList>
        </DashboardSection>

        <DashboardSection>
          <SectionTitle>クイックアクション</SectionTitle>
          <QuickActions>
            <QuickActionButton onClick={() => onModuleChange('estimate')}>
              <FileText size={20} />
              <span>新規見積作成</span>
            </QuickActionButton>
            <QuickActionButton onClick={() => onModuleChange('process')}>
              <Calendar size={20} />
              <span>工程管理</span>
            </QuickActionButton>
            <QuickActionButton onClick={() => onModuleChange('budget')}>
              <DollarSign size={20} />
              <span>予算入力</span>
            </QuickActionButton>
            <QuickActionButton onClick={() => onModuleChange('purchase')}>
              <Package size={20} />
              <span>仕入れ追加</span>
            </QuickActionButton>
          </QuickActions>
        </DashboardSection>
      </DashboardGrid>
    </DashboardContainer>
  );
};

// 見積モジュール
const EstimateModule = ({ currentProject, onProjectChange }) => {
  const [estimateMode, setEstimateMode] = useState('wizard'); // 'wizard' or 'advanced'
  const [estimateData, setEstimateData] = useState(null);

  const handleEstimateComplete = async (data) => {
    setEstimateData(data);
    
    // 見積から工程表を自動生成
    try {
      const processData = generateProcessSchedule(data);
      
      // 工程表PDFを生成
      await generateProcessPDF(processData, {
        format: 'gantt',
        filename: `${data.customerName}-工程表.pdf`
      });
      
      alert('見積書と工程表が作成されました');
    } catch (error) {
      console.error('工程表の生成に失敗:', error);
      alert('見積書は作成されましたが、工程表の生成に失敗しました');
    }
  };

  return (
    <EstimateContainer>
      <EstimateHeader>
        <ModeToggle>
          <ModeButton
            $active={estimateMode === 'wizard'}
            onClick={() => setEstimateMode('wizard')}
          >
            ウィザード形式
          </ModeButton>
          <ModeButton
            $active={estimateMode === 'advanced'}
            onClick={() => setEstimateMode('advanced')}
          >
            詳細入力
          </ModeButton>
        </ModeToggle>
      </EstimateHeader>

      {estimateMode === 'wizard' ? (
        <EstimateWizardPro
          onComplete={handleEstimateComplete}
          initialData={estimateData}
        />
      ) : (
        <EstimateCreator
          onComplete={handleEstimateComplete}
          initialData={estimateData}
        />
      )}
    </EstimateContainer>
  );
};

// 工程表作成モジュール
const ProcessModule = ({ currentProject, onProjectChange }) => {
  const [processData, setProcessData] = useState(null);
  const [estimateData, setEstimateData] = useState(null);

  const fetchEstimateData = useCallback(async () => {
    if (!currentProject?.estimateId) {
      // デモデータを設定（見積IDがない場合）
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
          },
          {
            name: 'ガーデンライト設置',
            description: 'LED照明器具の設置・配線工事',
            category: '設備工事',
            quantity: 6,
            unit: '基'
          },
          {
            name: '散水設備工事',
            description: '自動散水システムの設置',
            category: '設備工事',
            quantity: 1,
            unit: '式'
          },
          {
            name: '園路・小径整備',
            description: '石材による園路の整備',
            category: '土工事',
            quantity: 20,
            unit: 'm'
          }
        ],
        totalAmount: 850000
      };
      setEstimateData(demoEstimateData);
      return;
    }
    
    try {
      // 実際のAPIからデータを取得（本番環境用）
      const response = await fetch(`/api/estimates/${currentProject.estimateId}`);
      const data = await response.json();
      setEstimateData(data);
    } catch (error) {
      console.error('見積データの取得に失敗:', error);
      // エラー時もデモデータにフォールバック
      const fallbackData = {
        id: currentProject.estimateId,
        customerName: '見積書データ',
        projectName: '工程表作成プロジェクト',
        items: [
          { name: '準備作業', category: '一般作業', quantity: 1, unit: '式' },
          { name: 'メイン作業', category: '一般作業', quantity: 1, unit: '式' },
          { name: '仕上げ作業', category: '一般作業', quantity: 1, unit: '式' }
        ],
        totalAmount: 100000
      };
      setEstimateData(fallbackData);
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
      
      // 工程表PDFを生成
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
              見積書が完成すると、各工程の期間を入力して工程表を生成できます。
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
      // 見積データから請求書を作成
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
              {currentProject?.estimateId 
                ? '「見積から請求書作成」ボタンをクリックして、見積書から請求書を作成してください。'
                : '請求書を作成するには、まず見積書を作成してください。'
              }
            </EmptyStateDescription>
          </EmptyState>
        )}
      </ModuleContent>
    </ModuleContainer>
  );
};

// 設定ビュー
const SettingsView = () => {
  return (
    <SettingsContainer>
      <SettingsSection>
        <SettingsTitle>システム設定</SettingsTitle>
        <SettingsGrid>
          <SettingsCard>
            <h3>会社情報</h3>
            <p>会社名、住所、連絡先などの基本情報を設定</p>
          </SettingsCard>
          <SettingsCard>
            <h3>ユーザー管理</h3>
            <p>従業員アカウントの管理と権限設定</p>
          </SettingsCard>
          <SettingsCard>
            <h3>見積設定</h3>
            <p>見積書のテンプレートと初期値の設定</p>
          </SettingsCard>
          <SettingsCard>
            <h3>工程設定</h3>
            <p>標準工程の設定と工期の調整</p>
          </SettingsCard>
        </SettingsGrid>
      </SettingsSection>
    </SettingsContainer>
  );
};

// スタイル定義
const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f8fafc;
  
  .spinner {
    font-size: 1.5rem;
    color: #1a472a;
  }
`;

const Container = styled.div`
  display: flex;
  height: 100vh;
  background: #f8fafc;
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
  }
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #374151;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const Navigation = styled.div`
  flex: 1;
  padding: 20px 0;
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  cursor: pointer;
  background: ${props => props.$active ? '#374151' : 'transparent'};
  border-right: ${props => props.$active ? '4px solid #3b82f6' : 'none'};
  border-radius: 8px;
  margin: 4px 12px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #374151;
    transform: translateX(4px);
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
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
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
  
  &:hover {
    background: #f3f4f6;
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
`;

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const LoginPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f8fafc;
  text-align: center;
  
  h2 {
    color: #1f2937;
    margin-bottom: 8px;
  }
  
  p {
    color: #6b7280;
  }
`;

const DashboardContainer = styled.div`
  padding: 24px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const DashboardSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
`;

const ProjectsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProjectCard = styled.div`
  padding: 16px;
  border: 1px solid ${props => props.$active ? '#3b82f6' : '#e5e7eb'};
  border-radius: 8px;
  cursor: pointer;
  background: ${props => props.$active ? '#f0f9ff' : 'white'};
  
  &:hover {
    border-color: #3b82f6;
  }
`;

const ProjectTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
`;

const ProjectDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ProjectDetail = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #3b82f6;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const QuickActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const QuickActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  
  &:hover {
    background: #f1f5f9;
    border-color: #3b82f6;
  }
  
  span {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }
`;

const EstimateContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const EstimateHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
`;

const ModeToggle = styled.div`
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  width: fit-content;
`;

const ModeButton = styled.button`
  padding: 8px 16px;
  background: ${props => props.$active ? '#3b82f6' : 'white'};
  color: ${props => props.$active ? 'white' : '#374151'};
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f3f4f6'};
  }
`;

const SettingsContainer = styled.div`
  padding: 24px;
`;

const SettingsSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const SettingsTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`;

const SettingsCard = styled.div`
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  
  &:hover {
    border-color: #3b82f6;
  }
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 8px 0;
  }
  
  p {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }
`;

// 新しいモジュール用スタイルコンポーネント
const ModuleContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
`;

const ModuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const ModuleTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
`;

const ModuleActions = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const ModuleContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  background: white;
  margin: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const EmptyStateIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
`;

const EmptyStateTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
`;

const EmptyStateDescription = styled.p`
  font-size: 16px;
  color: #6b7280;
  margin: 0;
  max-width: 500px;
  line-height: 1.5;
`;

export default GardenDXMain;