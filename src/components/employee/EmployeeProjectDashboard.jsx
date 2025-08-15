import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Calendar, Clock, User, Camera, Save, FileText, CheckCircle } from 'lucide-react';
import { useEmployeeAuth } from './EmployeeGuard';

const Dashboard = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #4a7c4a, #2d5a2d);
  color: white;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  text-align: center;
`;

const Title = styled.h1`
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 700;
`;

const Subtitle = styled.p`
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e8f5e8;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e8f5e8;
  
  h2 {
    margin: 0;
    font-size: 20px;
    color: #2d5a2d;
  }
  
  svg {
    color: #4a7c4a;
  }
`;

const ProjectList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProjectItem = styled.div`
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: ${props => props.selected ? '#e8f5e8' : '#fafafa'};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f0f8f0;
    border-color: #4a7c4a;
  }
  
  h3 {
    margin: 0 0 5px 0;
    font-size: 16px;
    color: #333;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: #666;
  }
`;

const ReportForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  
  label {
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
    font-size: 14px;
  }
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
  
  &:focus {
    outline: none;
    border-color: #4a7c4a;
    box-shadow: 0 0 0 3px rgba(74, 124, 74, 0.1);
  }
`;

const TextArea = styled.textarea`
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  min-height: 120px;
  resize: vertical;
  transition: border-color 0.3s;
  
  &:focus {
    outline: none;
    border-color: #4a7c4a;
    box-shadow: 0 0 0 3px rgba(74, 124, 74, 0.1);
  }
`;

const PhotoUploadArea = styled.div`
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  background: #fafafa;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    border-color: #4a7c4a;
    background: #f0f8f0;
  }
  
  &.dragover {
    border-color: #4a7c4a;
    background: #e8f5e8;
  }
`;

const PhotoPreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 15px;
`;

const PhotoPreview = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #f0f0f0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  button {
    position: absolute;
    top: 5px;
    right: 5px;
    background: rgba(255, 0, 0, 0.8);
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background: rgba(255, 0, 0, 1);
    }
  }
`;

const SubmitButton = styled.button`
  background: linear-gradient(135deg, #4a7c4a, #2d5a2d);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(74, 124, 74, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const SuccessMessage = styled.div`
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const EmployeeProjectDashboard = () => {
  const { user } = useEmployeeAuth();
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [reportForm, setReportForm] = useState({
    workerName: user?.user_metadata?.name || '',
    workDate: new Date().toISOString().split('T')[0],
    workHours: '',
    workContent: '',
    photos: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // サンプルプロジェクトデータ
  useEffect(() => {
    // 実際の実装では、APIからプロジェクト一覧を取得
    setProjects([
      {
        id: 1,
        name: '田中様邸庭園リニューアル工事',
        address: '東京都新宿区西新宿1-1-1',
        status: '進行中',
        progress: 65
      },
      {
        id: 2,
        name: '佐藤商事様 エントランス造園',
        address: '東京都渋谷区渋谷2-2-2',
        status: '進行中',
        progress: 30
      },
      {
        id: 3,
        name: '山田様邸 和風庭園造成',
        address: '東京都世田谷区成城3-3-3',
        status: '着工準備',
        progress: 10
      }
    ]);
  }, []);

  const handleInputChange = (field, value) => {
    setReportForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoUpload = async (files) => {
    const fileArray = Array.from(files);
    const currentPhotos = reportForm.photos;
    
    // 最大枚数チェック
    const maxPhotos = parseInt(process.env.REACT_APP_MAX_PHOTOS, 10) || 5;
    if (currentPhotos.length + fileArray.length > maxPhotos) {
      alert(`写真は最大${maxPhotos}枚までアップロードできます`);
      return;
    }
    
    // セキュリティ設定を取得
    const maxFileSize = process.env.REACT_APP_MAX_FILE_SIZE 
      ? parseInt(process.env.REACT_APP_MAX_FILE_SIZE, 10) 
      : 5242880; // デフォルト5MB
    const allowedTypes = process.env.REACT_APP_ALLOWED_FILE_TYPES
      ? process.env.REACT_APP_ALLOWED_FILE_TYPES.split(',')
      : ['image/jpeg', 'image/png', 'image/webp'];
    
    // 各ファイルを検証
    const validFiles = [];
    for (const file of fileArray) {
      // ファイルタイプチェック（MIMEタイプとファイル拡張子の両方を検証）
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      
      if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(fileExtension)) {
        alert(`許可されていないファイル形式です: ${file.name}\n許可形式: JPEG, PNG, WebP`);
        continue;
      }
      
      // ファイルサイズチェック
      if (file.size > maxFileSize) {
        alert(`ファイルサイズが大きすぎます: ${file.name}\n最大サイズ: ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`);
        continue;
      }
      
      // ファイル名サニタイズ（セキュリティ対策）
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const safeFileName = `photo_${timestamp}_${randomStr}.${fileExtension}`;
      
      // ファイルの内容を検証（マジックナンバーチェック）
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // JPEGマジックナンバー: FF D8 FF
      // PNGマジックナンバー: 89 50 4E 47
      // WebPマジックナンバー: 52 49 46 46
      const isValidImage = 
        (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) || // JPEG
        (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) || // PNG
        (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46); // WebP
      
      if (!isValidImage) {
        console.error('Invalid image file detected:', file.name);
        alert(`無効な画像ファイルです: ${file.name}`);
        continue;
      }
      
      validFiles.push({ file, safeFileName });
    }
    
    // 有効なファイルのみプレビューを生成
    validFiles.forEach(({ file, safeFileName }) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // XSS対策: data URLの検証
        const dataUrl = e.target.result;
        if (dataUrl && dataUrl.startsWith('data:image/')) {
          setReportForm(prev => ({
            ...prev,
            photos: [...prev.photos, {
              id: Date.now() + Math.random(),
              file: new File([file], safeFileName, { type: file.type }),
              preview: dataUrl,
              originalName: file.name,
              safeFileName: safeFileName
            }]
          }));
        }
      };
      reader.onerror = () => {
        console.error('File read error:', file.name);
        alert(`ファイルの読み込みに失敗しました: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (photoId) => {
    setReportForm(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProject) {
      alert('プロジェクトを選択してください');
      return;
    }
    
    if (!reportForm.workHours || !reportForm.workContent) {
      alert('必須項目を入力してください');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 実際の実装では、APIに日報データを送信
      console.log('Submitting work report:', {
        projectId: selectedProject.id,
        ...reportForm,
        userId: user?.id
      });
      
      // フォームリセット
      setReportForm({
        workerName: user?.user_metadata?.name || '',
        workDate: new Date().toISOString().split('T')[0],
        workHours: '',
        workContent: '',
        photos: []
      });
      
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
      
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('日報の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dashboard>
      <Header>
        <Title>工事進捗管理</Title>
        <Subtitle>作業日報の投稿とプロジェクト進捗の確認</Subtitle>
      </Header>

      {submitSuccess && (
        <SuccessMessage>
          <CheckCircle size={20} />
          作業日報を正常に送信しました
        </SuccessMessage>
      )}

      <ContentGrid>
        <Card>
          <CardHeader>
            <FileText size={24} />
            <h2>担当プロジェクト</h2>
          </CardHeader>
          
          <ProjectList>
            {projects.map(project => (
              <ProjectItem
                key={project.id}
                selected={selectedProject?.id === project.id}
                onClick={() => setSelectedProject(project)}
              >
                <h3>{project.name}</h3>
                <p>{project.address}</p>
                <p>進捗: {project.progress}% | {project.status}</p>
              </ProjectItem>
            ))}
          </ProjectList>
        </Card>

        <Card>
          <CardHeader>
            <Calendar size={24} />
            <h2>作業日報の投稿</h2>
          </CardHeader>
          
          {!selectedProject ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>
              左のプロジェクト一覧から対象のプロジェクトを選択してください
            </p>
          ) : (
            <ReportForm onSubmit={handleSubmit}>
              <div style={{ 
                background: '#e8f5e8', 
                padding: '15px', 
                borderRadius: '6px',
                marginBottom: '10px' 
              }}>
                <strong>選択中: {selectedProject.name}</strong>
              </div>

              <FormGroup>
                <label>作業者名 *</label>
                <Input
                  type="text"
                  value={reportForm.workerName}
                  onChange={(e) => handleInputChange('workerName', e.target.value)}
                  required
                />
              </FormGroup>

              <FormGroup>
                <label>作業日 *</label>
                <Input
                  type="date"
                  value={reportForm.workDate}
                  onChange={(e) => handleInputChange('workDate', e.target.value)}
                  required
                />
              </FormGroup>

              <FormGroup>
                <label>作業時間 * (例: 8時間、9:00-17:00)</label>
                <Input
                  type="text"
                  value={reportForm.workHours}
                  onChange={(e) => handleInputChange('workHours', e.target.value)}
                  placeholder="8時間"
                  required
                />
              </FormGroup>

              <FormGroup>
                <label>作業内容 *</label>
                <TextArea
                  value={reportForm.workContent}
                  onChange={(e) => handleInputChange('workContent', e.target.value)}
                  placeholder="実施した作業の詳細を記入してください..."
                  required
                />
              </FormGroup>

              <FormGroup>
                <label>作業写真 (最大5枚)</label>
                <PhotoUploadArea
                  onClick={() => document.getElementById('photo-input').click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('dragover');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('dragover');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('dragover');
                    handlePhotoUpload(e.dataTransfer.files);
                  }}
                >
                  <Camera size={32} style={{ marginBottom: '10px', color: '#999' }} />
                  <p>クリック または ドラッグ&ドロップで写真を追加</p>
                  <p style={{ fontSize: '12px', color: '#999' }}>
                    ({reportForm.photos.length}/5枚)
                  </p>
                </PhotoUploadArea>
                
                <HiddenInput
                  id="photo-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />

                {reportForm.photos.length > 0 && (
                  <PhotoPreviewGrid>
                    {reportForm.photos.map(photo => (
                      <PhotoPreview key={photo.id}>
                        <img src={photo.preview} alt="作業写真" />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                        >
                          ×
                        </button>
                      </PhotoPreview>
                    ))}
                  </PhotoPreviewGrid>
                )}
              </FormGroup>

              <SubmitButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>送信中...</>
                ) : (
                  <>
                    <Save size={20} />
                    作業日報を送信
                  </>
                )}
              </SubmitButton>
            </ReportForm>
          )}
        </Card>
      </ContentGrid>
    </Dashboard>
  );
};

export default EmployeeProjectDashboard;