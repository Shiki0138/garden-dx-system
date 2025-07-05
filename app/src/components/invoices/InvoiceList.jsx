import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTable, useSortBy, useFilters, usePagination } from '@tanstack/react-table';
import {
  useAuth,
  useInvoicePermissions,
  ManagerOnlyComponent,
  ProtectedComponent,
  PERMISSIONS,
} from '../../hooks/useAuth';

const Container = styled.div`
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  color: #2c3e50;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
`;

const CreateButton = styled.button`
  background: #27ae60;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #219a52;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 120px;
`;

const SearchInput = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 200px;
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  background: #34495e;
  color: white;
  padding: 15px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  user-select: none;

  &:hover {
    background: #2c3e50;
  }
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #eee;

  &:hover {
    background: #f8f9fa;
  }
`;

const TableCell = styled.td`
  padding: 12px;
  font-size: 14px;
  color: #2c3e50;
`;

const StatusBadge = styled.span`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;

  ${props => {
    switch (props.status) {
      case '未送付':
        return 'background: #f39c12; color: white;';
      case '送付済':
        return 'background: #3498db; color: white;';
      case '支払済':
        return 'background: #27ae60; color: white;';
      case '滞納':
        return 'background: #e74c3c; color: white;';
      default:
        return 'background: #95a5a6; color: white;';
    }
  }}
`;

const ActionButton = styled.button`
  background: none;
  border: 1px solid #3498db;
  color: #3498db;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-right: 5px;
  transition: all 0.2s;

  &:hover {
    background: #3498db;
    color: white;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
`;

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 権限チェック
  const { user, isManager } = useAuth();
  const invoicePermissions = useInvoicePermissions();

  useEffect(() => {
    // TODO: 実際のAPI呼び出しに置き換え
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        // 仮データ
        const mockData = [
          {
            id: 1,
            invoice_number: 'INV-2024-001',
            customer_name: '田中造園株式会社',
            project_name: '新宿オフィスビル庭園工事',
            invoice_date: '2024-06-15',
            due_date: '2024-07-15',
            total_amount: 1250000,
            status: '送付済',
            payment_status: '未払い',
          },
          {
            id: 2,
            invoice_number: 'INV-2024-002',
            customer_name: '山田工務店',
            project_name: '住宅庭園設計・施工',
            invoice_date: '2024-06-20',
            due_date: '2024-07-20',
            total_amount: 850000,
            status: '未送付',
            payment_status: '未払い',
          },
        ];
        setInvoices(mockData);
      } catch (error) {
        console.error('請求書データの取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const formatCurrency = amount => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const handleCreateInvoice = () => {
    // 権限チェック：経営者のみ請求書作成可能
    if (!invoicePermissions.canCreate) {
      alert('請求書の作成権限がありません。経営者にお問い合わせください。');
      return;
    }
    // TODO: 新規請求書作成画面への遷移
    console.log('新規請求書作成');
  };

  const handleViewInvoice = invoiceId => {
    // TODO: 請求書詳細画面への遷移
    console.log('請求書詳細表示:', invoiceId);
  };

  const handleDownloadPDF = invoiceId => {
    // TODO: PDF ダウンロード機能
    console.log('PDF ダウンロード:', invoiceId);
  };

  const handleSendInvoice = invoiceId => {
    // 権限チェック：経営者のみ請求書送付可能
    if (!invoicePermissions.canSend) {
      alert('請求書の送付権限がありません。');
      return;
    }

    if (window.confirm('この請求書を送付済みに変更しますか？')) {
      // TODO: 請求書送付API呼び出し
      console.log('請求書送付:', invoiceId);
      alert('請求書を送付済みに変更しました');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesSearch =
      invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <Container>
        <div>読み込み中...</div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>請求書管理</Title>
        <ManagerOnlyComponent
          fallback={
            <div style={{ color: '#666', fontSize: '14px' }}>
              ※請求書の作成・編集は経営者のみ可能です
            </div>
          }
        >
          <CreateButton onClick={handleCreateInvoice}>新規請求書作成</CreateButton>
        </ManagerOnlyComponent>
      </Header>

      <FilterContainer>
        <FilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">すべて</option>
          <option value="未送付">未送付</option>
          <option value="送付済">送付済</option>
          <option value="支払済">支払済</option>
          <option value="滞納">滞納</option>
        </FilterSelect>

        <SearchInput
          type="text"
          placeholder="顧客名・案件名・請求書番号で検索"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </FilterContainer>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <TableHeader>請求書番号</TableHeader>
              <TableHeader>顧客名</TableHeader>
              <TableHeader>案件名</TableHeader>
              <TableHeader>請求日</TableHeader>
              <TableHeader>支払期限</TableHeader>
              <TableHeader>請求金額</TableHeader>
              <TableHeader>ステータス</TableHeader>
              <TableHeader>支払状況</TableHeader>
              <TableHeader>操作</TableHeader>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.invoice_number}</TableCell>
                <TableCell>{invoice.customer_name}</TableCell>
                <TableCell>{invoice.project_name}</TableCell>
                <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                <TableCell>{formatDate(invoice.due_date)}</TableCell>
                <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status}>{invoice.status}</StatusBadge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={invoice.payment_status}>
                    {invoice.payment_status}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  <ActionButton onClick={() => handleViewInvoice(invoice.id)}>詳細</ActionButton>
                  <ActionButton onClick={() => handleDownloadPDF(invoice.id)}>PDF</ActionButton>
                  <ManagerOnlyComponent>
                    <ActionButton
                      onClick={() => handleSendInvoice(invoice.id)}
                      style={{ background: '#27ae60' }}
                    >
                      送付
                    </ActionButton>
                  </ManagerOnlyComponent>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default InvoiceList;
