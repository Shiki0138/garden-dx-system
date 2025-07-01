/**
 * 案件履歴管理機能
 * 造園事業者向け案件検索・フィルター・ステータス管理システム
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { 
  Search, 
  Filter, 
  Calendar,
  MapPin,
  User,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings
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
  textWhite: '#ffffff'
};

// プロジェクトステータス定義
const PROJECT_STATUSES = {
  inquiry: { label: '問い合わせ', color: colors.info, icon: MessageCircle },
  survey: { label: '現地調査', color: colors.warning, icon: MapPin },
  estimate: { label: '見積作成', color: colors.warning, icon: FileText },
  proposal: { label: '提案中', color: colors.accent, icon: Clock },
  contracted: { label: '契約済み', color: colors.success, icon: CheckCircle },
  in_progress: { label: '施工中', color: colors.primary, icon: Settings },
  completed: { label: '完了', color: colors.success, icon: CheckCircle },
  cancelled: { label: 'キャンセル', color: colors.error, icon: AlertCircle },
  maintenance: { label: '保守管理', color: colors.secondary, icon: RefreshCw }
};

// メインコンテナ
const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background: ${colors.background};
  min-height: 100vh;
`;

// ヘッダーセクション
const Header = styled.div`
  background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
  color: ${colors.textWhite};
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  box-shadow: 0 4px 20px rgba(26, 71, 42, 0.15);
`;

const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 12px;
  
  &::before {
    content: '🌿';
    font-size: 1.5rem;
  }
`;

const HeaderSubtitle = styled.p`
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.9;
`;

// 検索・フィルターセクション
const FiltersSection = styled.div`
  background: ${colors.surface};
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid ${colors.border};
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 200px 200px 150px 120px;
  gap: 15px;
  align-items: end;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SearchInput = styled.div`
  position: relative;
`;

const SearchField = styled.input`
  width: 100%;
  padding: 12px 45px 12px 15px;
  border: 2px solid ${colors.border};
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  
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
  
  ${props => props.variant === 'primary' && `
    background: ${colors.primary};
    color: ${colors.textWhite};
    
    &:hover {
      background: ${colors.secondary};
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: ${colors.surface};
    color: ${colors.primary};
    border: 2px solid ${colors.primary};
    
    &:hover {
      background: ${colors.primary};
      color: ${colors.textWhite};
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// 統計情報セクション
const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
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
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.color || colors.primary};
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${colors.textLight};
  font-weight: 500;
`;

// プロジェクト一覧セクション
const ProjectsGrid = styled.div`
  display: grid;
  gap: 20px;
`;

const ProjectCard = styled.div`
  background: ${colors.surface};
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid ${colors.border};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
`;

const ProjectHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 15px;
  gap: 15px;
`;

const ProjectInfo = styled.div`
  flex: 1;
`;

const ProjectTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${colors.text};
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ProjectId = styled.span`
  font-size: 0.85rem;
  color: ${colors.textLight};
  background: ${colors.background};
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
`;

const ProjectMeta = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.textLight};
  font-size: 0.9rem;
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
`;

const ProjectActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
`;

const ActionIcon = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
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
`;

const AmountDisplay = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${colors.primary};
  background: rgba(26, 71, 42, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
  margin-top: 10px;
`;

// ページネーション
const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
`;

const PageButton = styled.button`
  width: 40px;
  height: 40px;
  border: 2px solid ${colors.border};
  border-radius: 8px;
  background: ${props => props.active ? colors.primary : colors.surface};
  color: ${props => props.active ? colors.textWhite : colors.text};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${colors.primary};
    background: ${props => props.active ? colors.secondary : colors.primary};
    color: ${colors.textWhite};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/**
 * 案件履歴管理メインコンポーネント
 */
const ProjectHistoryManager = () => {
  // ステート管理
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // サンプルデータ（実際の実装では API から取得）
  const sampleProjects = useMemo(() => [
    {
      id: 'P2024001',
      title: '田中邸庭園リニューアル工事',
      customer: '田中太郎',
      location: '東京都世田谷区',
      status: 'completed',
      amount: 2500000,
      estimateDate: '2024-06-15',
      contractDate: '2024-07-01',
      completionDate: '2024-08-15',
      workType: '庭園造成工事',
      description: '既存庭園の全面リニューアル、植栽・石積み・水回り工事'
    },
    {
      id: 'P2024002', 
      title: '佐藤商事ビル外構工事',
      customer: '佐藤商事株式会社',
      location: '神奈川県横浜市',
      status: 'in_progress',
      amount: 4800000,
      estimateDate: '2024-07-10',
      contractDate: '2024-07-25',
      workType: '外構工事',
      description: 'オフィスビル敷地の外構整備、駐車場・植栽・照明工事'
    },
    {
      id: 'P2024003',
      title: '山田邸新築外構工事',
      customer: '山田花子',
      location: '千葉県柏市',
      status: 'proposal',
      amount: 1800000,
      estimateDate: '2024-08-05',
      workType: '新築外構工事',
      description: '新築住宅の外構工事、門柱・フェンス・駐車場・植栽'
    },
    {
      id: 'P2024004',
      title: '公園リニューアル設計',
      customer: '○○市役所',
      location: '埼玉県○○市',
      status: 'contracted',
      amount: 12000000,
      estimateDate: '2024-05-20',
      contractDate: '2024-06-10',
      workType: '設計監理',
      description: '市民公園のリニューアル設計・監理業務'
    },
    {
      id: 'P2024005',
      title: '鈴木邸植栽メンテナンス',
      customer: '鈴木一郎',
      location: '東京都杉並区',
      status: 'maintenance',
      amount: 350000,
      estimateDate: '2024-08-20',
      contractDate: '2024-09-01',
      workType: '維持管理',
      description: '年間植栽メンテナンス契約、剪定・施肥・病害虫防除'
    }
  ], []);
  
  // 初期データ読み込み
  useEffect(() => {
    setLoading(true);
    // 実際の実装では API 呼び出し
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
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }
    
    // 年度フィルター
    if (yearFilter !== 'all') {
      filtered = filtered.filter(project => {
        const year = new Date(project.estimateDate).getFullYear();
        return year.toString() === yearFilter;
      });
    }
    
    // 金額フィルター
    if (amountFilter !== 'all') {
      filtered = filtered.filter(project => {
        const amount = project.amount;
        switch (amountFilter) {
          case 'small': return amount < 1000000;
          case 'medium': return amount >= 1000000 && amount < 5000000;
          case 'large': return amount >= 5000000;
          default: return true;
        }
      });
    }
    
    // ソート
    filtered.sort((a, b) => {
      const dateA = new Date(a.estimateDate);
      const dateB = new Date(b.estimateDate);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredProjects(filtered);
    setCurrentPage(1);
  }, [projects, searchTerm, statusFilter, yearFilter, amountFilter, sortOrder]);
  
  // 統計情報計算
  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const inProgress = projects.filter(p => p.status === 'in_progress').length;
    const totalAmount = projects.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return {
      total,
      completed,
      inProgress,
      totalAmount,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [projects]);
  
  // ページング計算
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  
  // イベントハンドラー
  const handleSearch = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);
  
  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value);
  }, []);
  
  const handleYearFilter = useCallback((event) => {
    setYearFilter(event.target.value);
  }, []);
  
  const handleAmountFilter = useCallback((event) => {
    setAmountFilter(event.target.value);
  }, []);
  
  const handleSortToggle = useCallback(() => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  }, []);
  
  const handleProjectAction = useCallback((projectId, action) => {
    console.log(`プロジェクト ${projectId} のアクション: ${action}`);
    // 実際の実装では対応する処理を実行
  }, []);
  
  // ユーティリティ関数
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getStatusInfo = (status) => {
    return PROJECT_STATUSES[status] || PROJECT_STATUSES.inquiry;
  };
  
  return (
    <Container>
      {/* ヘッダー */}
      <Header>
        <HeaderTitle>案件履歴管理</HeaderTitle>
        <HeaderSubtitle>
          造園工事案件の検索・フィルター・ステータス管理システム
        </HeaderSubtitle>
      </Header>
      
      {/* 統計情報 */}
      <StatsSection>
        <StatCard color={colors.primary}>
          <StatValue color={colors.primary}>{stats.total}</StatValue>
          <StatLabel>総案件数</StatLabel>
        </StatCard>
        <StatCard color={colors.success}>
          <StatValue color={colors.success}>{stats.completed}</StatValue>
          <StatLabel>完了案件</StatLabel>
        </StatCard>
        <StatCard color={colors.warning}>
          <StatValue color={colors.warning}>{stats.inProgress}</StatValue>
          <StatLabel>進行中案件</StatLabel>
        </StatCard>
        <StatCard color={colors.info}>
          <StatValue color={colors.info}>{stats.completionRate}%</StatValue>
          <StatLabel>完成率</StatLabel>
        </StatCard>
        <StatCard color={colors.accent}>
          <StatValue color={colors.accent}>
            {formatCurrency(stats.totalAmount)}
          </StatValue>
          <StatLabel>総契約金額</StatLabel>
        </StatCard>
      </StatsSection>
      
      {/* 検索・フィルター */}
      <FiltersSection>
        <FiltersGrid>
          <SearchInput>
            <SearchField
              type="text"
              placeholder="案件名・顧客名・場所・案件IDで検索..."
              value={searchTerm}
              onChange={handleSearch}
            />
            <SearchIcon />
          </SearchInput>
          
          <FilterSelect value={statusFilter} onChange={handleStatusFilter}>
            <option value="all">全ステータス</option>
            {Object.entries(PROJECT_STATUSES).map(([key, status]) => (
              <option key={key} value={key}>{status.label}</option>
            ))}
          </FilterSelect>
          
          <FilterSelect value={yearFilter} onChange={handleYearFilter}>
            <option value="all">全年度</option>
            <option value="2024">2024年</option>
            <option value="2023">2023年</option>
            <option value="2022">2022年</option>
          </FilterSelect>
          
          <FilterSelect value={amountFilter} onChange={handleAmountFilter}>
            <option value="all">全金額</option>
            <option value="small">100万円未満</option>
            <option value="medium">100万円～500万円</option>
            <option value="large">500万円以上</option>
          </FilterSelect>
          
          <ActionButton variant="secondary" onClick={handleSortToggle}>
            {sortOrder === 'desc' ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            日付順
          </ActionButton>
        </FiltersGrid>
      </FiltersSection>
      
      {/* プロジェクト一覧 */}
      <ProjectsGrid>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <RefreshCw size={48} color={colors.primary} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '20px', color: colors.textLight }}>読み込み中...</p>
          </div>
        ) : paginatedProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <AlertCircle size={48} color={colors.textLight} />
            <p style={{ marginTop: '20px', color: colors.textLight }}>
              条件に該当する案件が見つかりません
            </p>
          </div>
        ) : (
          paginatedProjects.map(project => {
            const statusInfo = getStatusInfo(project.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <ProjectCard key={project.id}>
                <ProjectHeader>
                  <ProjectInfo>
                    <ProjectTitle>
                      {project.title}
                      <ProjectId>{project.id}</ProjectId>
                    </ProjectTitle>
                    <StatusBadge color={statusInfo.color}>
                      <StatusIcon size={14} />
                      {statusInfo.label}
                    </StatusBadge>
                  </ProjectInfo>
                  <ProjectActions>
                    <ActionIcon 
                      color={colors.info}
                      onClick={() => handleProjectAction(project.id, 'view')}
                      title="詳細表示"
                    >
                      <Eye size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      color={colors.accent}
                      onClick={() => handleProjectAction(project.id, 'edit')}
                      title="編集"
                    >
                      <Edit size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      color={colors.warning}
                      onClick={() => handleProjectAction(project.id, 'download')}
                      title="ダウンロード"
                    >
                      <Download size={16} />
                    </ActionIcon>
                  </ProjectActions>
                </ProjectHeader>
                
                <ProjectMeta>
                  <MetaItem>
                    <User size={16} />
                    {project.customer}
                  </MetaItem>
                  <MetaItem>
                    <MapPin size={16} />
                    {project.location}
                  </MetaItem>
                  <MetaItem>
                    <Calendar size={16} />
                    見積: {formatDate(project.estimateDate)}
                  </MetaItem>
                  {project.contractDate && (
                    <MetaItem>
                      <CheckCircle size={16} />
                      契約: {formatDate(project.contractDate)}
                    </MetaItem>
                  )}
                </ProjectMeta>
                
                <div style={{ marginBottom: '10px', color: colors.textLight }}>
                  <strong>工事種別:</strong> {project.workType}
                </div>
                
                <div style={{ marginBottom: '15px', color: colors.text }}>
                  {project.description}
                </div>
                
                <AmountDisplay>
                  <DollarSign size={18} style={{ display: 'inline', marginRight: '8px' }} />
                  契約金額: {formatCurrency(project.amount)}
                </AmountDisplay>
              </ProjectCard>
            );
          })
        )}
      </ProjectsGrid>
      
      {/* ページネーション */}
      {totalPages > 1 && (
        <Pagination>
          <PageButton
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            ‹
          </PageButton>
          
          {[...Array(totalPages)].map((_, index) => {
            const pageNum = index + 1;
            if (
              pageNum === 1 ||
              pageNum === totalPages ||
              (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
            ) {
              return (
                <PageButton
                  key={pageNum}
                  active={pageNum === currentPage}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </PageButton>
              );
            } else if (
              pageNum === currentPage - 3 ||
              pageNum === currentPage + 3
            ) {
              return <span key={pageNum}>...</span>;
            }
            return null;
          })}
          
          <PageButton
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            ›
          </PageButton>
        </Pagination>
      )}
    </Container>
  );
};

export default ProjectHistoryManager;