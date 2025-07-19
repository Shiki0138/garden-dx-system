import React from 'react';
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
  ArrowRight
} from 'lucide-react';

// スタイルコンポーネント
const DashboardContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  background: #f8fafc;
  min-height: 100vh;
`;

const WelcomeSection = styled.div`
  background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%);
  color: white;
  padding: 32px;
  border-radius: 16px;
  margin-bottom: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
`;

const WelcomeTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 8px;
`;

const WelcomeSubtitle = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
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
  font-size: 0.9rem;
  color: ${props => props.positive ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ContentSection = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const QuickActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`;

const QuickActionCard = styled.button`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px solid #e2e8f0;
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &:hover {
    background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%);
    border-color: #1a472a;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(26, 71, 42, 0.2);

    svg {
      color: white;
    }
  }
`;

const ActionIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a472a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ActionTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const ActionDescription = styled.p`
  font-size: 0.875rem;
  opacity: 0.8;
  margin: 0;
`;

const RecentActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ActivityItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
  }
`;

const ActivityIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.bgColor || '#e0f2fe'};
  color: ${props => props.color || '#0ea5e9'};
  flex-shrink: 0;
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
`;

const ActivityTime = styled.div`
  font-size: 0.8rem;
  color: #64748b;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const ViewAllButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1a472a;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  margin-top: 16px;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    transform: translateX(4px);
  }
`;

// メインコンポーネント
const DashboardTop = ({ data, onModuleChange, user }) => {
  const stats = [
    {
      title: '進行中の見積',
      value: data.activeEstimates || 3,
      change: '+12%',
      positive: true,
      icon: <FileText size={24} />,
      color: '#3b82f6',
      bgColor: '#eff6ff'
    },
    {
      title: '今月の売上',
      value: `¥${(data.monthlyRevenue || 1250000).toLocaleString()}`,
      change: '+23%',
      positive: true,
      icon: <DollarSign size={24} />,
      color: '#10b981',
      bgColor: '#f0fdf4'
    },
    {
      title: 'アクティブプロジェクト',
      value: data.totalProjects || 5,
      change: '+2',
      positive: true,
      icon: <BarChart3 size={24} />,
      color: '#f59e0b',
      bgColor: '#fffbeb'
    },
    {
      title: '完了工程',
      value: data.completedProcesses || 8,
      change: '今週',
      positive: true,
      icon: <CheckCircle size={24} />,
      color: '#8b5cf6',
      bgColor: '#f5f3ff'
    }
  ];

  const quickActions = [
    {
      icon: <FileText size={20} />,
      title: '新規見積作成',
      description: '見積書を作成します',
      action: () => onModuleChange('estimate')
    },
    {
      icon: <Calendar size={20} />,
      title: '工程表作成',
      description: 'プロジェクトの工程表を作成',
      action: () => onModuleChange('process')
    },
    {
      icon: <DollarSign size={20} />,
      title: '予算管理',
      description: '予算と実績を管理',
      action: () => onModuleChange('budget')
    },
    {
      icon: <Package size={20} />,
      title: '請求書発行',
      description: '請求書を作成・発行',
      action: () => onModuleChange('invoice')
    }
  ];

  const recentActivities = [
    {
      icon: <FileText size={16} />,
      title: '見積書 #2024-001 が承認されました',
      time: '2時間前',
      type: 'success'
    },
    {
      icon: <Calendar size={16} />,
      title: '駒沢公園プロジェクトの工程が更新されました',
      time: '5時間前',
      type: 'info'
    },
    {
      icon: <AlertCircle size={16} />,
      title: '横浜プロジェクトの納期が近づいています',
      time: '1日前',
      type: 'warning'
    },
    {
      icon: <Package size={16} />,
      title: '請求書 #INV-2024-015 が発行されました',
      time: '2日前',
      type: 'success'
    }
  ];

  const getActivityColor = (type) => {
    switch(type) {
      case 'success': return { color: '#10b981', bgColor: '#f0fdf4' };
      case 'warning': return { color: '#f59e0b', bgColor: '#fffbeb' };
      case 'info': return { color: '#3b82f6', bgColor: '#eff6ff' };
      default: return { color: '#64748b', bgColor: '#f8fafc' };
    }
  };

  return (
    <DashboardContainer>
      <WelcomeSection>
        <WelcomeTitle>
          おはようございます、{user?.user_metadata?.name || user?.name || '田中様'}
        </WelcomeTitle>
        <WelcomeSubtitle>
          今日も素晴らしい一日になりますように。現在のプロジェクト状況をご確認ください。
        </WelcomeSubtitle>
      </WelcomeSection>

      <StatsGrid>
        {stats.map((stat, index) => (
          <StatCard key={index}>
            <StatHeader>
              <div>
                <StatTitle>{stat.title}</StatTitle>
                <StatValue>{stat.value}</StatValue>
                <StatChange positive={stat.positive}>
                  <TrendingUp size={16} />
                  {stat.change}
                </StatChange>
              </div>
              <StatIcon color={stat.color} bgColor={stat.bgColor}>
                {stat.icon}
              </StatIcon>
            </StatHeader>
          </StatCard>
        ))}
      </StatsGrid>

      <MainGrid>
        <ContentSection>
          <SectionTitle>
            <BarChart3 size={20} />
            クイックアクション
          </SectionTitle>
          <QuickActionGrid>
            {quickActions.map((action, index) => (
              <QuickActionCard key={index} onClick={action.action}>
                <ActionIcon>{action.icon}</ActionIcon>
                <div>
                  <ActionTitle>{action.title}</ActionTitle>
                  <ActionDescription>{action.description}</ActionDescription>
                </div>
              </QuickActionCard>
            ))}
          </QuickActionGrid>

          <SectionTitle style={{ marginTop: '32px' }}>
            <Users size={20} />
            プロジェクト進捗状況
          </SectionTitle>
          <div>
            <ActivityItem>
              <ActivityContent>
                <ActivityTitle>駒沢公園前庭園リニューアル工事</ActivityTitle>
                <ActivityTime>進捗率: 65%</ActivityTime>
                <ProgressBar>
                  <ProgressFill progress={65} />
                </ProgressBar>
              </ActivityContent>
            </ActivityItem>
            <ActivityItem>
              <ActivityContent>
                <ActivityTitle>横浜モデルハウス外構工事</ActivityTitle>
                <ActivityTime>進捗率: 30%</ActivityTime>
                <ProgressBar>
                  <ProgressFill progress={30} />
                </ProgressBar>
              </ActivityContent>
            </ActivityItem>
          </div>
        </ContentSection>

        <ContentSection>
          <SectionTitle>
            <Clock size={20} />
            最近のアクティビティ
          </SectionTitle>
          <RecentActivityList>
            {recentActivities.map((activity, index) => {
              const colors = getActivityColor(activity.type);
              return (
                <ActivityItem key={index}>
                  <ActivityIcon {...colors}>
                    {activity.icon}
                  </ActivityIcon>
                  <ActivityContent>
                    <ActivityTitle>{activity.title}</ActivityTitle>
                    <ActivityTime>{activity.time}</ActivityTime>
                  </ActivityContent>
                </ActivityItem>
              );
            })}
          </RecentActivityList>
          <ViewAllButton>
            すべて表示
            <ArrowRight size={16} />
          </ViewAllButton>
        </ContentSection>
      </MainGrid>
    </DashboardContainer>
  );
};

export default DashboardTop;