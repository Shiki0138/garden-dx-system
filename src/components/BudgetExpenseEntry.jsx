import React, { useState } from 'react';
import styled from 'styled-components';
import { FiDollarSign, FiCalendar, FiUser, FiTruck, FiPackage, FiTool } from 'react-icons/fi';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h2`
  color: #2d5a2d;
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const QuickEntryCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const CategoryButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 20px;
`;

const CategoryButton = styled.button`
  padding: 15px;
  border: 2px solid ${props => props.selected ? '#4a7c4a' : '#e0e0e0'};
  background: ${props => props.selected ? '#e8f5e8' : 'white'};
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;

  &:hover {
    border-color: #4a7c4a;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4a7c4a;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  min-height: 80px;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4a7c4a;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #4a7c4a, #2d5a2d);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(74, 124, 74, 0.3);
  }
`;

const RecentExpenses = styled.div`
  background: #f5f5f5;
  border-radius: 12px;
  padding: 20px;
`;

const ExpenseItem = styled.div`
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ExpenseInfo = styled.div`
  flex: 1;
`;

const ExpenseAmount = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #e74c3c;
`;

const BudgetSummary = styled.div`
  background: linear-gradient(135deg, #e8f5e8, #f0f8f0);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #4a7c4a;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => 
    props.percentage > 80 ? '#e74c3c' : 
    props.percentage > 60 ? '#f39c12' : 
    '#4a7c4a'
  };
  width: ${props => props.percentage}%;
  transition: width 0.3s ease;
`;

const BudgetExpenseEntry = ({ projectId, budget, onExpenseAdded }) => {
  const [selectedCategory, setSelectedCategory] = useState('material');
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    receipt_number: ''
  });

  const categories = [
    { id: 'material', name: '材料費', icon: <FiPackage /> },
    { id: 'labor', name: '人件費', icon: <FiUser /> },
    { id: 'subcontract', name: '外注費', icon: <FiTruck /> },
    { id: 'other', name: 'その他', icon: <FiTool /> }
  ];

  // ダミーデータ（実際はAPIから取得）
  const totalExpenses = 450000;
  const budgetAmount = 2000000;
  const percentage = (totalExpenses / budgetAmount) * 100;

  const recentExpenses = [
    { id: 1, category: '材料費', description: 'セメント10袋', amount: 15000, date: '2024-01-20' },
    { id: 2, category: '人件費', description: '作業員2名（1日）', amount: 40000, date: '2024-01-20' },
    { id: 3, category: '外注費', description: '重機レンタル', amount: 25000, date: '2024-01-19' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const expense = {
      project_id: projectId,
      category: selectedCategory,
      amount: parseFloat(formData.amount),
      description: formData.description,
      expense_date: formData.date,
      receipt_number: formData.receipt_number
    };

    // APIに送信（実装が必要）
    console.log('経費登録:', expense);
    
    // フォームをリセット
    setFormData({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      receipt_number: ''
    });

    if (onExpenseAdded) {
      onExpenseAdded(expense);
    }
  };

  return (
    <Container>
      <Title>
        <FiDollarSign />
        経費入力（現場から簡単登録）
      </Title>

      <BudgetSummary>
        <h3>予算消化状況</h3>
        <div style={{ fontSize: '24px', fontWeight: '600', margin: '10px 0' }}>
          ¥{totalExpenses.toLocaleString()} / ¥{budgetAmount.toLocaleString()}
        </div>
        <ProgressBar>
          <ProgressFill percentage={percentage} />
        </ProgressBar>
        <div style={{ textAlign: 'right', color: '#666' }}>
          消化率: {percentage.toFixed(1)}%
        </div>
      </BudgetSummary>

      <QuickEntryCard>
        <h3 style={{ marginBottom: '20px' }}>経費を登録</h3>
        
        <CategoryButtons>
          {categories.map(cat => (
            <CategoryButton
              key={cat.id}
              selected={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.icon}
              {cat.name}
            </CategoryButton>
          ))}
        </CategoryButtons>

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>金額 *</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              placeholder="15000"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>内容 *</Label>
            <TextArea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="セメント10袋購入"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>日付</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </FormGroup>

          <FormGroup>
            <Label>領収書番号</Label>
            <Input
              type="text"
              value={formData.receipt_number}
              onChange={(e) => setFormData({...formData, receipt_number: e.target.value})}
              placeholder="R-20240120-001"
            />
          </FormGroup>

          <SubmitButton type="submit">
            経費を登録
          </SubmitButton>
        </form>
      </QuickEntryCard>

      <RecentExpenses>
        <h3 style={{ marginBottom: '15px' }}>最近の経費</h3>
        {recentExpenses.map(expense => (
          <ExpenseItem key={expense.id}>
            <ExpenseInfo>
              <div style={{ fontWeight: '600' }}>{expense.category}</div>
              <div style={{ color: '#666', fontSize: '14px' }}>{expense.description}</div>
              <div style={{ color: '#999', fontSize: '12px' }}>{expense.date}</div>
            </ExpenseInfo>
            <ExpenseAmount>
              ¥{expense.amount.toLocaleString()}
            </ExpenseAmount>
          </ExpenseItem>
        ))}
      </RecentExpenses>
    </Container>
  );
};

export default BudgetExpenseEntry;