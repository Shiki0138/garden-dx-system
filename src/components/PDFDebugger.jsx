/**
 * PDF生成デバッグコンポーネント
 * 開発環境での詳細デバッグ情報表示
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Bug, 
  Monitor, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react';

import { validateJapaneseFont } from '../utils/pdfFontManager';
import { getPDFPerformanceStats } from '../utils/pdfPerformanceOptimizer';
import { globalMemoryMonitor } from '../utils/memoryMonitor';

const DebugContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
  background: #1a1a1a;
  color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  overflow: hidden;
  
  @media (max-width: 768px) {
    width: 90%;
    right: 5%;
    top: 10px;
  }
`;

const DebugHeader = styled.div`
  background: #2d2d2d;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #404040;
`;

const DebugTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  color: #00ff88;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: #404040;
  }
`;

const DebugContent = styled.div`
  max-height: calc(80vh - 60px);
  overflow-y: auto;
  padding: 16px;
`;

const SectionContainer = styled.div`
  margin-bottom: 16px;
  border: 1px solid #404040;
  border-radius: 8px;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  background: #2a2a2a;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  
  &:hover {
    background: #333333;
  }
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  
  &.success { color: #00ff88; }
  &.warning { color: #ffaa00; }
  &.error { color: #ff4444; }
  &.info { color: #4488ff; }
`;

const SectionContent = styled.div`
  padding: 12px;
  background: #1e1e1e;
  border-top: 1px solid #404040;
  display: ${props => props.expanded ? 'block' : 'none'};
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 6px 0;
  padding: 4px 0;
  
  .label {
    color: #cccccc;
  }
  
  .value {
    color: #ffffff;
    font-weight: bold;
    
    &.success { color: #00ff88; }
    &.warning { color: #ffaa00; }
    &.error { color: #ff4444; }
  }
`;

const CodeBlock = styled.pre`
  background: #0a0a0a;
  border: 1px solid #333333;
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
  overflow-x: auto;
  font-size: 11px;
  white-space: pre-wrap;
`;

const ActionButton = styled.button`
  background: #333333;
  border: 1px solid #555555;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin: 4px 4px 4px 0;
  font-size: 11px;
  
  &:hover {
    background: #444444;
  }
  
  &:active {
    background: #222222;
  }
`;

const PDFDebugger = ({ 
  isVisible = false, 
  onClose = () => {},
  pdfData = null,
  generationResult = null 
}) => {
  const [debugInfo, setDebugInfo] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    system: true,
    font: false,
    memory: false,
    performance: false,
    data: false,
    errors: false
  });

  useEffect(() => {
    if (isVisible) {
      collectDebugInfo();
      
      // 定期的な更新
      const interval = setInterval(collectDebugInfo, 2000);
      return () => clearInterval(interval);
    }
  }, [isVisible, pdfData, generationResult]);

  const collectDebugInfo = async () => {
    try {
      const systemInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        onLine: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth
        }
      };

      const fontValidation = validateJapaneseFont();
      const performanceStats = getPDFPerformanceStats();
      const memoryStats = globalMemoryMonitor.getStats();

      setDebugInfo({
        timestamp: new Date().toISOString(),
        system: systemInfo,
        font: fontValidation,
        memory: memoryStats,
        performance: performanceStats,
        pdfData: pdfData ? {
          type: pdfData.type || 'unknown',
          itemCount: pdfData.items ? pdfData.items.length : 0,
          dataSize: JSON.stringify(pdfData).length,
          hasImages: pdfData.items ? pdfData.items.some(item => item.image) : false
        } : null,
        generation: generationResult
      });
    } catch (error) {
      console.error('Failed to collect debug info:', error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('デバッグ情報をクリップボードにコピーしました');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadDebugLog = () => {
    const logData = JSON.stringify(debugInfo, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pdf-debug-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSystemStatus = () => {
    if (!debugInfo.system) return 'info';
    
    const issues = [];
    if (!debugInfo.system.onLine) issues.push('offline');
    if (debugInfo.system.viewport.width < 768) issues.push('mobile');
    
    return issues.length > 0 ? 'warning' : 'success';
  };

  const getFontStatus = () => {
    if (!debugInfo.font) return 'info';
    return debugInfo.font.isValid ? 'success' : 'warning';
  };

  const getMemoryStatus = () => {
    if (!debugInfo.memory?.current) return 'info';
    
    const usage = debugInfo.memory.current.percentage;
    if (usage > 85) return 'error';
    if (usage > 70) return 'warning';
    return 'success';
  };

  if (!isVisible) return null;

  return (
    <DebugContainer>
      <DebugHeader>
        <DebugTitle>
          <Bug size={16} />
          PDF Debug Console
        </DebugTitle>
        <CloseButton onClick={onClose}>
          <X size={16} />
        </CloseButton>
      </DebugHeader>

      <DebugContent>
        {/* システム情報 */}
        <SectionContainer>
          <SectionHeader onClick={() => toggleSection('system')}>
            <SectionTitle className={getSystemStatus()}>
              <Monitor size={14} />
              システム情報
              {getSystemStatus() === 'warning' && <AlertTriangle size={12} />}
              {getSystemStatus() === 'success' && <CheckCircle size={12} />}
            </SectionTitle>
            {expandedSections.system ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </SectionHeader>
          <SectionContent expanded={expandedSections.system}>
            {debugInfo.system && (
              <>
                <StatusRow>
                  <span className="label">ブラウザ:</span>
                  <span className="value">{debugInfo.system.userAgent.split(' ')[0]}</span>
                </StatusRow>
                <StatusRow>
                  <span className="label">プラットフォーム:</span>
                  <span className="value">{debugInfo.system.platform}</span>
                </StatusRow>
                <StatusRow>
                  <span className="label">オンライン:</span>
                  <span className={`value ${debugInfo.system.onLine ? 'success' : 'error'}`}>
                    {debugInfo.system.onLine ? 'Yes' : 'No'}
                  </span>
                </StatusRow>
                <StatusRow>
                  <span className="label">ビューポート:</span>
                  <span className="value">
                    {debugInfo.system.viewport.width} × {debugInfo.system.viewport.height}
                  </span>
                </StatusRow>
              </>
            )}
          </SectionContent>
        </SectionContainer>

        {/* フォント情報 */}
        <SectionContainer>
          <SectionHeader onClick={() => toggleSection('font')}>
            <SectionTitle className={getFontStatus()}>
              <Info size={14} />
              日本語フォント
              {getFontStatus() === 'warning' && <AlertTriangle size={12} />}
              {getFontStatus() === 'success' && <CheckCircle size={12} />}
            </SectionTitle>
            {expandedSections.font ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </SectionHeader>
          <SectionContent expanded={expandedSections.font}>
            {debugInfo.font && (
              <>
                <StatusRow>
                  <span className="label">フォント有効:</span>
                  <span className={`value ${debugInfo.font.isValid ? 'success' : 'error'}`}>
                    {debugInfo.font.isValid ? 'Yes' : 'No'}
                  </span>
                </StatusRow>
                <StatusRow>
                  <span className="label">テスト幅:</span>
                  <span className="value">{debugInfo.font.testWidth}px</span>
                </StatusRow>
                <StatusRow>
                  <span className="label">フォールバック幅:</span>
                  <span className="value">{debugInfo.font.fallbackWidth}px</span>
                </StatusRow>
                <StatusRow>
                  <span className="label">差異:</span>
                  <span className="value">{debugInfo.font.difference}px</span>
                </StatusRow>
              </>
            )}
          </SectionContent>
        </SectionContainer>

        {/* メモリ情報 */}
        <SectionContainer>
          <SectionHeader onClick={() => toggleSection('memory')}>
            <SectionTitle className={getMemoryStatus()}>
              <Monitor size={14} />
              メモリ使用状況
              {getMemoryStatus() === 'error' && <AlertTriangle size={12} />}
              {getMemoryStatus() === 'warning' && <AlertTriangle size={12} />}
              {getMemoryStatus() === 'success' && <CheckCircle size={12} />}
            </SectionTitle>
            {expandedSections.memory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </SectionHeader>
          <SectionContent expanded={expandedSections.memory}>
            {debugInfo.memory?.current && (
              <>
                <StatusRow>
                  <span className="label">使用率:</span>
                  <span className={`value ${getMemoryStatus()}`}>
                    {debugInfo.memory.current.percentage.toFixed(1)}%
                  </span>
                </StatusRow>
                <StatusRow>
                  <span className="label">使用量:</span>
                  <span className="value">
                    {(debugInfo.memory.current.used / 1024 / 1024).toFixed(1)} MB
                  </span>
                </StatusRow>
                <StatusRow>
                  <span className="label">総容量:</span>
                  <span className="value">
                    {(debugInfo.memory.current.total / 1024 / 1024).toFixed(1)} MB
                  </span>
                </StatusRow>
              </>
            )}
          </SectionContent>
        </SectionContainer>

        {/* PDF データ情報 */}
        {debugInfo.pdfData && (
          <SectionContainer>
            <SectionHeader onClick={() => toggleSection('data')}>
              <SectionTitle className="info">
                <Info size={14} />
                PDFデータ情報
              </SectionTitle>
              {expandedSections.data ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </SectionHeader>
            <SectionContent expanded={expandedSections.data}>
              <StatusRow>
                <span className="label">タイプ:</span>
                <span className="value">{debugInfo.pdfData.type}</span>
              </StatusRow>
              <StatusRow>
                <span className="label">アイテム数:</span>
                <span className="value">{debugInfo.pdfData.itemCount}</span>
              </StatusRow>
              <StatusRow>
                <span className="label">データサイズ:</span>
                <span className="value">
                  {(debugInfo.pdfData.dataSize / 1024).toFixed(1)} KB
                </span>
              </StatusRow>
              <StatusRow>
                <span className="label">画像含有:</span>
                <span className={`value ${debugInfo.pdfData.hasImages ? 'warning' : 'success'}`}>
                  {debugInfo.pdfData.hasImages ? 'Yes' : 'No'}
                </span>
              </StatusRow>
            </SectionContent>
          </SectionContainer>
        )}

        {/* 生成結果 */}
        {generationResult && (
          <SectionContainer>
            <SectionHeader onClick={() => toggleSection('generation')}>
              <SectionTitle className={generationResult.success ? 'success' : 'error'}>
                {generationResult.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                PDF生成結果
              </SectionTitle>
              {expandedSections.generation ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </SectionHeader>
            <SectionContent expanded={expandedSections.generation}>
              <StatusRow>
                <span className="label">成功:</span>
                <span className={`value ${generationResult.success ? 'success' : 'error'}`}>
                  {generationResult.success ? 'Yes' : 'No'}
                </span>
              </StatusRow>
              {generationResult.performance && (
                <>
                  <StatusRow>
                    <span className="label">処理時間:</span>
                    <span className="value">
                      {generationResult.performance.duration?.toFixed(2)} ms
                    </span>
                  </StatusRow>
                  <StatusRow>
                    <span className="label">メモリ使用:</span>
                    <span className="value">
                      {generationResult.performance.memoryUsed ? 
                        `${(generationResult.performance.memoryUsed / 1024 / 1024).toFixed(1)} MB` : 
                        'N/A'
                      }
                    </span>
                  </StatusRow>
                </>
              )}
              {generationResult.error && (
                <CodeBlock>
                  {JSON.stringify(generationResult.error, null, 2)}
                </CodeBlock>
              )}
            </SectionContent>
          </SectionContainer>
        )}

        {/* アクション */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #404040' }}>
          <ActionButton onClick={() => copyToClipboard(JSON.stringify(debugInfo, null, 2))}>
            <Copy size={12} style={{ marginRight: '4px' }} />
            コピー
          </ActionButton>
          <ActionButton onClick={downloadDebugLog}>
            <Download size={12} style={{ marginRight: '4px' }} />
            ダウンロード
          </ActionButton>
          <ActionButton onClick={collectDebugInfo}>
            <RefreshCw size={12} style={{ marginRight: '4px' }} />
            更新
          </ActionButton>
        </div>
      </DebugContent>
    </DebugContainer>
  );
};

export default PDFDebugger;