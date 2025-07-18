/**
 * 作業報告機能コンポーネント
 * 従業員が日々の作業内容を報告するためのモバイル最適化インターフェース
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  FiCamera,
  FiSend,
  FiClock,
  FiMapPin,
  FiSun,
  FiMoon,
  FiCheck,
  FiEdit3,
  FiImage,
  FiX,
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

const HeaderTitle = styled.h1`
  font-size: ${FONT_SIZES.large};
  font-weight: 600;
  text-align: center;
  margin-bottom: ${SPACING.sm};
`;

const DateDisplay = styled.div`
  text-align: center;
  font-size: ${FONT_SIZES.small};
  opacity: 0.9;
`;

const Content = styled.div`
  padding: ${SPACING.base};
  max-width: 600px;
  margin: 0 auto;
`;

const ReportTypeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${SPACING.base};
  margin-bottom: ${SPACING.xl};
`;

const ReportTypeButton = styled.button`
  ${MOBILE_STYLES.touchTarget}
  background: ${props => (props.active ? COLORS.primary[600] : COLORS.white)};
  color: ${props => (props.active ? COLORS.white : COLORS.gray[700])};
  border: 2px solid ${props => (props.active ? COLORS.primary[600] : COLORS.gray[300])};
  border-radius: 12px;
  padding: ${SPACING.lg};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${SPACING.sm};
  font-size: ${FONT_SIZES.medium};
  font-weight: 500;
  transition: all 0.2s ease;

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

const SectionTitle = styled.h3`
  font-size: ${FONT_SIZES.medium};
  color: ${COLORS.gray[800]};
  margin-bottom: ${SPACING.md};
  display: flex;
  align-items: center;
  gap: ${SPACING.sm};
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

const TextArea = styled.textarea`
  ${MOBILE_STYLES.input}
  width: 100%;
  min-height: 120px;
  resize: vertical;
`;

const Select = styled.select`
  ${MOBILE_STYLES.input}
  width: 100%;
`;

const PhotoUploadArea = styled.div`
  border: 2px dashed ${COLORS.gray[300]};
  border-radius: 12px;
  padding: ${SPACING.xl};
  text-align: center;
  background: ${COLORS.gray[50]};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${COLORS.primary[400]};
    background: ${COLORS.primary[50]};
  }

  input {
    display: none;
  }
`;

const PhotoIcon = styled(FiCamera)`
  font-size: 48px;
  color: ${COLORS.gray[400]};
  margin-bottom: ${SPACING.sm};
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${SPACING.sm};
  margin-top: ${SPACING.md};
`;

const PhotoThumb = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: ${COLORS.gray[100]};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const RemovePhotoButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: ${COLORS.white};
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.sm};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${SPACING.sm};
  cursor: pointer;
  font-size: ${FONT_SIZES.small};
  color: ${COLORS.gray[700]};
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  accent-color: ${COLORS.primary[600]};
`;

const SubmitButton = styled.button`
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
  margin-top: ${SPACING.xl};

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    background: ${COLORS.gray[400]};
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  background: ${props => (props.success ? COLORS.green[50] : COLORS.red[50])};
  color: ${props => (props.success ? COLORS.green[700] : COLORS.red[700])};
  padding: ${SPACING.md};
  border-radius: 8px;
  margin-bottom: ${SPACING.base};
  text-align: center;
  font-size: ${FONT_SIZES.small};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${SPACING.sm};
`;

const WorkReport = ({ projectId, onBack }) => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('before'); // 'before' or 'after'
  const [formData, setFormData] = useState({
    workContent: '',
    location: '',
    weather: 'sunny',
    temperature: '',
    startTime: '',
    endTime: '',
    workers: [],
    materials: '',
    issues: '',
    photos: [],
    completedTasks: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // 作業項目のチェックリスト
  const taskChecklist = [
    '現場の清掃・片付け',
    '安全確認',
    '資材の確認',
    '機材の点検',
    '作業エリアの確保',
    '近隣への配慮',
  ];

  // 現在時刻を設定
  useEffect(() => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (reportType === 'before') {
      setFormData(prev => ({ ...prev, startTime: timeString }));
    } else {
      setFormData(prev => ({ ...prev, endTime: timeString }));
    }
  }, [reportType]);

  const handlePhotoSelect = e => {
    const files = Array.from(e.target.files);
    // 実際の実装では画像をアップロードしてURLを保存
    const newPhotos = files.map(file => ({
      id: Date.now() + Math.random(),
      url: URL.createObjectURL(file),
      file: file,
    }));
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos],
    }));
  };

  const removePhoto = photoId => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.id !== photoId),
    }));
  };

  const handleTaskToggle = task => {
    setFormData(prev => ({
      ...prev,
      completedTasks: prev.completedTasks.includes(task)
        ? prev.completedTasks.filter(t => t !== task)
        : [...prev.completedTasks, task],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 実際の実装ではAPIに送信
      const reportData = {
        ...formData,
        projectId,
        userId: user?.id || 'demo-user',
        reportType,
        createdAt: new Date().toISOString(),
      };

      // ローカルストレージに保存（デモ用）
      const storageKey = `work_reports_${projectId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(reportData);
      localStorage.setItem(storageKey, JSON.stringify(existing));

      setSubmitStatus({ success: true, message: '報告を送信しました' });
      showSuccess('作業報告を送信しました');

      // フォームをリセット
      setTimeout(() => {
        setFormData({
          workContent: '',
          location: '',
          weather: 'sunny',
          temperature: '',
          startTime: '',
          endTime: '',
          workers: [],
          materials: '',
          issues: '',
          photos: [],
          completedTasks: [],
        });
        setSubmitStatus(null);
      }, 2000);
    } catch (error) {
      setSubmitStatus({ success: false, message: 'エラーが発生しました' });
      showError('送信中にエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <Header>
        <HeaderTitle>作業報告</HeaderTitle>
        <DateDisplay>
          {new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </DateDisplay>
      </Header>

      <Content>
        {submitStatus && (
          <StatusMessage success={submitStatus.success}>
            {submitStatus.success ? <FiCheck /> : <FiX />}
            {submitStatus.message}
          </StatusMessage>
        )}

        <ReportTypeSelector>
          <ReportTypeButton
            active={reportType === 'before'}
            onClick={() => setReportType('before')}
          >
            <FiSun size={24} />
            作業前報告
          </ReportTypeButton>
          <ReportTypeButton active={reportType === 'after'} onClick={() => setReportType('after')}>
            <FiMoon size={24} />
            作業後報告
          </ReportTypeButton>
        </ReportTypeSelector>

        <FormSection>
          <SectionTitle>
            <FiEdit3 />
            作業内容
          </SectionTitle>
          <FormGroup>
            <Label>{reportType === 'before' ? '本日の作業予定' : '実施した作業'}</Label>
            <TextArea
              value={formData.workContent}
              onChange={e => setFormData({ ...formData, workContent: e.target.value })}
              placeholder={
                reportType === 'before'
                  ? '本日予定している作業内容を記入してください'
                  : '実施した作業内容を記入してください'
              }
            />
          </FormGroup>

          <FormGroup>
            <Label>作業場所</Label>
            <TextArea
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              placeholder="作業エリアや具体的な場所を記入"
              style={{ minHeight: 60 }}
            />
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>
            <FiClock />
            時間・天候
          </SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.base }}>
            <FormGroup>
              <Label>{reportType === 'before' ? '開始時刻' : '終了時刻'}</Label>
              <input
                type="time"
                value={reportType === 'before' ? formData.startTime : formData.endTime}
                onChange={e =>
                  setFormData({
                    ...formData,
                    [reportType === 'before' ? 'startTime' : 'endTime']: e.target.value,
                  })
                }
                style={{
                  ...MOBILE_STYLES.input,
                  width: '100%',
                }}
              />
            </FormGroup>
            <FormGroup>
              <Label>天候</Label>
              <Select
                value={formData.weather}
                onChange={e => setFormData({ ...formData, weather: e.target.value })}
              >
                <option value="sunny">晴れ</option>
                <option value="cloudy">曇り</option>
                <option value="rainy">雨</option>
                <option value="snowy">雪</option>
              </Select>
            </FormGroup>
          </div>
        </FormSection>

        {reportType === 'after' && (
          <FormSection>
            <SectionTitle>
              <FiCheck />
              作業完了項目
            </SectionTitle>
            <CheckboxGroup>
              {taskChecklist.map(task => (
                <CheckboxLabel key={task}>
                  <Checkbox
                    type="checkbox"
                    checked={formData.completedTasks.includes(task)}
                    onChange={() => handleTaskToggle(task)}
                  />
                  {task}
                </CheckboxLabel>
              ))}
            </CheckboxGroup>
          </FormSection>
        )}

        <FormSection>
          <SectionTitle>
            <FiCamera />
            現場写真
          </SectionTitle>
          <PhotoUploadArea as="label">
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoSelect}
            />
            <PhotoIcon />
            <div>写真を撮影・選択</div>
            <div
              style={{ fontSize: FONT_SIZES.tiny, color: COLORS.gray[500], marginTop: SPACING.xs }}
            >
              タップして写真を追加
            </div>
          </PhotoUploadArea>

          {formData.photos.length > 0 && (
            <PhotoGrid>
              {formData.photos.map(photo => (
                <PhotoThumb key={photo.id}>
                  <img src={photo.url} alt="現場写真" />
                  <RemovePhotoButton onClick={() => removePhoto(photo.id)}>
                    <FiX size={12} />
                  </RemovePhotoButton>
                </PhotoThumb>
              ))}
            </PhotoGrid>
          )}
        </FormSection>

        {reportType === 'after' && (
          <FormSection>
            <SectionTitle>連絡事項</SectionTitle>
            <FormGroup>
              <Label>問題点・申し送り事項</Label>
              <TextArea
                value={formData.issues}
                onChange={e => setFormData({ ...formData, issues: e.target.value })}
                placeholder="問題点や次回への申し送り事項があれば記入してください"
              />
            </FormGroup>
          </FormSection>
        )}

        <SubmitButton onClick={handleSubmit} disabled={submitting || !formData.workContent}>
          <FiSend />
          {submitting ? '送信中...' : '報告を送信'}
        </SubmitButton>
      </Content>
    </Container>
  );
};

export default WorkReport;
