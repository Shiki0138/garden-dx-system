import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Package, 
  Users, 
  Settings,
  BarChart3,
  Camera,
  MapPin,
  Menu,
  X,
  Bell,
  Home,
  ChevronRight
} from 'lucide-react';
import EstimateWizard from './EstimateWizard';
import ProcessManagement from './ProcessManagement';
import BudgetManagement from './BudgetManagement';
import InvoiceForm from './invoices/InvoiceForm';
import DashboardTop from './DashboardTop';
import EstimateTemplateDemo from './EstimateTemplateDemo';
import DocumentTemplates from './DocumentTemplates';

const MobileWorkflow = ({ 
  activeModule = 'home', 
  setActiveModule,
  currentProject,
  onProjectChange,
  user,
  isDemoMode,
  notifications = [],
  dashboardData = {}
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // カメラの初期化
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (err) {
      console.error('カメラの起動に失敗しました:', err);
      alert('カメラへのアクセスが許可されていません。設定を確認してください。');
    }
  };

  // カメラの停止
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setShowCamera(false);
    }
  };

  // 写真撮影
  const capturePhoto = () => {
    if (!cameraStream) return;
    
    const video = document.getElementById('camera-preview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // 画像を保存（実際の実装では適切な保存処理を行う）
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      console.log('撮影した写真:', url);
      alert('写真を撮影しました！');
      stopCamera();
    });
  };

  // 現在地取得
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('位置情報サービスがサポートされていません');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        alert(`現在地を取得しました\n緯度: ${position.coords.latitude}\n経度: ${position.coords.longitude}`);
      },
      (error) => {
        setLocationError(error.message);
        alert('現在地の取得に失敗しました。位置情報の許可を確認してください。');
      }
    );
  };


  // クリーンアップ
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const menuItems = [
    { id: 'home', label: 'ホーム', icon: Home },
    { id: 'estimate', label: '見積作成', icon: FileText },
    { id: 'templates', label: 'テンプレート', icon: FileText },
    { id: 'process', label: '工程表', icon: Calendar },
    { id: 'budget', label: '予算管理', icon: DollarSign },
    { id: 'invoice', label: '請求書', icon: Package }
  ];

  const handleMenuItemClick = (itemId) => {
    setActiveModule(itemId);
    setShowMenu(false);
  };

  return (
    <MobileContainer>
      <MobileHeader>
        <HeaderLeft>
          <MenuButton onClick={() => setShowMenu(!showMenu)}>
            {showMenu ? <X size={24} /> : <Menu size={24} />}
          </MenuButton>
          <Logo>Garden DX</Logo>
        </HeaderLeft>
        <HeaderRight>
          <NotificationIcon>
            <Bell size={20} />
            {notifications.length > 0 && (
              <NotificationBadge>{notifications.length}</NotificationBadge>
            )}
          </NotificationIcon>
        </HeaderRight>
      </MobileHeader>

      {/* ユーザー情報バナー */}
      <UserBanner>
        <UserInfo>
          <UserName>{user?.user_metadata?.name || 'テストユーザー'}</UserName>
          <UserRole>{isDemoMode ? 'プレビューモード' : (user?.user_metadata?.role || '従業員')}</UserRole>
        </UserInfo>
      </UserBanner>

      {/* メニュードロワー */}
      <MenuDrawer $isOpen={showMenu}>
        <MenuItems>
          {menuItems.map(item => (
            <MenuItem
              key={item.id}
              $active={activeModule === item.id}
              onClick={() => handleMenuItemClick(item.id)}
            >
              <MenuItemIcon>
                <item.icon size={20} />
              </MenuItemIcon>
              <MenuItemLabel>{item.label}</MenuItemLabel>
              <ChevronRight size={16} />
            </MenuItem>
          ))}
        </MenuItems>
      </MenuDrawer>

      {/* メニューオーバーレイ */}
      {showMenu && <Overlay onClick={() => setShowMenu(false)} />}

      {/* メインコンテンツ */}
      <MobileContent>
        {activeModule === 'home' && (
          <HomeScreen>
            <QuickActions>
              <ActionButton onClick={() => setActiveModule('estimate')}>
                <FileText size={32} />
                <ActionLabel>新規見積もり</ActionLabel>
              </ActionButton>
              <ActionButton onClick={initCamera}>
                <Camera size={32} />
                <ActionLabel>写真撮影</ActionLabel>
              </ActionButton>
              <ActionButton onClick={getCurrentLocation}>
                <MapPin size={32} />
                <ActionLabel>現在地</ActionLabel>
              </ActionButton>
            </QuickActions>

            <RecentSection>
              <SectionTitle>最近のプロジェクト</SectionTitle>
              <ProjectList>
                <ProjectItem onClick={() => setActiveModule('estimate')}>
                  <ProjectName>○○邸 庭園リフォーム</ProjectName>
                  <ProjectStatus>見積作成中</ProjectStatus>
                </ProjectItem>
                <ProjectItem onClick={() => setActiveModule('process')}>
                  <ProjectName>△△公園 植栽工事</ProjectName>
                  <ProjectStatus>工程管理中</ProjectStatus>
                </ProjectItem>
              </ProjectList>
            </RecentSection>
          </HomeScreen>
        )}

        {activeModule === 'estimate' && (
          <EstimateWizard 
            currentProject={currentProject}
            onProjectChange={onProjectChange}
          />
        )}

        {activeModule === 'templates' && (
          <DocumentTemplates />
        )}

        {activeModule === 'process' && (
          <ProcessManagement
            currentProject={currentProject}
            onProjectChange={onProjectChange}
          />
        )}

        {activeModule === 'budget' && (
          <BudgetManagement
            currentProject={currentProject}
            onProjectChange={onProjectChange}
          />
        )}

        {activeModule === 'invoice' && (
          <InvoiceForm
            currentProject={currentProject}
            onProjectChange={onProjectChange}
          />
        )}
      </MobileContent>

      {/* カメラビュー */}
      {showCamera && (
        <CameraView>
          <CameraHeader>
            <CloseButton onClick={stopCamera}>
              <X size={24} />
            </CloseButton>
          </CameraHeader>
          <VideoPreview
            id="camera-preview"
            autoPlay
            playsInline
            ref={(video) => {
              if (video && cameraStream) {
                video.srcObject = cameraStream;
              }
            }}
          />
          <CaptureButton onClick={capturePhoto}>
            <Camera size={32} />
          </CaptureButton>
        </CameraView>
      )}
    </MobileContainer>
  );
};

// スタイル定義
const MobileContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  position: relative;
  overflow: hidden;
`;

const MobileHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #2c3e50;
  color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: white;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  
  &:active {
    opacity: 0.7;
  }
`;

const Logo = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
`;

const NotificationIcon = styled.div`
  position: relative;
  padding: 0.5rem;
  cursor: pointer;
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  background: #e74c3c;
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
`;

const UserBanner = styled.div`
  background: #34495e;
  color: white;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
`;

const UserInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const UserName = styled.div`
  font-weight: 500;
`;

const UserRole = styled.div`
  font-size: 0.875rem;
  opacity: 0.8;
`;

const MenuDrawer = styled.nav`
  position: fixed;
  top: 0;
  left: ${props => props.$isOpen ? '0' : '-100%'};
  width: 280px;
  height: 100vh;
  background: white;
  box-shadow: 2px 0 10px rgba(0,0,0,0.1);
  transition: left 0.3s ease;
  z-index: 200;
  overflow-y: auto;
  padding-top: 4rem;
`;

const MenuItems = styled.div`
  padding: 1rem 0;
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 1rem 1.5rem;
  background: ${props => props.$active ? '#e3f2fd' : 'none'};
  border: none;
  cursor: pointer;
  transition: background 0.2s;
  -webkit-tap-highlight-color: transparent;
  
  &:active {
    background: #e3f2fd;
  }
`;

const MenuItemIcon = styled.div`
  margin-right: 1rem;
  color: #64b5f6;
`;

const MenuItemLabel = styled.span`
  flex: 1;
  text-align: left;
  font-size: 1rem;
  color: #333;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 150;
`;

const MobileContent = styled.main`
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2rem;
`;

const HomeScreen = styled.div`
  padding: 1rem;
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
`;

const ActionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
  
  &:active {
    transform: scale(0.98);
    background: #f5f5f5;
  }
  
  svg {
    color: #64b5f6;
    margin-bottom: 0.5rem;
  }
`;

const ActionLabel = styled.span`
  font-size: 0.875rem;
  color: #333;
  font-weight: 500;
`;

const RecentSection = styled.section`
  margin-top: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
`;

const ProjectList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ProjectItem = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  
  &:active {
    background: #f5f5f5;
  }
`;

const ProjectName = styled.div`
  font-weight: 500;
  color: #333;
`;

const ProjectStatus = styled.div`
  font-size: 0.875rem;
  color: #666;
`;

const CameraView = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: black;
  z-index: 300;
  display: flex;
  flex-direction: column;
`;

const CameraHeader = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: rgba(0,0,0,0.5);
  z-index: 301;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  padding: 0.5rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  
  &:active {
    opacity: 0.7;
  }
`;

const VideoPreview = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CaptureButton = styled.button`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: white;
  border: 3px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  
  &:active {
    transform: translateX(-50%) scale(0.9);
  }
  
  svg {
    color: #333;
  }
`;

export default MobileWorkflow;