import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  BarChart3,
  ArrowRight,
  Plus,
  Eye,
  Edit,
  Leaf,
  Sun
} from 'lucide-react';

// スタイルコンポーネント
const DashboardContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  background: #f8fafc;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const WelcomeSection = styled.div`
  background: linear-gradient(135deg, #2d5a2d 0%, #4a7c4a 100%);
  color: white;
  padding: 32px;
  border-radius: 16px;
  margin-bottom: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;

  &::after {
    content: '🌿';
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 80px;
    opacity: 0.2;
  }

  @media (max-width: 768px) {
    padding: 24px;
    
    &::after {
      font-size: 60px;
    }
  }
`;

const WelcomeTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 8px;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const WelcomeSubtitle = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const StatCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    border-color: #4a7c4a;
  }
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const StatTitle = styled.h3`
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.bgColor || '#f0f9ff'};
  color: ${props => props.color || '#3b82f6'};
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
`;

const StatChange = styled.div`
  font-size: 0.875rem;
  color: ${props => props.positive ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const QuickActionsSection = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const QuickActionButton = styled.button`
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;

  &:hover {
    background: #f8fafc;
    border-color: #4a7c4a;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(74, 124, 74, 0.2);
  }

  svg {
    color: #4a7c4a;
  }
`;

const QuickActionLabel = styled.span`
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
`;

const RecentActivitySection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ActivityCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
`;

const ActivityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ActivityTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ViewAllLink = styled.a`
  color: #4a7c4a;
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    text-decoration: underline;
  }
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ActivityItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
`;

const ActivityInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ActivityIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.bgColor || '#e8f5e8'};
  color: ${props => props.color || '#4a7c4a'};
`;

const ActivityText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ActivityName = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
`;

const ActivityDate = styled.span`
  font-size: 0.75rem;
  color: #64748b;
`;

const ActivityStatus = styled.span`
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  background: ${props => {
    switch (props.status) {
      case 'completed': return '#dcfce7';
      case 'pending': return '#fef3c7';
      case 'inProgress': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'completed': return '#15803d';
      case 'pending': return '#a16207';
      case 'inProgress': return '#1e40af';
      default: return '#6b7280';
    }
  }};
`;

const SeasonalNotice = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  border: 1px solid #fbbf24;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const SeasonalIcon = styled.div`
  font-size: 48px;
`;

const SeasonalText = styled.div`
  flex: 1;
`;

const SeasonalTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 4px;
`;

const SeasonalMessage = styled.p`
  font-size: 0.875rem;
  color: #92400e;
  margin: 0;
`;

const DashboardTop = ({ data = {}, onModuleChange, user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) {
      setGreeting('おはようございます');
    } else if (hour < 18) {
      setGreeting('こんにちは');
    } else {
      setGreeting('こんばんは');
    }
  }, [currentTime]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  const getSeasonalMessage = () => {
    const month = currentTime.getMonth() + 1;
    if (month >= 3 && month <= 5) {
      return { icon: '🌸', title: '春の繁忙期', message: '新規造園工事のご依頼が増える時期です' };
    } else if (month >= 6 && month <= 8) {
      return { icon: '☀️', title: '夏季作業', message: '熱中症対策を万全に、早朝作業を推奨します' };
    } else if (month >= 9 && month <= 11) {
      return { icon: '🍁', title: '秋の植栽シーズン', message: '植栽工事に最適な時期です' };
    } else {
      return { icon: '❄️', title: '冬季メンテナンス', message: '剪定・防寒対策の時期です' };
    }
  };

  const seasonal = getSeasonalMessage();

  const stats = {
    totalProjects: data.totalProjects || 12,
    activeEstimates: data.activeEstimates || 5,
    monthlyRevenue: data.monthlyRevenue || 3580000,
    completedProcesses: data.completedProcesses || 8,
    pendingInvoices: data.pendingInvoices || 3,
    staffCount: data.staffCount || 15
  };

  const recentEstimates = [
    { id: 1, name: '田中邸 庭園リフォーム', date: '2024-01-22', status: 'pending', amount: 1650000 },
    { id: 2, name: '山田様 新築外構工事', date: '2024-01-21', status: 'completed', amount: 2300000 },
    { id: 3, name: '佐藤マンション 植栽管理', date: '2024-01-20', status: 'inProgress', amount: 450000 }
  ];

  const upcomingProjects = [
    { id: 1, name: '鈴木邸 芝生張替工事', date: '2024-01-25', type: '施工', duration: '3日間' },
    { id: 2, name: '高橋様 庭木剪定', date: '2024-01-26', type: 'メンテナンス', duration: '1日' },
    { id: 3, name: '公園整備プロジェクト', date: '2024-01-28', type: '施工', duration: '7日間' }
  ];

  return (
    <DashboardContainer>
      <WelcomeSection>
        <WelcomeTitle>{greeting}、{user?.name || '管理者'}さん</WelcomeTitle>
        <WelcomeSubtitle>
          {currentTime.toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })} - Garden DX システムへようこそ
        </WelcomeSubtitle>
      </WelcomeSection>

      <SeasonalNotice>
        <SeasonalIcon>{seasonal.icon}</SeasonalIcon>
        <SeasonalText>
          <SeasonalTitle>{seasonal.title}</SeasonalTitle>
          <SeasonalMessage>{seasonal.message}</SeasonalMessage>
        </SeasonalText>
      </SeasonalNotice>

      <StatsGrid>
        <StatCard onClick={() => onModuleChange('process')}>
          <StatHeader>
            <StatTitle>進行中プロジェクト</StatTitle>
            <StatIcon bgColor="#e8f5e8" color="#4a7c4a">
              <Calendar size={24} />
            </StatIcon>
          </StatHeader>
          <StatValue>{stats.totalProjects}</StatValue>
          <StatChange positive>
            <TrendingUp size={16} />
            前月比 +2件
          </StatChange>
        </StatCard>

        <StatCard onClick={() => onModuleChange('estimate')}>
          <StatHeader>
            <StatTitle>作成中見積もり</StatTitle>
            <StatIcon bgColor="#fef3c7" color="#f59e0b">
              <FileText size={24} />
            </StatIcon>
          </StatHeader>
          <StatValue>{stats.activeEstimates}</StatValue>
          <StatChange positive={false}>
            <Clock size={16} />
            承認待ち 3件
          </StatChange>
        </StatCard>

        <StatCard onClick={() => onModuleChange('invoice')}>
          <StatHeader>
            <StatTitle>今月の売上</StatTitle>
            <StatIcon bgColor="#dcfce7" color="#22c55e">
              <DollarSign size={24} />
            </StatIcon>
          </StatHeader>
          <StatValue>{formatCurrency(stats.monthlyRevenue)}</StatValue>
          <StatChange positive>
            <TrendingUp size={16} />
            前月比 +15%
          </StatChange>
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatTitle>完了工程</StatTitle>
            <StatIcon bgColor="#dbeafe" color="#3b82f6">
              <CheckCircle size={24} />
            </StatIcon>
          </StatHeader>
          <StatValue>{stats.completedProcesses}</StatValue>
          <StatChange positive>
            今月の完了率 89%
          </StatChange>
        </StatCard>
      </StatsGrid>

      <QuickActionsSection>
        <SectionTitle>
          <Leaf size={24} />
          よく使う機能
        </SectionTitle>
        <QuickActionsGrid>
          <QuickActionButton onClick={() => onModuleChange('estimate')}>
            <Plus size={32} />
            <QuickActionLabel>新規見積作成</QuickActionLabel>
          </QuickActionButton>
          <QuickActionButton onClick={() => onModuleChange('process')}>
            <Calendar size={32} />
            <QuickActionLabel>工程表作成</QuickActionLabel>
          </QuickActionButton>
          <QuickActionButton onClick={() => onModuleChange('invoice')}>
            <Package size={32} />
            <QuickActionLabel>請求書発行</QuickActionLabel>
          </QuickActionButton>
          <QuickActionButton onClick={() => onModuleChange('budget')}>
            <DollarSign size={32} />
            <QuickActionLabel>予算管理</QuickActionLabel>
          </QuickActionButton>
          <QuickActionButton onClick={() => onModuleChange('templates')}>
            <FileText size={32} />
            <QuickActionLabel>テンプレート</QuickActionLabel>
          </QuickActionButton>
          <QuickActionButton>
            <Users size={32} />
            <QuickActionLabel>スタッフ管理</QuickActionLabel>
          </QuickActionButton>
        </QuickActionsGrid>
      </QuickActionsSection>

      <RecentActivitySection>
        <ActivityCard>
          <ActivityHeader>
            <ActivityTitle>
              <FileText size={20} />
              最近の見積もり
            </ActivityTitle>
            <ViewAllLink onClick={() => onModuleChange('estimate')}>
              すべて見る
              <ArrowRight size={16} />
            </ViewAllLink>
          </ActivityHeader>
          <ActivityList>
            {recentEstimates.map(estimate => (
              <ActivityItem key={estimate.id}>
                <ActivityInfo>
                  <ActivityIcon>
                    <FileText size={18} />
                  </ActivityIcon>
                  <ActivityText>
                    <ActivityName>{estimate.name}</ActivityName>
                    <ActivityDate>{formatCurrency(estimate.amount)}</ActivityDate>
                  </ActivityText>
                </ActivityInfo>
                <ActivityStatus status={estimate.status}>
                  {estimate.status === 'completed' ? '承認済み' : 
                   estimate.status === 'pending' ? '承認待ち' : '作成中'}
                </ActivityStatus>
              </ActivityItem>
            ))}
          </ActivityList>
        </ActivityCard>

        <ActivityCard>
          <ActivityHeader>
            <ActivityTitle>
              <Calendar size={20} />
              今後の予定
            </ActivityTitle>
            <ViewAllLink onClick={() => onModuleChange('process')}>
              すべて見る
              <ArrowRight size={16} />
            </ViewAllLink>
          </ActivityHeader>
          <ActivityList>
            {upcomingProjects.map(project => (
              <ActivityItem key={project.id}>
                <ActivityInfo>
                  <ActivityIcon bgColor="#dbeafe" color="#3b82f6">
                    <Calendar size={18} />
                  </ActivityIcon>
                  <ActivityText>
                    <ActivityName>{project.name}</ActivityName>
                    <ActivityDate>{project.date} - {project.duration}</ActivityDate>
                  </ActivityText>
                </ActivityInfo>
                <ActivityStatus status="inProgress">
                  {project.type}
                </ActivityStatus>
              </ActivityItem>
            ))}
          </ActivityList>
        </ActivityCard>
      </RecentActivitySection>
    </DashboardContainer>
  );
};

export default DashboardTop;