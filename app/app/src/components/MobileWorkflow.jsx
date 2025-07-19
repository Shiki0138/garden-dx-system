import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  FileText,
  Calendar,
  DollarSign,
  Package,
  Camera,
  MapPin,
  CheckCircle,
  Clock,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Menu,
  X,
} from 'lucide-react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import {
  FONT_SIZES,
  TOUCH_SIZES,
  SPACING,
  MOBILE_STYLES,
  COLORS,
  Z_INDEX,
  mediaQuery,
} from '../styles/mobileConstants';

const MobileWorkflow = ({
  activeModule,
  setActiveModule,
  currentProject,
  onProjectChange,
  user,
  isDemoMode,
  notifications,
  dashboardData,
}) => {
  const [activeTab, setActiveTab] = useState(activeModule || 'estimate');
  const [showMenu, setShowMenu] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [projects, setProjects] = useState([]);
  const [quickActions, setQuickActions] = useState([]);

  // 親コンポーネントのactiveModuleと同期
  useEffect(() => {
    if (activeModule !== activeTab) {
      setActiveTab(activeModule);
    }
  }, [activeModule, activeTab]);

  // タブ変更時に親のsetActiveModuleを呼び出し
  const handleTabChange = tab => {
    setActiveTab(tab);
    if (setActiveModule) {
      setActiveModule(tab);
    }
  };

  // 位置情報取得
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        error => {
          console.error('位置情報の取得に失敗:', error);
        }
      );
    }
  }, []);

  // カメラ起動
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      console.error('カメラの起動に失敗:', error);
      alert('カメラの起動に失敗しました');
    }
  }, []);

  // カメラ停止
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }, [cameraStream]);

  // クイックアクション
  const handleQuickAction = action => {
    switch (action) {
      case 'new-estimate':
        // 新しい見積作成
        window.location.href = '/estimate/new';
        break;
      case 'camera':
        startCamera();
        break;
      case 'location':
        if (currentLocation) {
          // 現在地を記録
          console.log('現在地:', currentLocation);
        }
        break;
      case 'emergency':
        // 緊急連絡
        window.location.href = 'tel:090-1234-5678';
        break;
      default:
        break;
    }
  };

  return (
    <Container>
      <MobileHeader>
        <HeaderLeft>
          <MenuButton onClick={() => setShowMenu(!showMenu)}>
            <Menu size={24} />
          </MenuButton>
          <HeaderTitle>Garden DX</HeaderTitle>
        </HeaderLeft>
        <HeaderRight>
          <LocationButton onClick={() => handleQuickAction('location')}>
            <MapPin size={20} />
          </LocationButton>
          <CameraButton onClick={() => handleQuickAction('camera')}>
            <Camera size={20} />
          </CameraButton>
        </HeaderRight>
      </MobileHeader>

      <QuickActionBar>
        <QuickActionButton priority="high" onClick={() => handleQuickAction('new-estimate')}>
          <Plus size={16} />
          <span>新規見積</span>
        </QuickActionButton>
        <QuickActionButton onClick={() => handleQuickAction('camera')}>
          <Camera size={16} />
          <span>写真</span>
        </QuickActionButton>
        <QuickActionButton onClick={() => handleQuickAction('location')}>
          <MapPin size={16} />
          <span>現在地</span>
        </QuickActionButton>
        <QuickActionButton priority="emergency" onClick={() => handleQuickAction('emergency')}>
          <span>緊急連絡</span>
        </QuickActionButton>
      </QuickActionBar>

      <TabNavigation>
        <TabButton active={activeTab === 'estimate'} onClick={() => handleTabChange('estimate')}>
          <FileText size={16} />
          <span>見積</span>
        </TabButton>
        <TabButton active={activeTab === 'process'} onClick={() => handleTabChange('process')}>
          <Calendar size={16} />
          <span>工程</span>
        </TabButton>
        <TabButton active={activeTab === 'budget'} onClick={() => handleTabChange('budget')}>
          <DollarSign size={16} />
          <span>予算</span>
        </TabButton>
        <TabButton active={activeTab === 'invoice'} onClick={() => handleTabChange('invoice')}>
          <Package size={16} />
          <span>請求</span>
        </TabButton>
      </TabNavigation>

      <TabContent>
        {activeTab === 'estimate' && <EstimateTab />}
        {activeTab === 'process' && <ProcessTab />}
        {activeTab === 'budget' && <BudgetTab />}
        {activeTab === 'invoice' && <InvoiceTab />}
      </TabContent>

      <FloatingActionButton onClick={() => handleQuickAction('new-estimate')}>
        <Plus size={24} />
      </FloatingActionButton>

      {showMenu && <MobileMenu onClose={() => setShowMenu(false)} />}

      {showCamera && (
        <CameraModal
          stream={cameraStream}
          onClose={stopCamera}
          onCapture={imageData => {
            // 写真を保存
            console.log('写真を撮影:', imageData);
            stopCamera();
          }}
        />
      )}
    </Container>
  );
};

// 見積タブ
const EstimateTab = () => {
  const [estimates, setEstimates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <TabContainer>
      <SearchBar>
        <SearchInput>
          <Search size={16} />
          <input
            type="text"
            placeholder="見積を検索..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </SearchInput>
        <FilterButton>
          <Filter size={16} />
        </FilterButton>
      </SearchBar>

      <CardList>
        <EstimateCard status="draft">
          <CardHeader>
            <CardTitle>田中様邸 庭園工事</CardTitle>
            <CardStatus status="draft">下書き</CardStatus>
          </CardHeader>
          <CardContent>
            <CardDetail>
              <span>金額:</span>
              <strong>¥850,000</strong>
            </CardDetail>
            <CardDetail>
              <span>作成日:</span>
              <span>2024/01/15</span>
            </CardDetail>
          </CardContent>
          <CardActions>
            <ActionButton size="small">編集</ActionButton>
            <ActionButton size="small" primary>
              送信
            </ActionButton>
          </CardActions>
        </EstimateCard>

        <EstimateCard status="sent">
          <CardHeader>
            <CardTitle>佐藤様邸 外構工事</CardTitle>
            <CardStatus status="sent">送信済み</CardStatus>
          </CardHeader>
          <CardContent>
            <CardDetail>
              <span>金額:</span>
              <strong>¥1,250,000</strong>
            </CardDetail>
            <CardDetail>
              <span>送信日:</span>
              <span>2024/01/12</span>
            </CardDetail>
          </CardContent>
          <CardActions>
            <ActionButton size="small">詳細</ActionButton>
            <ActionButton size="small">追跡</ActionButton>
          </CardActions>
        </EstimateCard>

        <EstimateCard status="accepted">
          <CardHeader>
            <CardTitle>鈴木様邸 剪定作業</CardTitle>
            <CardStatus status="accepted">受注</CardStatus>
          </CardHeader>
          <CardContent>
            <CardDetail>
              <span>金額:</span>
              <strong>¥180,000</strong>
            </CardDetail>
            <CardDetail>
              <span>開始予定:</span>
              <span>2024/01/20</span>
            </CardDetail>
          </CardContent>
          <CardActions>
            <ActionButton size="small">工程表</ActionButton>
            <ActionButton size="small" primary>
              開始
            </ActionButton>
          </CardActions>
        </EstimateCard>
      </CardList>
    </TabContainer>
  );
};

// 工程タブ
const ProcessTab = () => {
  const [processes, setProcesses] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <TabContainer>
      <DateSelector>
        <DateInput
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={e => setSelectedDate(new Date(e.target.value))}
        />
      </DateSelector>

      <TimelineContainer>
        <TimelineItem status="completed">
          <TimelineMarker status="completed">
            <CheckCircle size={16} />
          </TimelineMarker>
          <TimelineContent>
            <TimelineTitle>現場調査・測量</TimelineTitle>
            <TimelineDetail>田中様邸</TimelineDetail>
            <TimelineTime>9:00 - 10:30</TimelineTime>
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="in-progress">
          <TimelineMarker status="in-progress">
            <Clock size={16} />
          </TimelineMarker>
          <TimelineContent>
            <TimelineTitle>材料発注</TimelineTitle>
            <TimelineDetail>佐藤様邸</TimelineDetail>
            <TimelineTime>11:00 - 12:00</TimelineTime>
          </TimelineContent>
        </TimelineItem>

        <TimelineItem status="pending">
          <TimelineMarker status="pending">
            <Clock size={16} />
          </TimelineMarker>
          <TimelineContent>
            <TimelineTitle>植栽工事</TimelineTitle>
            <TimelineDetail>鈴木様邸</TimelineDetail>
            <TimelineTime>13:00 - 17:00</TimelineTime>
          </TimelineContent>
        </TimelineItem>
      </TimelineContainer>

      <ProgressSummary>
        <ProgressItem>
          <ProgressLabel>本日の進捗</ProgressLabel>
          <ProgressBar>
            <ProgressFill progress={65} />
          </ProgressBar>
          <ProgressText>65%</ProgressText>
        </ProgressItem>
      </ProgressSummary>
    </TabContainer>
  );
};

// 予算タブ
const BudgetTab = () => {
  const [budgetItems, setBudgetItems] = useState([]);
  const [showQuickEntry, setShowQuickEntry] = useState(false);

  return (
    <TabContainer>
      <BudgetSummary>
        <SummaryItem>
          <SummaryLabel>予算総額</SummaryLabel>
          <SummaryValue>¥2,100,000</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>使用額</SummaryLabel>
          <SummaryValue>¥1,450,000</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>残額</SummaryLabel>
          <SummaryValue positive>¥650,000</SummaryValue>
        </SummaryItem>
      </BudgetSummary>

      <QuickEntryButton onClick={() => setShowQuickEntry(true)}>
        <Plus size={16} />
        <span>仕入額を入力</span>
      </QuickEntryButton>

      <BudgetList>
        <BudgetItem>
          <BudgetItemHeader>
            <BudgetItemTitle>石材・砂利</BudgetItemTitle>
            <BudgetItemAmount>¥450,000</BudgetItemAmount>
          </BudgetItemHeader>
          <BudgetItemDetails>
            <BudgetDetail>
              <span>仕入:</span>
              <span>¥320,000</span>
            </BudgetDetail>
            <BudgetDetail>
              <span>利益:</span>
              <span positive>¥130,000</span>
            </BudgetDetail>
          </BudgetItemDetails>
        </BudgetItem>

        <BudgetItem>
          <BudgetItemHeader>
            <BudgetItemTitle>植栽材料</BudgetItemTitle>
            <BudgetItemAmount>¥380,000</BudgetItemAmount>
          </BudgetItemHeader>
          <BudgetItemDetails>
            <BudgetDetail>
              <span>仕入:</span>
              <span>¥280,000</span>
            </BudgetDetail>
            <BudgetDetail>
              <span>利益:</span>
              <span positive>¥100,000</span>
            </BudgetDetail>
          </BudgetItemDetails>
        </BudgetItem>
      </BudgetList>

      {showQuickEntry && <QuickEntryModal onClose={() => setShowQuickEntry(false)} />}
    </TabContainer>
  );
};

// 請求タブ
const InvoiceTab = () => {
  const [purchases, setPurchases] = useState([]);
  const [showScanner, setShowScanner] = useState(false);

  return (
    <TabContainer>
      <PurchaseHeader>
        <PurchaseTitle>仕入れ管理</PurchaseTitle>
        <ScannerButton onClick={() => setShowScanner(true)}>
          <Camera size={16} />
          <span>レシート撮影</span>
        </ScannerButton>
      </PurchaseHeader>

      <PurchaseList>
        <PurchaseItem>
          <PurchaseItemHeader>
            <PurchaseItemTitle>真砂土 10袋</PurchaseItemTitle>
            <PurchaseItemPrice>¥8,500</PurchaseItemPrice>
          </PurchaseItemHeader>
          <PurchaseItemDetails>
            <PurchaseDetail>
              <span>仕入先:</span>
              <span>グリーンセンター</span>
            </PurchaseDetail>
            <PurchaseDetail>
              <span>日時:</span>
              <span>2024/01/15 10:30</span>
            </PurchaseDetail>
          </PurchaseItemDetails>
        </PurchaseItem>

        <PurchaseItem>
          <PurchaseItemHeader>
            <PurchaseItemTitle>ツツジ 大 5本</PurchaseItemTitle>
            <PurchaseItemPrice>¥15,000</PurchaseItemPrice>
          </PurchaseItemHeader>
          <PurchaseItemDetails>
            <PurchaseDetail>
              <span>仕入先:</span>
              <span>山田園芸</span>
            </PurchaseDetail>
            <PurchaseDetail>
              <span>日時:</span>
              <span>2024/01/14 14:00</span>
            </PurchaseDetail>
          </PurchaseItemDetails>
        </PurchaseItem>
      </PurchaseList>

      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} />}
    </TabContainer>
  );
};

// モバイルメニュー
const MobileMenu = ({ onClose }) => {
  const menuItems = [
    { icon: FileText, label: '見積書一覧', path: '/estimates' },
    { icon: Calendar, label: '工程管理', path: '/schedule' },
    { icon: DollarSign, label: '予算管理', path: '/budget' },
    { icon: Package, label: '仕入管理', path: '/purchase' },
  ];

  return (
    <MenuOverlay onClick={onClose}>
      <MenuContainer onClick={e => e.stopPropagation()}>
        <MenuHeader>
          <MenuTitle>メニュー</MenuTitle>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </MenuHeader>
        <MenuList>
          {menuItems.map((item, index) => (
            <MenuItem
              key={index}
              onClick={() => {
                window.location.href = item.path;
              }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              <ChevronRight size={16} />
            </MenuItem>
          ))}
        </MenuList>
      </MenuContainer>
    </MenuOverlay>
  );
};

// カメラモーダル
const CameraModal = ({ stream, onClose, onCapture }) => {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg');
    onCapture(imageData);
  };

  return (
    <CameraOverlay>
      <CameraContainer>
        <CameraHeader>
          <CameraTitle>写真撮影</CameraTitle>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </CameraHeader>
        <CameraView>
          <video ref={videoRef} autoPlay playsInline />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </CameraView>
        <CameraControls>
          <CaptureButton onClick={capturePhoto}>
            <Camera size={24} />
          </CaptureButton>
        </CameraControls>
      </CameraContainer>
    </CameraOverlay>
  );
};

// クイック入力モーダル
const QuickEntryModal = ({ onClose }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    // 仕入額を記録
    console.log('仕入額記録:', { amount, description });
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>仕入額入力</ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>金額</Label>
            <AmountInput
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>内容</Label>
            <TextInput
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="仕入れ内容を入力"
              required
            />
          </FormGroup>
          <ModalActions>
            <ModalButton type="button" onClick={onClose}>
              キャンセル
            </ModalButton>
            <ModalButton type="submit" primary>
              記録
            </ModalButton>
          </ModalActions>
        </form>
      </ModalContainer>
    </ModalOverlay>
  );
};

// レシートスキャナー
const ReceiptScanner = ({ onClose }) => {
  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>レシート撮影</ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        <ScannerContent>
          <ScannerInstruction>
            レシートを撮影すると、自動的に仕入れ情報を読み取ります
          </ScannerInstruction>
          <ScannerButton onClick={onClose}>
            <Camera size={24} />
            <span>撮影開始</span>
          </ScannerButton>
        </ScannerContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

// スタイル定義
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${COLORS.gray[50]};
  overflow: hidden;
  ${MOBILE_STYLES.safeArea}
`;

const MobileHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${SPACING.md} ${SPACING.base};
  padding-top: max(${SPACING.md}, env(safe-area-inset-top));
  background: ${COLORS.primary};
  color: ${COLORS.white};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: ${Z_INDEX.sticky};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.white};
  padding: ${SPACING.sm};
  min-width: ${TOUCH_SIZES.small};
  min-height: ${TOUCH_SIZES.small};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  ${MOBILE_STYLES.touchOptimized}
`;

const HeaderTitle = styled.h1`
  font-size: ${FONT_SIZES.md};
  font-weight: 600;
  margin: 0;
  ${MOBILE_STYLES.preventZoom}
`;

const LocationButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: ${COLORS.white};
  min-width: ${TOUCH_SIZES.small};
  min-height: ${TOUCH_SIZES.small};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  ${MOBILE_STYLES.touchOptimized}

  &:active {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const CameraButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: ${COLORS.white};
  min-width: ${TOUCH_SIZES.small};
  min-height: ${TOUCH_SIZES.small};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  ${MOBILE_STYLES.touchOptimized}

  &:active {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const QuickActionBar = styled.div`
  display: flex;
  padding: ${SPACING.md} ${SPACING.base};
  gap: ${SPACING.sm};
  background: ${COLORS.white};
  border-bottom: 1px solid ${COLORS.gray[200]};
  overflow-x: auto;
  ${MOBILE_STYLES.smoothScroll}

  /* スクロールバーを隠す */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const QuickActionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${SPACING.xs};
  padding: ${SPACING.sm} ${SPACING.md};
  min-height: ${TOUCH_SIZES.medium};
  min-width: 80px;
  background: ${props => {
    if (props.priority === 'high') return '#dbeafe';
    if (props.priority === 'emergency') return '#fee2e2';
    return COLORS.gray[100];
  }};
  color: ${props => {
    if (props.priority === 'high') return '#1e40af';
    if (props.priority === 'emergency') return COLORS.error;
    return COLORS.gray[700];
  }};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: ${FONT_SIZES.sm};
  flex-shrink: 0;
  ${MOBILE_STYLES.touchOptimized}

  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }

  span {
    white-space: nowrap;
  }
`;

const TabNavigation = styled.nav`
  display: flex;
  background: white;
  border-bottom: 1px solid #e5e7eb;
`;

const TabButton = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${SPACING.xs};
  padding: ${SPACING.md} ${SPACING.sm};
  min-height: ${TOUCH_SIZES.medium};
  background: none;
  border: none;
  border-bottom: 2px solid ${props => (props.active ? COLORS.primary : 'transparent')};
  color: ${props => (props.active ? COLORS.primary : COLORS.gray[500])};
  cursor: pointer;
  font-size: ${FONT_SIZES.sm};
  font-weight: 500;
  ${MOBILE_STYLES.touchOptimized}

  &:active {
    background: ${COLORS.gray[50]};
  }

  span {
    white-space: nowrap;
  }
`;

const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`;

const TabContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SearchBar = styled.div`
  display: flex;
  gap: 8px;
`;

const SearchInput = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: ${SPACING.sm};
  background: ${COLORS.white};
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 8px;
  padding: ${SPACING.sm} ${SPACING.md};
  min-height: ${TOUCH_SIZES.medium};

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: ${FONT_SIZES.base};
    ${MOBILE_STYLES.preventZoom}

    &::placeholder {
      color: ${COLORS.gray[400]};
    }
  }
`;

const FilterButton = styled.button`
  background: ${COLORS.white};
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 8px;
  min-width: ${TOUCH_SIZES.medium};
  min-height: ${TOUCH_SIZES.medium};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  ${MOBILE_STYLES.touchOptimized}

  &:active {
    background: ${COLORS.gray[50]};
  }
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const EstimateCard = styled.div`
  background: ${COLORS.white};
  border-radius: 12px;
  padding: ${SPACING.base};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  ${MOBILE_STYLES.touchOptimized}

  &:active {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const CardTitle = styled.h3`
  font-size: ${FONT_SIZES.base};
  font-weight: 600;
  color: ${COLORS.gray[800]};
  margin: 0;
  ${MOBILE_STYLES.preventZoom}
`;

const CardStatus = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;

  ${props => {
    switch (props.status) {
      case 'draft':
        return 'background: #fef3c7; color: #92400e;';
      case 'sent':
        return 'background: #dbeafe; color: #1e40af;';
      case 'accepted':
        return 'background: #d1fae5; color: #065f46;';
      default:
        return 'background: #f3f4f6; color: #374151;';
    }
  }}
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
`;

const CardDetail = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #6b7280;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: ${props =>
    props.size === 'small' ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.md} ${SPACING.base}`};
  min-height: ${props => (props.size === 'small' ? TOUCH_SIZES.small : TOUCH_SIZES.medium)};
  background: ${props => (props.primary ? COLORS.primary : COLORS.gray[100])};
  color: ${props => (props.primary ? COLORS.white : COLORS.gray[700])};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: ${FONT_SIZES.sm};
  font-weight: 500;
  ${MOBILE_STYLES.touchOptimized}
  ${MOBILE_STYLES.buttonOptimized}
  
  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
`;

const DateSelector = styled.div`
  margin-bottom: 16px;
`;

const DateInput = styled.input`
  width: 100%;
  ${MOBILE_STYLES.inputOptimized}
  border: 1px solid ${COLORS.gray[300]};

  &:focus {
    outline: none;
    border-color: ${COLORS.primary};
    box-shadow: 0 0 0 2px ${COLORS.primary}20;
  }
`;

const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TimelineItem = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const TimelineMarker = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  ${props => {
    switch (props.status) {
      case 'completed':
        return 'background: #10b981; color: white;';
      case 'in-progress':
        return 'background: #f59e0b; color: white;';
      default:
        return 'background: #e5e7eb; color: #6b7280;';
    }
  }}
`;

const TimelineContent = styled.div`
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TimelineTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
`;

const TimelineDetail = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
`;

const TimelineTime = styled.div`
  font-size: 12px;
  color: #9ca3af;
`;

const ProgressSummary = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const ProgressItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ProgressLabel = styled.span`
  font-size: 14px;
  color: #374151;
  white-space: nowrap;
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #3b82f6;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const ProgressText = styled.span`
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
`;

const BudgetSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`;

const SummaryItem = styled.div`
  background: white;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const SummaryLabel = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
`;

const SummaryValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => (props.positive ? '#10b981' : '#1f2937')};
`;

const QuickEntryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;

  &:hover {
    background: #2563eb;
  }
`;

const BudgetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const BudgetItem = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const BudgetItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const BudgetItemTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const BudgetItemAmount = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #3b82f6;
`;

const BudgetItemDetails = styled.div`
  display: flex;
  justify-content: space-between;
`;

const BudgetDetail = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #6b7280;

  span:last-child {
    color: ${props => (props.positive ? '#10b981' : '#1f2937')};
    font-weight: 500;
  }
`;

const PurchaseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const PurchaseTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const ScannerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;

  &:hover {
    background: #059669;
  }
`;

const PurchaseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PurchaseItem = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const PurchaseItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const PurchaseItemTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const PurchaseItemPrice = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #ef4444;
`;

const PurchaseItemDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PurchaseDetail = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #6b7280;
`;

const FloatingActionButton = styled.button`
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom));
  right: ${SPACING.lg};
  width: ${TOUCH_SIZES.large};
  height: ${TOUCH_SIZES.large};
  border-radius: 50%;
  background: ${COLORS.primary};
  color: ${COLORS.white};
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.fixed};
  ${MOBILE_STYLES.touchOptimized}

  &:active {
    background: ${COLORS.primaryDark};
    transform: scale(0.95);
  }
`;

const MenuOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: ${Z_INDEX.modalBackdrop};
  ${MOBILE_STYLES.touchOptimized}
`;

const MenuContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100vh;
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
`;

const MenuHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
`;

const MenuTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
`;

const MenuList = styled.div`
  padding: 16px;
`;

const MenuItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.md};
  padding: ${SPACING.base};
  min-height: ${TOUCH_SIZES.medium};
  border-radius: 8px;
  cursor: pointer;
  ${MOBILE_STYLES.touchOptimized}

  &:active {
    background: ${COLORS.gray[100]};
  }

  span {
    flex: 1;
    font-size: ${FONT_SIZES.base};
    color: ${COLORS.gray[700]};
  }
`;

const CameraOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: black;
  z-index: 1000;
`;

const CameraContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const CameraHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
`;

const CameraTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const CameraView = styled.div`
  flex: 1;
  position: relative;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CameraControls = styled.div`
  display: flex;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.8);
`;

const CaptureButton = styled.button`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #f3f4f6;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const FormGroup = styled.div`
  padding: 0 16px;
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
`;

const AmountInput = styled.input`
  width: 100%;
  padding: ${SPACING.base};
  border: 2px solid ${COLORS.gray[300]};
  border-radius: 8px;
  font-size: ${FONT_SIZES.xl};
  font-weight: 600;
  text-align: center;
  color: ${COLORS.gray[800]};
  min-height: ${TOUCH_SIZES.large};
  ${MOBILE_STYLES.preventZoom}

  &:focus {
    outline: none;
    border-color: ${COLORS.primary};
    box-shadow: 0 0 0 3px ${COLORS.primary}20;
  }
`;

const TextInput = styled.input`
  width: 100%;
  ${MOBILE_STYLES.inputOptimized}
  border: 1px solid ${COLORS.gray[300]};

  &:focus {
    outline: none;
    border-color: ${COLORS.primary};
    box-shadow: 0 0 0 2px ${COLORS.primary}20;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
`;

const ModalButton = styled.button`
  flex: 1;
  ${MOBILE_STYLES.buttonOptimized}
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;

  ${props =>
    props.primary
      ? `
    background: ${COLORS.primary};
    color: ${COLORS.white};
  `
      : `
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
  `}

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
`;

const ScannerContent = styled.div`
  padding: 20px;
  text-align: center;
`;

const ScannerInstruction = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 20px;
`;

export default MobileWorkflow;
