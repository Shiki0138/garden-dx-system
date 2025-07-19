/**
 * 造園業者向けデモガイド - 操作説明とテスト手順
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  HelpCircle, 
  Play, 
  Check, 
  AlertCircle, 
  FileText, 
  Printer, 
  Users, 
  BarChart, 
  X,
  ChevronRight,
  ChevronDown 
} from 'lucide-react';

// 造園業界カラーパレット
const colors = {
  primary: '#1a472a',
  secondary: '#2d5a3d',
  accent: '#4a7c3c',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0284c7',
  background: '#f8fdf9',
  surface: '#ffffff',
  border: '#e5e7eb',
  text: '#1f2937',
  textLight: '#6b7280',
  textWhite: '#ffffff'
};

const GuideContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const GuideModal = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  max-width: 800px;
  max-height: 90vh;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(26, 71, 42, 0.3);
  
  @media (max-width: 768px) {
    max-width: 95vw;
    max-height: 95vh;
    border-radius: 12px;
  }
`;

const Header = styled.div`
  background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
  color: ${colors.textWhite};
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${colors.textWhite};
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const Content = styled.div`
  max-height: calc(90vh - 120px);
  overflow-y: auto;
  padding: 0;
`;

const Section = styled.div`
  border-bottom: 1px solid ${colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const SectionHeader = styled.button`
  width: 100%;
  padding: 20px 24px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 18px;
  font-weight: 600;
  color: ${colors.text};
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(26, 71, 42, 0.05);
  }
`;

const SectionContent = styled.div`
  padding: 0 24px 24px 24px;
  display: ${props => props.isOpen ? 'block' : 'none'};
`;

const StepList = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: step-counter;
`;

const Step = styled.li`
  counter-increment: step-counter;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  &::before {
    content: counter(step-counter);
    background: ${colors.primary};
    color: ${colors.textWhite};
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const StepContent = styled.div`
  flex: 1;
  
  h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: ${colors.text};
  }
  
  p {
    margin: 0 0 8px 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${colors.textLight};
  }
  
  .highlight {
    background: rgba(26, 71, 42, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
    color: ${colors.primary};
  }
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 16px;
`;

const FeatureCard = styled.div`
  background: rgba(26, 71, 42, 0.05);
  border: 1px solid rgba(26, 71, 42, 0.1);
  border-radius: 8px;
  padding: 16px;
  
  h5 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: ${colors.primary};
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.4;
    color: ${colors.textLight};
  }
`;

const Important = styled.div`
  background: rgba(217, 119, 6, 0.1);
  border: 1px solid rgba(217, 119, 6, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  
  .icon {
    color: ${colors.warning};
    margin-right: 8px;
  }
  
  h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: ${colors.warning};
    display: flex;
    align-items: center;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: #92400e;
  }
`;

const DemoGuide = ({ onClose }) => {
  const [openSections, setOpenSections] = useState({
    overview: true,
    features: false,
    testing: false,
    feedback: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <GuideContainer>
      <GuideModal>
        <Header>
          <Title>
            <HelpCircle size={28} />
            庭想システム - 操作ガイド
          </Title>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </Header>
        
        <Content>
          <Section>
            <SectionHeader onClick={() => toggleSection('overview')}>
              <span>🎯 システム概要とテスト目的</span>
              {openSections.overview ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </SectionHeader>
            <SectionContent isOpen={openSections.overview}>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: colors.text, marginBottom: '20px' }}>
                <strong>庭想システム</strong>は造園業者様向けの統合業務管理システムです。
                見積作成から請求書発行まで、業務フロー全体をデジタル化します。
              </p>
              
              <Important>
                <h4>
                  <AlertCircle className="icon" size={20} />
                  このテストの目的
                </h4>
                <p>
                  実際の造園業務に適した機能・画面・操作性になっているかを確認していただき、
                  改善点やご要望をお聞かせください。すべてデモ用データで安全にテストできます。
                </p>
              </Important>
            </SectionContent>
          </Section>

          <Section>
            <SectionHeader onClick={() => toggleSection('features')}>
              <span>⚡ 主要機能の確認ポイント</span>
              {openSections.features ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </SectionHeader>
            <SectionContent isOpen={openSections.features}>
              <FeatureGrid>
                <FeatureCard>
                  <h5>
                    <FileText size={16} />
                    見積作成機能
                  </h5>
                  <p>
                    工事項目の追加・編集、階層構造、数量・単価の計算が造園業務に適しているか確認してください。
                  </p>
                </FeatureCard>
                
                <FeatureCard>
                  <h5>
                    <Printer size={16} />
                    PDF出力機能
                  </h5>
                  <p>
                    実際の見積書・請求書として顧客に提示できる品質と内容になっているか確認してください。
                  </p>
                </FeatureCard>
                
                <FeatureCard>
                  <h5>
                    <Users size={16} />
                    権限管理機能
                  </h5>
                  <p>
                    オーナーと現場監督で適切に権限分離されているか、利益情報の表示制御を確認してください。
                  </p>
                </FeatureCard>
                
                <FeatureCard>
                  <h5>
                    <BarChart size={16} />
                    収益性分析
                  </h5>
                  <p>
                    利益率・収益情報の表示が経営判断に役立つ内容になっているか確認してください。
                  </p>
                </FeatureCard>
              </FeatureGrid>
            </SectionContent>
          </Section>

          <Section>
            <SectionHeader onClick={() => toggleSection('testing')}>
              <span>🧪 テスト手順（推奨）</span>
              {openSections.testing ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </SectionHeader>
            <SectionContent isOpen={openSections.testing}>
              <StepList>
                <Step>
                  <StepContent>
                    <h4>ログイン権限のテスト</h4>
                    <p>
                      画面上部の<span className="highlight">オーナー</span>と<span className="highlight">現場監督</span>ボタンを切り替えて、
                      それぞれの権限で画面表示が適切に変わることを確認してください。
                    </p>
                  </StepContent>
                </Step>
                
                <Step>
                  <StepContent>
                    <h4>見積作成画面の確認</h4>
                    <p>
                      <span className="highlight">📝 見積作成</span>ボタンから見積画面を開き、
                      デモデータ（個人邸庭園リニューアル工事）の内容を確認してください。
                    </p>
                  </StepContent>
                </Step>
                
                <Step>
                  <StepContent>
                    <h4>明細項目の編集テスト</h4>
                    <p>
                      <span className="highlight">+ 明細追加</span>ボタンで新しい工事項目を追加し、
                      数量・単価の変更、項目の並び替えなどを実際に操作してください。
                    </p>
                  </StepContent>
                </Step>
                
                <Step>
                  <StepContent>
                    <h4>PDF出力テスト</h4>
                    <p>
                      <span className="highlight">PDF出力</span>ボタンで見積書を生成し、
                      実際の業務で使用できる品質・レイアウトになっているか確認してください。
                    </p>
                  </StepContent>
                </Step>
                
                <Step>
                  <StepContent>
                    <h4>スマートフォン対応確認</h4>
                    <p>
                      スマートフォンでアクセスして、現場での使いやすさ、
                      ボタンサイズ、画面レイアウトが適切かご確認ください。
                    </p>
                  </StepContent>
                </Step>
              </StepList>
            </SectionContent>
          </Section>

          <Section>
            <SectionHeader onClick={() => toggleSection('feedback')}>
              <span>💬 フィードバックのお願い</span>
              {openSections.feedback ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </SectionHeader>
            <SectionContent isOpen={openSections.feedback}>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: colors.text, marginBottom: '20px' }}>
                以下の観点でフィードバックをいただけると大変助かります：
              </p>
              
              <StepList>
                <Step>
                  <StepContent>
                    <h4>業界適合性</h4>
                    <p>
                      造園業特有の工事項目、専門用語、単位、計算方法が適切に対応できているか
                    </p>
                  </StepContent>
                </Step>
                
                <Step>
                  <StepContent>
                    <h4>操作性・使いやすさ</h4>
                    <p>
                      日常業務で実際に使いたいと思える操作感、画面構成になっているか
                    </p>
                  </StepContent>
                </Step>
                
                <Step>
                  <StepContent>
                    <h4>追加機能のご要望</h4>
                    <p>
                      「こんな機能があったら便利」「この項目も追加してほしい」などのアイデア
                    </p>
                  </StepContent>
                </Step>
                
                <Step>
                  <StepContent>
                    <h4>改善点・問題点</h4>
                    <p>
                      使いにくい部分、分かりにくい表示、エラーや不具合があれば詳しく教えてください
                    </p>
                  </StepContent>
                </Step>
              </StepList>
              
              <Important>
                <h4>
                  <Check className="icon" size={20} />
                  テスト完了後
                </h4>
                <p>
                  ご意見・ご要望をまとめて開発チームにお伝えください。
                  いただいたフィードバックを元に、より実用的なシステムに改善いたします。
                </p>
              </Important>
            </SectionContent>
          </Section>
        </Content>
      </GuideModal>
    </GuideContainer>
  );
};

export default DemoGuide;