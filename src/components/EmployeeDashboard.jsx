/**
 * 従業員用ダッシュボード
 * 工程表閲覧と作業報告機能のみにアクセス可能
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  FiCalendar,
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiCamera,
  FiLogOut,
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import WorkReport from './WorkReport';
import InteractiveGanttChart from './InteractiveGanttChart';
import {
  FONT_SIZES,
  TOUCH_SIZES,
  SPACING,
  MOBILE_STYLES,
  COLORS,
  mediaQuery,
} from '../styles/mobileConstants';

// スタイルコンポーネント
const Container = styled.div`
  min-height: 100vh;
  background: ${COLORS.gray[50]};
  ${MOBILE_STYLES.safeArea}
`;

const Header = styled.div`
  background: linear-gradient(135deg, #2d5a2d 0%, #4a7c4a 100%);
  color: ${COLORS.white};
  padding: ${SPACING.lg};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${SPACING.md};
`;

const Logo = styled.div`
  font-size: ${FONT_SIZES.large};
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: ${SPACING.sm};
`;

const LogoutButton = styled.button`
  ${MOBILE_STYLES.touchTarget}
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: ${COLORS.white};
  padding: ${SPACING.sm} ${SPACING.md};
  display: flex;
  align-items: center;
  gap: ${SPACING.xs};
  font-size: ${FONT_SIZES.small};
`;

const UserInfo = styled.div`
  text-align: center;
  opacity: 0.9;
`;

const UserName = styled.div`
  font-size: ${FONT_SIZES.medium};
  font-weight: 500;
`;

const UserRole = styled.div`
  font-size: ${FONT_SIZES.small};
  opacity: 0.8;
`;

const Content = styled.div`
  padding: ${SPACING.base};
  max-width: 600px;
  margin: 0 auto;
`;

const MenuGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${SPACING.base};
  margin-bottom: ${SPACING.xl};
`;

const MenuCard = styled.button`
  ${MOBILE_STYLES.touchTarget}
  background: ${COLORS.white};
  border: 2px solid ${COLORS.gray[200]};
  border-radius: 16px;
  padding: ${SPACING.xl};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${SPACING.md};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  &:hover {
    border-color: ${COLORS.primary[400]};
    box-shadow: 0 4px 12px rgba(45, 90, 45, 0.1);
  }
`;

const MenuIcon = styled.div`
  width: 48px;
  height: 48px;
  background: ${COLORS.primary[100]};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${COLORS.primary[600]};
`;

const MenuTitle = styled.div`
  font-size: ${FONT_SIZES.medium};
  font-weight: 600;
  color: ${COLORS.gray[800]};
`;

const MenuDescription = styled.div`
  font-size: ${FONT_SIZES.tiny};
  color: ${COLORS.gray[600]};
  text-align: center;
`;

const StatusSection = styled.div`
  background: ${COLORS.white};
  border-radius: 12px;
  padding: ${SPACING.lg};
  margin-bottom: ${SPACING.lg};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const StatusTitle = styled.h3`
  font-size: ${FONT_SIZES.medium};
  color: ${COLORS.gray[800]};
  margin-bottom: ${SPACING.md};
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.sm};
  padding: ${SPACING.sm} 0;
  border-bottom: 1px solid ${COLORS.gray[100]};

  &:last-child {
    border-bottom: none;
  }
`;

const StatusIcon = styled.div`
  color: ${props => (props.completed ? COLORS.green[600] : COLORS.yellow[600])};
`;

const StatusText = styled.div`
  flex: 1;
  font-size: ${FONT_SIZES.small};
  color: ${COLORS.gray[700]};
`;

const StatusTime = styled.div`
  font-size: ${FONT_SIZES.tiny};
  color: ${COLORS.gray[500]};
`;

const RecentReports = styled.div`
  background: ${COLORS.white};
  border-radius: 12px;
  padding: ${SPACING.lg};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const ReportItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.md};
  padding: ${SPACING.md} 0;
  border-bottom: 1px solid ${COLORS.gray[100]};

  &:last-child {
    border-bottom: none;
  }
`;

const ReportThumbnail = styled.div`
  width: 60px;
  height: 60px;
  background: ${COLORS.gray[100]};
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ReportInfo = styled.div`
  flex: 1;
`;

const ReportTitle = styled.div`
  font-size: ${FONT_SIZES.small};
  font-weight: 500;
  color: ${COLORS.gray[800]};
  margin-bottom: ${SPACING.xs};
`;

const ReportMeta = styled.div`
  font-size: ${FONT_SIZES.tiny};
  color: ${COLORS.gray[500]};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${SPACING.xl};
  color: ${COLORS.gray[500]};
  font-size: ${FONT_SIZES.small};
`;

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('home'); // home, schedule, report
  const [todayStatus, setTodayStatus] = useState({
    beforeReport: false,
    afterReport: false,
  });
  const [recentReports, setRecentReports] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    // 今日の報告状況を確認
    checkTodayStatus();
    // 最近の報告を読み込み
    loadRecentReports();
    // 現在のプロジェクトを取得
    loadCurrentProject();
  }, []);

  const checkTodayStatus = () => {
    // デモ用: ローカルストレージから確認
    const today = new Date().toDateString();
    const reports = JSON.parse(localStorage.getItem('work_reports_demo') || '[]');
    const todayReports = reports.filter(r => new Date(r.createdAt).toDateString() === today);

    setTodayStatus({
      beforeReport: todayReports.some(r => r.reportType === 'before'),
      afterReport: todayReports.some(r => r.reportType === 'after'),
    });
  };

  const loadRecentReports = () => {
    // デモ用: ローカルストレージから読み込み
    const reports = JSON.parse(localStorage.getItem('work_reports_demo') || '[]');
    setRecentReports(reports.slice(-3).reverse());
  };

  const loadCurrentProject = () => {
    // デモ用: 仮のプロジェクトデータ
    setCurrentProject({
      id: 'demo-project',
      name: '○○様邸 造園工事',
      startDate: '2025-07-01',
      endDate: '2025-07-31',
    });
  };

  const handleLogout = () => {
    logout();
  };

  // ビューの切り替え
  if (activeView === 'schedule') {
    return (
      <Container>
        <Header>
          <HeaderContent>
            <LogoutButton onClick={() => setActiveView('home')}>← 戻る</LogoutButton>
            <Logo>工程表</Logo>
            <div style={{ width: 60 }} />
          </HeaderContent>
        </Header>
        <Content>
          <InteractiveGanttChart projectId={currentProject?.id} viewOnly={true} />
        </Content>
      </Container>
    );
  }

  if (activeView === 'report') {
    return (
      <WorkReport
        projectId={currentProject?.id}
        onBack={() => {
          setActiveView('home');
          checkTodayStatus();
          loadRecentReports();
        }}
      />
    );
  }

  // ホーム画面
  return (
    <Container>
      <Header>
        <HeaderContent>
          <Logo>🌿 Garden DX</Logo>
          <LogoutButton onClick={handleLogout}>
            <FiLogOut size={16} />
            ログアウト
          </LogoutButton>
        </HeaderContent>
        <UserInfo>
          <UserName>{user?.email || 'demo@garden-dx.com'}</UserName>
          <UserRole>作業員</UserRole>
        </UserInfo>
      </Header>

      <Content>
        {/* メインメニュー */}
        <MenuGrid>
          <MenuCard onClick={() => setActiveView('schedule')}>
            <MenuIcon>
              <FiCalendar size={24} />
            </MenuIcon>
            <MenuTitle>工程表</MenuTitle>
            <MenuDescription>今日の作業予定を確認</MenuDescription>
          </MenuCard>

          <MenuCard onClick={() => setActiveView('report')}>
            <MenuIcon>
              <FiFileText size={24} />
            </MenuIcon>
            <MenuTitle>作業報告</MenuTitle>
            <MenuDescription>作業内容を報告</MenuDescription>
          </MenuCard>
        </MenuGrid>

        {/* 今日の報告状況 */}
        <StatusSection>
          <StatusTitle>今日の報告状況</StatusTitle>
          <StatusItem>
            <StatusIcon completed={todayStatus.beforeReport}>
              {todayStatus.beforeReport ? <FiCheckCircle size={20} /> : <FiAlertCircle size={20} />}
            </StatusIcon>
            <StatusText>作業前報告</StatusText>
            <StatusTime>{todayStatus.beforeReport ? '完了' : '未報告'}</StatusTime>
          </StatusItem>
          <StatusItem>
            <StatusIcon completed={todayStatus.afterReport}>
              {todayStatus.afterReport ? <FiCheckCircle size={20} /> : <FiClock size={20} />}
            </StatusIcon>
            <StatusText>作業後報告</StatusText>
            <StatusTime>{todayStatus.afterReport ? '完了' : '未報告'}</StatusTime>
          </StatusItem>
        </StatusSection>

        {/* 最近の報告 */}
        <RecentReports>
          <StatusTitle>最近の報告</StatusTitle>
          {recentReports.length > 0 ? (
            recentReports.map((report, index) => (
              <ReportItem key={index}>
                <ReportThumbnail>
                  {report.photos && report.photos[0] ? (
                    <img src={report.photos[0].url} alt="報告写真" />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: COLORS.gray[400],
                      }}
                    >
                      <FiCamera size={24} />
                    </div>
                  )}
                </ReportThumbnail>
                <ReportInfo>
                  <ReportTitle>
                    {report.reportType === 'before' ? '作業前報告' : '作業後報告'}
                  </ReportTitle>
                  <ReportMeta>
                    {new Date(report.createdAt).toLocaleDateString('ja-JP')}{' '}
                    {new Date(report.createdAt).toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </ReportMeta>
                </ReportInfo>
              </ReportItem>
            ))
          ) : (
            <EmptyState>まだ報告がありません</EmptyState>
          )}
        </RecentReports>
      </Content>
    </Container>
  );
};

export default EmployeeDashboard;
