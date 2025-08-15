import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { handleFileUpload, getPriceMaster } from '../utils/importPriceMaster';
import { loadDefaultPriceMaster } from '../utils/defaultPriceMaster';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  margin-bottom: 30px;
  
  h1 {
    font-size: 24px;
    color: #2d5a3d;
    margin-bottom: 10px;
  }
  
  p {
    color: #666;
    line-height: 1.6;
  }
`;

const UploadSection = styled.div`
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 30px;
`;

const UploadArea = styled.div`
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 60px 20px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
  
  &:hover {
    border-color: #4CAF50;
    background: #f8f9fa;
  }
  
  &.dragging {
    border-color: #4CAF50;
    background: #e8f5e9;
  }
  
  svg {
    width: 48px;
    height: 48px;
    color: #999;
    margin-bottom: 20px;
  }
  
  h3 {
    font-size: 18px;
    color: #333;
    margin-bottom: 10px;
  }
  
  p {
    color: #666;
    margin-bottom: 20px;
  }
`;

const Button = styled.button`
  background: ${props => props.primary ? '#4CAF50' : '#f5f5f5'};
  color: ${props => props.primary ? 'white' : '#333'};
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  
  &:hover {
    background: ${props => props.primary ? '#45a049' : '#e0e0e0'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const StatusMessage = styled.div`
  margin-top: 20px;
  padding: 15px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  
  &.success {
    background: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #4caf50;
  }
  
  &.error {
    background: #ffebee;
    color: #c62828;
    border: 1px solid #f44336;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const CurrentDataSection = styled.div`
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const DataInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
  
  .info-card {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 6px;
    
    h4 {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
    
    p {
      font-size: 24px;
      font-weight: bold;
      color: #2d5a3d;
    }
  }
`;

const TemplateSection = styled.div`
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
  
  h3 {
    font-size: 16px;
    margin-bottom: 10px;
  }
  
  p {
    color: #666;
    margin-bottom: 15px;
  }
`;

const PriceMasterUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [currentData, setCurrentData] = useState(null);

  // コンポーネントマウント時に現在のデータを確認
  React.useEffect(() => {
    const data = getPriceMaster();
    if (data) {
      const updatedAt = localStorage.getItem('priceMasterUpdatedAt');
      setCurrentData({
        data,
        updatedAt: updatedAt ? new Date(updatedAt).toLocaleString('ja-JP') : '不明'
      });
    }
  }, [uploadStatus]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const processFile = async (file) => {
    // ファイルタイプチェック
    if (!file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setUploadMessage('CSVファイルを選択してください');
      return;
    }

    try {
      setUploadStatus(null);
      const result = await handleFileUpload(file);
      setUploadStatus('success');
      setUploadMessage(`${result.itemCount}件の単価データを正常に取り込みました`);
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error.message || 'ファイルの処理中にエラーが発生しました');
    }
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/data/工事単価マスターCSVサンプル.csv';
    link.download = '工事単価マスターテンプレート.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadDefaultData = () => {
    try {
      const success = loadDefaultPriceMaster();
      if (success) {
        setUploadStatus('success');
        setUploadMessage('デフォルト価格マスターデータ（依頼項目含む）を読み込みました');
      } else {
        setUploadStatus('error');
        setUploadMessage('データの読み込みに失敗しました');
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('データの読み込み中にエラーが発生しました');
    }
  };

  const countItems = (data) => {
    let count = 0;
    count += data.土工事?.length || 0;
    Object.values(data.植栽工事 || {}).forEach(items => count += items.length);
    Object.values(data.外構工事 || {}).forEach(items => count += items.length);
    Object.values(data.資材工事 || {}).forEach(items => count += items.length);
    Object.values(data.機械損耗費 || {}).forEach(items => count += items.length);
    Object.values(data.その他工事 || {}).forEach(items => count += items.length);
    return count;
  };

  return (
    <Container>
      <Header>
        <h1>工事単価マスターデータ取り込み</h1>
        <p>
          造園工事の標準単価データをCSVファイルから一括で取り込むことができます。
          取り込んだデータは見積作成時に自動的に適用されます。
        </p>
      </Header>

      <UploadSection>
        <UploadArea
          className={isDragging ? 'dragging' : ''}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <Upload />
          <h3>CSVファイルをドラッグ＆ドロップ</h3>
          <p>または</p>
          <Button primary>
            ファイルを選択
          </Button>
          <HiddenInput
            id="file-input"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
          />
        </UploadArea>

        {uploadStatus && (
          <StatusMessage className={uploadStatus}>
            {uploadStatus === 'success' ? <CheckCircle /> : <AlertCircle />}
            {uploadMessage}
          </StatusMessage>
        )}

        <TemplateSection>
          <h3>テンプレートファイル</h3>
          <p>
            単価データの入力にはテンプレートファイルをご利用ください。
            必要な項目と形式が含まれています。
          </p>
          <Button onClick={downloadTemplate}>
            <Download size={16} />
            テンプレートをダウンロード
          </Button>
        </TemplateSection>

        <TemplateSection>
          <h3>サンプルデータ読み込み</h3>
          <p>
            依頼項目を含む標準的な価格マスターデータをすぐに利用できます。
            <br />
            <strong>追加項目：</strong>石積み（面積み・崩れ積み・ロックガーデン）、石貼り、三和土舗装、単粒砕石敷きならし（A・Bランク）、防草シート（A・Bランク）、機械損耗費（グリーン車・小型整地車両・転圧機・モルタルミキサー）
          </p>
          <Button onClick={loadDefaultData} primary>
            <FileText size={16} />
            デフォルトデータを読み込み
          </Button>
        </TemplateSection>
      </UploadSection>

      {currentData && (
        <CurrentDataSection>
          <h2>現在の単価マスターデータ</h2>
          <DataInfo>
            <div className="info-card">
              <h4>登録項目数</h4>
              <p>{countItems(currentData.data)}件</p>
            </div>
            <div className="info-card">
              <h4>最終更新日時</h4>
              <p style={{ fontSize: '16px' }}>{currentData.updatedAt}</p>
            </div>
            <div className="info-card">
              <h4>カテゴリー数</h4>
              <p>6種類</p>
            </div>
          </DataInfo>
        </CurrentDataSection>
      )}
    </Container>
  );
};

export default PriceMasterUpload;