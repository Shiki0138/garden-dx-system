/**
 * プロジェクト管理システム
 * 造園事業者向けプロジェクト管理・ガントチャート機能
 * モバイル対応のレスポンシブデザイン
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Search,
  Eye,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Square,
  Download,
  Upload,
  RefreshCw,
  FileText,
  Zap,
  X,
  Minus,
} from 'lucide-react';

// 造園業界標準カラーパレット
const colors = {
  primary: '#1a472a',
  secondary: '#2d5a3d',
  accent: '#4a7c3c',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0284c7',
  background: '#fafafa',
  surface: '#ffffff',
  border: '#e5e7eb',
  text: '#1f2937',
  textLight: '#6b7280',
  textWhite: '#ffffff',
  hover: '#f3f4f6',
  selected: '#ecfdf5',
  disabled: '#9ca3af',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// プロジェクトステータス定義
const PROJECT_STATUSES = {
  planning: { label: '計画中', color: colors.info, icon: FileText },
  active: { label: '進行中', color: colors.success, icon: Play },
  paused: { label: '一時停止', color: colors.warning, icon: Pause },
  completed: { label: '完了', color: colors.success, icon: CheckCircle },
  cancelled: { label: 'キャンセル', color: colors.error, icon: Square },
  on_hold: { label: '保留', color: colors.disabled, icon: Clock },
};

// プロジェクト優先度定義
const PROJECT_PRIORITIES = {
  low: { label: '低', color: colors.textLight, icon: ChevronDown },
  medium: { label: '中', color: colors.warning, icon: Minus },
  high: { label: '高', color: colors.error, icon: ChevronUp },
  urgent: { label: '緊急', color: colors.error, icon: Zap },
};

// メインコンテナ
const Container = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
  background: ${colors.background};
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 10px;
  }
`;

// ヘッダーセクション
const Header = styled.div`
  background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
  color: ${colors.textWhite};
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  box-shadow: 0 4px 20px rgba(26, 71, 42, 0.15);

  @media (max-width: 768px) {
    padding: 20px;
    margin-bottom: 20px;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;

  &::before {
    content: '🌿';
    font-size: 1.5rem;
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

// ツールバー
const Toolbar = styled.div`
  background: ${colors.surface};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid ${colors.border};

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const ToolbarTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ToolbarFilters = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const SearchInput = styled.div`
  position: relative;
  min-width: 300px;

  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const SearchField = styled.input`
  width: 100%;
  padding: 12px 45px 12px 15px;
  border: 2px solid ${colors.border};
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: ${colors.surface};

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(26, 71, 42, 0.1);
  }

  &::placeholder {
    color: ${colors.textLight};
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${colors.textLight};
  width: 20px;
  height: 20px;
`;

const FilterSelect = styled.select`
  padding: 12px 15px;
  border: 2px solid ${colors.border};
  border-radius: 8px;
  font-size: 16px;
  background: ${colors.surface};
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 150px;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(26, 71, 42, 0.1);
  }

  @media (max-width: 768px) {
    min-width: 120px;
  }
`;

const ViewToggle = styled.div`
  display: flex;
  background: ${colors.background};
  border-radius: 8px;
  padding: 4px;
  border: 1px solid ${colors.border};
`;

const ViewButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: ${props => (props.active ? colors.primary : 'transparent')};
  color: ${props => (props.active ? colors.textWhite : colors.text)};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;

  &:hover {
    background: ${props => (props.active ? colors.secondary : colors.hover)};
  }

  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 12px;
  }
`;

const ActionButton = styled.button`
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;

  ${props =>
    props.variant === 'primary' &&
    `
    background: ${colors.primary};
    color: ${colors.textWhite};
    
    &:hover {
      background: ${colors.secondary};
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);
    }
  `}

  ${props =>
    props.variant === 'secondary' &&
    `
    background: ${colors.surface};
    color: ${colors.primary};
    border: 2px solid ${colors.primary};
    
    &:hover {
      background: ${colors.primary};
      color: ${colors.textWhite};
    }
  `}

  ${props =>
    props.variant === 'danger' &&
    `
    background: ${colors.error};
    color: ${colors.textWhite};
    
    &:hover {
      background: #b91c1c;
      transform: translateY(-2px);
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 14px;
  }
`;

// 統計情報セクション
const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 25px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
  }
`;

const StatCard = styled.div`
  background: ${colors.surface};
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border-left: 4px solid ${props => props.color || colors.primary};
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.color || colors.primary};
  margin-bottom: 5px;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${colors.textLight};
  font-weight: 500;
`;

// プロジェクト一覧セクション
const ProjectsSection = styled.div`
  background: ${colors.surface};
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid ${colors.border};

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const ProjectsGrid = styled.div`
  display: grid;
  gap: 20px;

  @media (max-width: 768px) {
    gap: 15px;
  }
`;

const ProjectCard = styled.div`
  background: ${colors.surface};
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid ${colors.border};
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const ProjectHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  gap: 15px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const ProjectInfo = styled.div`
  flex: 1;
`;

const ProjectTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${colors.text};
  margin: 0 0 8px 0;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const ProjectMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${colors.textLight};
  font-size: 0.9rem;

  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const StatusBadge = styled.div`
  background: ${props => props.color || colors.primary};
  color: ${colors.textWhite};
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  width: fit-content;

  @media (max-width: 768px) {
    padding: 4px 8px;
    font-size: 0.8rem;
  }
`;

const PriorityBadge = styled.div`
  background: rgba(${props => props.color || colors.primary}, 0.1);
  color: ${props => props.color || colors.primary};
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
`;

const ProjectActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const ActionIcon = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: ${props => props.color || colors.primary};
  color: ${colors.textWhite};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
  }
`;

// ガントチャートセクション
const GanttSection = styled.div`
  background: ${colors.surface};
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid ${colors.border};
  overflow-x: auto;

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const GanttHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const GanttTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const GanttControls = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const GanttChart = styled.div`
  min-width: 800px;
  background: ${colors.background};
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;

  @media (max-width: 768px) {
    min-width: 600px;
    padding: 15px;
  }
`;

const GanttTimeline = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 150px 1fr;
    gap: 15px;
  }
`;

const GanttProjectList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const GanttProjectItem = styled.div`
  background: ${colors.surface};
  padding: 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: ${colors.text};
  border: 1px solid ${colors.border};

  @media (max-width: 768px) {
    padding: 8px;
    font-size: 0.8rem;
  }
`;

const GanttTimeColumn = styled.div`
  background: ${colors.background};
  border: 1px solid ${colors.border};
  padding: 8px 4px;
  text-align: center;
  font-size: 0.8rem;
  color: ${colors.textLight};

  @media (max-width: 768px) {
    padding: 6px 2px;
    font-size: 0.7rem;
  }
`;

const GanttBar = styled.div`
  background: ${props => props.color || colors.primary};
  height: 20px;
  border-radius: 10px;
  margin: 2px 0;
  position: relative;
  opacity: 0.8;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
  }

  @media (max-width: 768px) {
    height: 16px;
  }
`;

// プロジェクト作成・編集モーダル
const Modal = styled.div`
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

const ModalContent = styled.div`
  background: ${colors.surface};
  border-radius: 12px;
  padding: 30px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);

  @media (max-width: 768px) {
    padding: 20px;
    max-height: 95vh;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid ${colors.border};
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${colors.text};
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const FormLabel = styled.label`
  display: block;
  font-weight: 600;
  color: ${colors.text};
  margin-bottom: 8px;
  font-size: 0.9rem;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 12px 15px;
  border: 2px solid ${colors.border};
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: ${colors.surface};

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(26, 71, 42, 0.1);
  }

  &::placeholder {
    color: ${colors.textLight};
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  padding: 12px 15px;
  border: 2px solid ${colors.border};
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: ${colors.surface};
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(26, 71, 42, 0.1);
  }

  &::placeholder {
    color: ${colors.textLight};
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 12px 15px;
  border: 2px solid ${colors.border};
  border-radius: 8px;
  font-size: 16px;
  background: ${colors.surface};
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(26, 71, 42, 0.1);
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 15px;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid ${colors.border};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;

/**
 * プロジェクト管理メインコンポーネント
 */
const ProjectManagement = () => {
  // ステート管理
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // list, gantt
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    startDate: '',
    endDate: '',
    budget: '',
    client: '',
    location: '',
    assignedTo: '',
    tags: '',
    notes: '',
  });

  // サンプルデータ
  const sampleProjects = useMemo(
    () => [
      {
        id: 1,
        name: '田中邸庭園リニューアル',
        description: '既存庭園の全面リニューアル、植栽・石積み・水回り工事',
        status: 'active',
        priority: 'high',
        startDate: '2024-07-01',
        endDate: '2024-08-15',
        budget: 2500000,
        client: '田中太郎',
        location: '東京都世田谷区',
        assignedTo: '山田花子',
        tags: '庭園,リニューアル,植栽',
        notes: '高級住宅街の案件、品質重視',
        progress: 65,
        createdAt: '2024-06-01',
        updatedAt: '2024-07-01',
      },
      {
        id: 2,
        name: '佐藤商事ビル外構工事',
        description: 'オフィスビル敷地の外構整備、駐車場・植栽・照明工事',
        status: 'planning',
        priority: 'medium',
        startDate: '2024-08-01',
        endDate: '2024-09-30',
        budget: 4800000,
        client: '佐藤商事株式会社',
        location: '神奈川県横浜市',
        assignedTo: '鈴木一郎',
        tags: '外構,商業施設,照明',
        notes: '大型案件、工期厳守',
        progress: 15,
        createdAt: '2024-06-15',
        updatedAt: '2024-07-05',
      },
      {
        id: 3,
        name: '公園リニューアル設計',
        description: '市民公園のリニューアル設計・監理業務',
        status: 'active',
        priority: 'urgent',
        startDate: '2024-07-15',
        endDate: '2024-12-31',
        budget: 12000000,
        client: '○○市役所',
        location: '埼玉県○○市',
        assignedTo: '田中次郎',
        tags: '公園,設計,監理',
        notes: '公共事業、地域への配慮必要',
        progress: 40,
        createdAt: '2024-05-20',
        updatedAt: '2024-07-10',
      },
      {
        id: 4,
        name: '山田邸新築外構',
        description: '新築住宅の外構工事、門柱・フェンス・駐車場・植栽',
        status: 'paused',
        priority: 'low',
        startDate: '2024-08-15',
        endDate: '2024-10-01',
        budget: 1800000,
        client: '山田花子',
        location: '千葉県柏市',
        assignedTo: '高橋三郎',
        tags: '新築,外構,住宅',
        notes: '施主都合により一時停止',
        progress: 30,
        createdAt: '2024-06-10',
        updatedAt: '2024-07-20',
      },
      {
        id: 5,
        name: '鈴木邸維持管理',
        description: '年間植栽メンテナンス契約、剪定・施肥・病害虫防除',
        status: 'completed',
        priority: 'low',
        startDate: '2024-04-01',
        endDate: '2024-06-30',
        budget: 350000,
        client: '鈴木一郎',
        location: '東京都杉並区',
        assignedTo: '伊藤五郎',
        tags: '維持管理,植栽,メンテナンス',
        notes: '年間契約、定期メンテナンス',
        progress: 100,
        createdAt: '2024-03-15',
        updatedAt: '2024-06-30',
      },
    ],
    []
  );

  // 初期データ読み込み
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setProjects(sampleProjects);
      setFilteredProjects(sampleProjects);
      setLoading(false);
    }, 500);
  }, [sampleProjects]);

  // フィルタリング・検索処理
  useEffect(() => {
    let filtered = [...projects];

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(
        project =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // 優先度フィルター
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(project => project.priority === priorityFilter);
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter, priorityFilter]);

  // 統計情報計算
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const paused = projects.filter(p => p.status === 'paused').length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const avgProgress =
      projects.length > 0
        ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
        : 0;

    return {
      total,
      active,
      completed,
      paused,
      totalBudget,
      avgProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [projects]);

  // イベントハンドラー
  const handleSearch = useCallback(event => {
    setSearchTerm(event.target.value);
  }, []);

  const handleStatusFilter = useCallback(event => {
    setStatusFilter(event.target.value);
  }, []);

  const handlePriorityFilter = useCallback(event => {
    setPriorityFilter(event.target.value);
  }, []);

  const handleViewMode = useCallback(mode => {
    setViewMode(mode);
  }, []);

  const handleNewProject = useCallback(() => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      startDate: '',
      endDate: '',
      budget: '',
      client: '',
      location: '',
      assignedTo: '',
      tags: '',
      notes: '',
    });
    setShowModal(true);
  }, []);

  const handleEditProject = useCallback(project => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget.toString(),
      client: project.client,
      location: project.location,
      assignedTo: project.assignedTo,
      tags: project.tags,
      notes: project.notes,
    });
    setShowModal(true);
  }, []);

  const handleDeleteProject = useCallback(projectId => {
    // eslint-disable-next-line no-alert
    if (window.confirm('このプロジェクトを削除してもよろしいですか？')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  }, []);

  const handleFormSubmit = useCallback(
    event => {
      event.preventDefault();

      if (editingProject) {
        // 編集
        setProjects(prev =>
          prev.map(p =>
            p.id === editingProject.id
              ? {
                  ...p,
                  ...formData,
                  budget: parseInt(formData.budget, 10) || 0,
                  updatedAt: new Date().toISOString().split('T')[0],
                }
              : p
          )
        );
      } else {
        // 新規作成
        const newProject = {
          id: Date.now(),
          ...formData,
          budget: parseInt(formData.budget, 10) || 0,
          progress: 0,
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
        };
        setProjects(prev => [...prev, newProject]);
      }

      setShowModal(false);
      setEditingProject(null);
    },
    [formData, editingProject]
  );

  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleMonthChange = useCallback(
    direction => {
      if (direction === 'prev') {
        if (selectedMonth === 0) {
          setSelectedMonth(11);
          setSelectedYear(prev => prev - 1);
        } else {
          setSelectedMonth(prev => prev - 1);
        }
      } else {
        if (selectedMonth === 11) {
          setSelectedMonth(0);
          setSelectedYear(prev => prev + 1);
        } else {
          setSelectedMonth(prev => prev + 1);
        }
      }
    },
    [selectedMonth]
  );

  // ユーティリティ関数
  const formatCurrency = amount => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusInfo = status => {
    return PROJECT_STATUSES[status] || PROJECT_STATUSES.planning;
  };

  const getPriorityInfo = priority => {
    return PROJECT_PRIORITIES[priority] || PROJECT_PRIORITIES.medium;
  };

  const getMonthName = month => {
    const months = [
      '1月',
      '2月',
      '3月',
      '4月',
      '5月',
      '6月',
      '7月',
      '8月',
      '9月',
      '10月',
      '11月',
      '12月',
    ];
    return months[month];
  };

  const getProjectsForGantt = () => {
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);

    return filteredProjects.filter(project => {
      const projectStart = new Date(project.startDate);
      const projectEnd = new Date(project.endDate);
      return projectStart <= endDate && projectEnd >= startDate;
    });
  };

  const generateTimeColumns = () => {
    const columns = [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      columns.push(i);
    }

    return columns;
  };

  const getGanttBarStyle = project => {
    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

    const startDay = Math.max(1, projectStart.getDate());
    const endDay = Math.min(monthEnd.getDate(), projectEnd.getDate());

    return {
      gridColumn: `${startDay} / ${endDay + 1}`,
      backgroundColor: getStatusInfo(project.status).color,
    };
  };

  return (
    <Container>
      {/* ヘッダー */}
      <Header>
        <HeaderContent>
          <HeaderTitle>プロジェクト管理</HeaderTitle>
          <HeaderActions>
            <ActionButton variant="primary" onClick={handleNewProject}>
              <Plus size={18} />
              新規プロジェクト
            </ActionButton>
            <ActionButton variant="secondary">
              <Upload size={18} />
              インポート
            </ActionButton>
            <ActionButton variant="secondary">
              <Download size={18} />
              エクスポート
            </ActionButton>
          </HeaderActions>
        </HeaderContent>
      </Header>

      {/* 統計情報 */}
      <StatsSection>
        <StatCard color={colors.primary}>
          <StatValue color={colors.primary}>{stats.total}</StatValue>
          <StatLabel>総プロジェクト</StatLabel>
        </StatCard>
        <StatCard color={colors.success}>
          <StatValue color={colors.success}>{stats.active}</StatValue>
          <StatLabel>進行中</StatLabel>
        </StatCard>
        <StatCard color={colors.warning}>
          <StatValue color={colors.warning}>{stats.paused}</StatValue>
          <StatLabel>一時停止</StatLabel>
        </StatCard>
        <StatCard color={colors.info}>
          <StatValue color={colors.info}>{stats.completed}</StatValue>
          <StatLabel>完了</StatLabel>
        </StatCard>
        <StatCard color={colors.accent}>
          <StatValue color={colors.accent}>{stats.avgProgress}%</StatValue>
          <StatLabel>平均進捗</StatLabel>
        </StatCard>
        <StatCard color={colors.secondary}>
          <StatValue color={colors.secondary}>{formatCurrency(stats.totalBudget)}</StatValue>
          <StatLabel>総予算</StatLabel>
        </StatCard>
      </StatsSection>

      {/* ツールバー */}
      <Toolbar>
        <ToolbarTop>
          <ToolbarFilters>
            <SearchInput>
              <SearchField
                type="text"
                placeholder="プロジェクト名・顧客名・場所で検索..."
                value={searchTerm}
                onChange={handleSearch}
              />
              <SearchIcon />
            </SearchInput>

            <FilterSelect value={statusFilter} onChange={handleStatusFilter}>
              <option value="all">全ステータス</option>
              {Object.entries(PROJECT_STATUSES).map(([key, status]) => (
                <option key={key} value={key}>
                  {status.label}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect value={priorityFilter} onChange={handlePriorityFilter}>
              <option value="all">全優先度</option>
              {Object.entries(PROJECT_PRIORITIES).map(([key, priority]) => (
                <option key={key} value={key}>
                  {priority.label}
                </option>
              ))}
            </FilterSelect>
          </ToolbarFilters>

          <ViewToggle>
            <ViewButton active={viewMode === 'list'} onClick={() => handleViewMode('list')}>
              <BarChart3 size={16} />
              リスト
            </ViewButton>
            <ViewButton active={viewMode === 'gantt'} onClick={() => handleViewMode('gantt')}>
              <Calendar size={16} />
              ガント
            </ViewButton>
          </ViewToggle>
        </ToolbarTop>
      </Toolbar>

      {/* メインコンテンツ */}
      {viewMode === 'list' ? (
        <ProjectsSection>
          <ProjectsGrid>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <RefreshCw
                  size={48}
                  color={colors.primary}
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                <p style={{ marginTop: '20px', color: colors.textLight }}>読み込み中...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <AlertCircle size={48} color={colors.textLight} />
                <p style={{ marginTop: '20px', color: colors.textLight }}>
                  条件に該当するプロジェクトが見つかりません
                </p>
              </div>
            ) : (
              filteredProjects.map(project => {
                const statusInfo = getStatusInfo(project.status);
                const priorityInfo = getPriorityInfo(project.priority);
                const StatusIcon = statusInfo.icon;
                const PriorityIcon = priorityInfo.icon;

                return (
                  <ProjectCard key={project.id}>
                    <ProjectHeader>
                      <ProjectInfo>
                        <ProjectTitle>{project.name}</ProjectTitle>
                        <ProjectMeta>
                          <MetaItem>
                            <Users size={16} />
                            {project.client}
                          </MetaItem>
                          <MetaItem>
                            <MapPin size={16} />
                            {project.location}
                          </MetaItem>
                          <MetaItem>
                            <Calendar size={16} />
                            {formatDate(project.startDate)} - {formatDate(project.endDate)}
                          </MetaItem>
                          <MetaItem>
                            <DollarSign size={16} />
                            {formatCurrency(project.budget)}
                          </MetaItem>
                        </ProjectMeta>
                        <div
                          style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            marginTop: '10px',
                          }}
                        >
                          <StatusBadge color={statusInfo.color}>
                            <StatusIcon size={14} />
                            {statusInfo.label}
                          </StatusBadge>
                          <PriorityBadge color={priorityInfo.color}>
                            <PriorityIcon size={12} />
                            {priorityInfo.label}
                          </PriorityBadge>
                        </div>
                      </ProjectInfo>
                      <ProjectActions>
                        <ActionIcon
                          color={colors.info}
                          onClick={() => {
                            // eslint-disable-next-line no-console
                            console.log('詳細表示', project.id);
                          }}
                          title="詳細表示"
                        >
                          <Eye size={14} />
                        </ActionIcon>
                        <ActionIcon
                          color={colors.accent}
                          onClick={() => handleEditProject(project)}
                          title="編集"
                        >
                          <Edit size={14} />
                        </ActionIcon>
                        <ActionIcon
                          color={colors.error}
                          onClick={() => handleDeleteProject(project.id)}
                          title="削除"
                        >
                          <Trash2 size={14} />
                        </ActionIcon>
                      </ProjectActions>
                    </ProjectHeader>
                    <div style={{ marginTop: '15px', color: colors.text }}>
                      {project.description}
                    </div>
                    <div
                      style={{
                        marginTop: '15px',
                        background: colors.background,
                        padding: '10px',
                        borderRadius: '6px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', color: colors.textLight }}>
                          進捗: {project.progress}%
                        </span>
                        <span style={{ fontSize: '0.9rem', color: colors.textLight }}>
                          担当: {project.assignedTo}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          background: colors.border,
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${project.progress}%`,
                            height: '100%',
                            background: statusInfo.color,
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  </ProjectCard>
                );
              })
            )}
          </ProjectsGrid>
        </ProjectsSection>
      ) : (
        <GanttSection>
          <GanttHeader>
            <GanttTitle>
              <BarChart3 size={20} />
              ガントチャート
            </GanttTitle>
            <GanttControls>
              <ActionButton variant="secondary" onClick={() => handleMonthChange('prev')}>
                <ChevronLeft size={16} />
              </ActionButton>
              <span
                style={{
                  padding: '0 20px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: colors.text,
                }}
              >
                {selectedYear}年 {getMonthName(selectedMonth)}
              </span>
              <ActionButton variant="secondary" onClick={() => handleMonthChange('next')}>
                <ChevronRight size={16} />
              </ActionButton>
            </GanttControls>
          </GanttHeader>

          <GanttChart>
            <GanttTimeline>
              <div style={{ color: colors.text, fontWeight: '600' }}>プロジェクト</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${generateTimeColumns().length}, 1fr)`,
                  gap: '2px',
                }}
              >
                {generateTimeColumns().map(day => (
                  <GanttTimeColumn key={day}>{day}</GanttTimeColumn>
                ))}
              </div>
            </GanttTimeline>

            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px' }}>
              <GanttProjectList>
                {getProjectsForGantt().map(project => (
                  <GanttProjectItem key={project.id}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '4px' }}>
                      {project.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: colors.textLight }}>
                      {project.client}
                    </div>
                  </GanttProjectItem>
                ))}
              </GanttProjectList>

              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${generateTimeColumns().length}, 1fr)`,
                    gap: '2px',
                    height: '100%',
                  }}
                >
                  {generateTimeColumns().map(day => (
                    <div
                      key={day}
                      style={{
                        borderLeft: `1px solid ${colors.border}`,
                        minHeight: `${getProjectsForGantt().length * 60}px`,
                      }}
                    />
                  ))}
                </div>

                {getProjectsForGantt().map((project, index) => (
                  <div
                    key={project.id}
                    style={{
                      position: 'absolute',
                      top: `${index * 60 + 15}px`,
                      left: '0',
                      right: '0',
                      height: '30px',
                      display: 'grid',
                      gridTemplateColumns: `repeat(${generateTimeColumns().length}, 1fr)`,
                      gap: '2px',
                    }}
                  >
                    <GanttBar
                      color={getStatusInfo(project.status).color}
                      style={getGanttBarStyle(project)}
                      title={`${project.name} (${project.progress}%)`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </GanttChart>
        </GanttSection>
      )}

      {/* プロジェクト作成・編集モーダル */}
      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                {editingProject ? 'プロジェクト編集' : '新規プロジェクト作成'}
              </ModalTitle>
              <ActionIcon color={colors.textLight} onClick={() => setShowModal(false)}>
                <X size={20} />
              </ActionIcon>
            </ModalHeader>

            <form onSubmit={handleFormSubmit}>
              <FormGroup>
                <FormLabel>プロジェクト名 *</FormLabel>
                <FormInput
                  type="text"
                  value={formData.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                  required
                  placeholder="プロジェクト名を入力"
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>説明</FormLabel>
                <FormTextarea
                  value={formData.description}
                  onChange={e => handleFormChange('description', e.target.value)}
                  placeholder="プロジェクトの詳細説明を入力"
                />
              </FormGroup>

              <FormRow>
                <FormGroup>
                  <FormLabel>ステータス</FormLabel>
                  <FormSelect
                    value={formData.status}
                    onChange={e => handleFormChange('status', e.target.value)}
                  >
                    {Object.entries(PROJECT_STATUSES).map(([key, status]) => (
                      <option key={key} value={key}>
                        {status.label}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>

                <FormGroup>
                  <FormLabel>優先度</FormLabel>
                  <FormSelect
                    value={formData.priority}
                    onChange={e => handleFormChange('priority', e.target.value)}
                  >
                    {Object.entries(PROJECT_PRIORITIES).map(([key, priority]) => (
                      <option key={key} value={key}>
                        {priority.label}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>
              </FormRow>

              <FormRow>
                <FormGroup>
                  <FormLabel>開始日</FormLabel>
                  <FormInput
                    type="date"
                    value={formData.startDate}
                    onChange={e => handleFormChange('startDate', e.target.value)}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>終了日</FormLabel>
                  <FormInput
                    type="date"
                    value={formData.endDate}
                    onChange={e => handleFormChange('endDate', e.target.value)}
                  />
                </FormGroup>
              </FormRow>

              <FormRow>
                <FormGroup>
                  <FormLabel>予算</FormLabel>
                  <FormInput
                    type="number"
                    value={formData.budget}
                    onChange={e => handleFormChange('budget', e.target.value)}
                    placeholder="予算を入力"
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>顧客</FormLabel>
                  <FormInput
                    type="text"
                    value={formData.client}
                    onChange={e => handleFormChange('client', e.target.value)}
                    placeholder="顧客名を入力"
                  />
                </FormGroup>
              </FormRow>

              <FormRow>
                <FormGroup>
                  <FormLabel>場所</FormLabel>
                  <FormInput
                    type="text"
                    value={formData.location}
                    onChange={e => handleFormChange('location', e.target.value)}
                    placeholder="場所を入力"
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>担当者</FormLabel>
                  <FormInput
                    type="text"
                    value={formData.assignedTo}
                    onChange={e => handleFormChange('assignedTo', e.target.value)}
                    placeholder="担当者名を入力"
                  />
                </FormGroup>
              </FormRow>

              <FormGroup>
                <FormLabel>タグ</FormLabel>
                <FormInput
                  type="text"
                  value={formData.tags}
                  onChange={e => handleFormChange('tags', e.target.value)}
                  placeholder="タグをカンマ区切りで入力"
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>備考</FormLabel>
                <FormTextarea
                  value={formData.notes}
                  onChange={e => handleFormChange('notes', e.target.value)}
                  placeholder="備考を入力"
                />
              </FormGroup>

              <ModalActions>
                <ActionButton type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  キャンセル
                </ActionButton>
                <ActionButton type="submit" variant="primary">
                  {editingProject ? '更新' : '作成'}
                </ActionButton>
              </ModalActions>
            </form>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default ProjectManagement;
