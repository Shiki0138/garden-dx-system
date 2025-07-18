/**
 * 追加見積もり機能コンポーネント
 * モバイルファースト設計で追加工事の見積もりを作成
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  FiPlus,
  FiFileText,
  FiCalendar,
  FiDollarSign,
  FiSave,
  FiArrowLeft,
  FiCamera,
  FiEdit3,
  FiTrash2,
  FiCheck,
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { showSuccess, showError } from '../utils/notifications';
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
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${SPACING.base};
`;

const BackButton = styled.button`
  ${MOBILE_STYLES.touchTarget}
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: ${COLORS.white};
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${TOUCH_SIZES.medium};
  height: ${TOUCH_SIZES.medium};
`;

const Title = styled.h1`
  font-size: ${FONT_SIZES.large};
  font-weight: 600;
  flex: 1;
  text-align: center;
`;

const Content = styled.div`
  padding: ${SPACING.base};
  max-width: 600px;
  margin: 0 auto;
`;

const EstimateCard = styled.div`
  background: ${COLORS.white};
  border-radius: 12px;
  padding: ${SPACING.lg};
  margin-bottom: ${SPACING.base};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid ${COLORS.gray[200]};
`;

const EstimateHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${SPACING.base};
`;

const EstimateTitle = styled.h3`
  font-size: ${FONT_SIZES.medium};
  color: ${COLORS.gray[800]};
  display: flex;
  align-items: center;
  gap: ${SPACING.sm};
`;

const EstimateDate = styled.span`
  font-size: ${FONT_SIZES.small};
  color: ${COLORS.gray[600]};
`;

const EstimateAmount = styled.div`
  font-size: ${FONT_SIZES.large};
  font-weight: 600;
  color: ${COLORS.primary[600]};
  margin-top: ${SPACING.sm};
`;

const AddButton = styled.button`
  ${MOBILE_STYLES.touchTarget}
  width: 100%;
  background: ${COLORS.primary[600]};
  color: ${COLORS.white};
  border: none;
  border-radius: 12px;
  padding: ${SPACING.lg};
  font-size: ${FONT_SIZES.medium};
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${SPACING.sm};
  box-shadow: 0 4px 12px rgba(45, 90, 45, 0.3);
  margin-bottom: ${SPACING.xl};

  &:active {
    transform: scale(0.98);
  }
`;

const FormSection = styled.div`
  background: ${COLORS.white};
  border-radius: 12px;
  padding: ${SPACING.lg};
  margin-bottom: ${SPACING.base};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const FormTitle = styled.h3`
  font-size: ${FONT_SIZES.medium};
  color: ${COLORS.gray[800]};
  margin-bottom: ${SPACING.md};
`;

const FormGroup = styled.div`
  margin-bottom: ${SPACING.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${FONT_SIZES.small};
  color: ${COLORS.gray[700]};
  margin-bottom: ${SPACING.xs};
  font-weight: 500;
`;

const Input = styled.input`
  ${MOBILE_STYLES.input}
  width: 100%;
`;

const TextArea = styled.textarea`
  ${MOBILE_STYLES.input}
  width: 100%;
  min-height: 100px;
  resize: vertical;
`;

const ItemList = styled.div`
  margin-top: ${SPACING.md};
`;

const ItemRow = styled.div`
  display: flex;
  gap: ${SPACING.sm};
  margin-bottom: ${SPACING.sm};
  align-items: flex-end;
`;

const ItemInput = styled.input`
  ${MOBILE_STYLES.input}
  flex: 1;
`;

const ItemButton = styled.button`
  ${MOBILE_STYLES.touchTarget}
  background: ${props => (props.danger ? COLORS.red[600] : COLORS.primary[600])};
  color: ${COLORS.white};
  border: none;
  border-radius: 8px;
  width: ${TOUCH_SIZES.small};
  height: ${TOUCH_SIZES.small};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PhotoSection = styled.div`
  margin-top: ${SPACING.lg};
`;

const PhotoButton = styled.button`
  ${MOBILE_STYLES.touchTarget}
  width: 100%;
  background: ${COLORS.gray[100]};
  border: 2px dashed ${COLORS.gray[300]};
  border-radius: 12px;
  padding: ${SPACING.lg};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${SPACING.sm};
  color: ${COLORS.gray[600]};
`;

const PhotoPreview = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: ${SPACING.sm};
  margin-top: ${SPACING.md};
`;

const PhotoThumb = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: ${COLORS.gray[100]};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const SaveButton = styled.button`
  ${MOBILE_STYLES.touchTarget}
  width: 100%;
  background: ${COLORS.primary[600]};
  color: ${COLORS.white};
  border: none;
  border-radius: 12px;
  padding: ${SPACING.lg};
  font-size: ${FONT_SIZES.medium};
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${SPACING.sm};
  margin-top: ${SPACING.xl};
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: ${SPACING.xs} ${SPACING.sm};
  border-radius: 4px;
  font-size: ${FONT_SIZES.tiny};
  font-weight: 500;
  background: ${props => (props.approved ? COLORS.green[100] : COLORS.yellow[100])};
  color: ${props => (props.approved ? COLORS.green[700] : COLORS.yellow[700])};
`;

const TotalSection = styled.div`
  background: ${COLORS.primary[50]};
  border-radius: 12px;
  padding: ${SPACING.lg};
  margin-top: ${SPACING.xl};
  border: 2px solid ${COLORS.primary[200]};
`;

const TotalLabel = styled.div`
  font-size: ${FONT_SIZES.small};
  color: ${COLORS.gray[600]};
  margin-bottom: ${SPACING.xs};
`;

const TotalAmount = styled.div`
  font-size: ${FONT_SIZES.xlarge};
  font-weight: 700;
  color: ${COLORS.primary[700]};
`;

const AdditionalEstimate = ({ projectId, originalEstimateId, onBack }) => {
  const { user } = useAuth();
  const [additionalEstimates, setAdditionalEstimates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    items: [{ name: '', quantity: 1, unit: '', unitPrice: 0, amount: 0 }],
    photos: [],
    status: 'draft',
  });
  const [originalAmount, setOriginalAmount] = useState(0);

  // 既存の追加見積もりを読み込み
  useEffect(() => {
    loadAdditionalEstimates();
    loadOriginalEstimate();
  }, [projectId, originalEstimateId]);

  const loadAdditionalEstimates = useCallback(async () => {
    try {
      // ローカルストレージから読み込み（デモ用）
      const saved = localStorage.getItem(`additional_estimates_${projectId}`);
      if (saved) {
        setAdditionalEstimates(JSON.parse(saved));
      }
    } catch (error) {
      console.error('追加見積もりの読み込みエラー:', error);
    }
  }, [projectId]);

  const loadOriginalEstimate = useCallback(async () => {
    try {
      // デモ用: 仮の金額を設定
      setOriginalAmount(1500000);
    } catch (error) {
      console.error('元見積もりの読み込みエラー:', error);
    }
  }, [originalEstimateId]);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, unit: '', unitPrice: 0, amount: 0 }],
    });
  };

  const handleRemoveItem = index => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // 金額を自動計算
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handlePhotoSelect = e => {
    const files = Array.from(e.target.files);
    // 実際の実装では画像をアップロードしてURLを保存
    const photoUrls = files.map(file => URL.createObjectURL(file));
    setFormData({ ...formData, photos: [...formData.photos, ...photoUrls] });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateGrandTotal = () => {
    const additionalTotal = additionalEstimates.reduce((sum, est) => sum + est.totalAmount, 0);
    return originalAmount + additionalTotal + (showForm ? calculateTotal() : 0);
  };

  const handleSave = async () => {
    try {
      const newEstimate = {
        id: Date.now().toString(),
        projectId,
        originalEstimateId,
        ...formData,
        totalAmount: calculateTotal(),
        createdAt: new Date().toISOString(),
        createdBy: user?.id || 'demo-user',
      };

      const updated = [...additionalEstimates, newEstimate];
      setAdditionalEstimates(updated);

      // ローカルストレージに保存（デモ用）
      localStorage.setItem(`additional_estimates_${projectId}`, JSON.stringify(updated));

      showSuccess('追加見積もりを保存しました');
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        items: [{ name: '', quantity: 1, unit: '', unitPrice: 0, amount: 0 }],
        photos: [],
        status: 'draft',
      });
    } catch (error) {
      showError('保存中にエラーが発生しました');
    }
  };

  return (
    <Container>
      <Header>
        <HeaderContent>
          <BackButton onClick={onBack}>
            <FiArrowLeft size={20} />
          </BackButton>
          <Title>追加見積もり</Title>
          <div style={{ width: TOUCH_SIZES.medium }} />
        </HeaderContent>
      </Header>

      <Content>
        {/* 既存の追加見積もり一覧 */}
        {additionalEstimates.map(estimate => (
          <EstimateCard key={estimate.id}>
            <EstimateHeader>
              <EstimateTitle>
                <FiFileText />
                {estimate.title}
              </EstimateTitle>
              <StatusBadge approved={estimate.status === 'approved'}>
                {estimate.status === 'approved' ? '承認済み' : '未承認'}
              </StatusBadge>
            </EstimateHeader>
            <EstimateDate>
              <FiCalendar size={14} style={{ marginRight: 4 }} />
              {new Date(estimate.createdAt).toLocaleDateString()}
            </EstimateDate>
            <EstimateAmount>¥{estimate.totalAmount.toLocaleString()}</EstimateAmount>
          </EstimateCard>
        ))}

        {/* 新規追加ボタン */}
        {!showForm && (
          <AddButton onClick={() => setShowForm(true)}>
            <FiPlus size={20} />
            追加見積もりを作成
          </AddButton>
        )}

        {/* 入力フォーム */}
        {showForm && (
          <>
            <FormSection>
              <FormTitle>基本情報</FormTitle>
              <FormGroup>
                <Label>件名</Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例: 芝生エリアの拡張工事"
                />
              </FormGroup>
              <FormGroup>
                <Label>詳細説明</Label>
                <TextArea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="追加工事の内容を詳しく記載してください"
                />
              </FormGroup>
            </FormSection>

            <FormSection>
              <FormTitle>見積もり項目</FormTitle>
              <ItemList>
                {formData.items.map((item, index) => (
                  <div key={index}>
                    <Label>項目 {index + 1}</Label>
                    <ItemRow>
                      <ItemInput
                        type="text"
                        value={item.name}
                        onChange={e => handleItemChange(index, 'name', e.target.value)}
                        placeholder="項目名"
                      />
                      <ItemButton danger onClick={() => handleRemoveItem(index)}>
                        <FiTrash2 size={16} />
                      </ItemButton>
                    </ItemRow>
                    <ItemRow>
                      <ItemInput
                        type="number"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                        placeholder="数量"
                        style={{ flex: 0.3 }}
                      />
                      <ItemInput
                        type="text"
                        value={item.unit}
                        onChange={e => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="単位"
                        style={{ flex: 0.3 }}
                      />
                      <ItemInput
                        type="number"
                        value={item.unitPrice}
                        onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                        placeholder="単価"
                        style={{ flex: 0.4 }}
                      />
                    </ItemRow>
                  </div>
                ))}
                <ItemButton onClick={handleAddItem}>
                  <FiPlus size={16} />
                </ItemButton>
              </ItemList>
            </FormSection>

            <FormSection>
              <FormTitle>
                <FiCamera size={18} style={{ marginRight: 8 }} />
                現場写真
              </FormTitle>
              <PhotoSection>
                <PhotoButton as="label">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handlePhotoSelect}
                  />
                  <FiCamera size={24} />
                  <span>写真を追加</span>
                </PhotoButton>
                {formData.photos.length > 0 && (
                  <PhotoPreview>
                    {formData.photos.map((photo, index) => (
                      <PhotoThumb key={index}>
                        <img src={photo} alt={`写真 ${index + 1}`} />
                      </PhotoThumb>
                    ))}
                  </PhotoPreview>
                )}
              </PhotoSection>
            </FormSection>

            <SaveButton onClick={handleSave}>
              <FiSave size={20} />
              追加見積もりを保存
            </SaveButton>
          </>
        )}

        {/* 合計金額表示 */}
        <TotalSection>
          <TotalLabel>見積もり合計（当初 + 追加）</TotalLabel>
          <TotalAmount>¥{calculateGrandTotal().toLocaleString()}</TotalAmount>
        </TotalSection>
      </Content>
    </Container>
  );
};

export default AdditionalEstimate;
