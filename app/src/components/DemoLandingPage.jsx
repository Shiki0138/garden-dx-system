/**
 * デモ用ランディングページ
 * テストユーザー向けの入口
 */

import React, { useState } from 'react';
import { useDemoMode } from '../contexts/DemoModeContext';
import './DemoLandingPage.css';

const DemoLandingPage = () => {
  const { enableDemoMode, availableUsers } = useDemoMode();
  const [selectedUserType, setSelectedUserType] = useState('manager');

  const handleStartDemo = () => {
    enableDemoMode();
    // デモ開始後に見積ウィザードに遷移
    window.location.href = '/wizard-pro';
  };

  return (
    <div className="demo-landing">
      <div className="demo-landing-container">
        <header className="demo-header">
          <h1 className="demo-title">
            🏡 庭想システム
            <span className="demo-subtitle">造園業向け統合業務管理システム</span>
          </h1>
          <div className="demo-badge">🎭 デモ体験版</div>
        </header>

        <div className="demo-intro">
          <p className="demo-description">
            本システムは造園業界向けに開発された統合業務管理システムです。
            <br />
            見積作成から請求書発行まで、業務を効率化するための機能を体験できます。
          </p>
        </div>

        <div className="demo-features">
          <h3>主な機能</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h4>見積作成</h4>
              <p>豊富なテンプレートから素早く見積を作成</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h4>価格管理</h4>
              <p>仕入価格と掛け率を自由に設定</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h4>PDF出力</h4>
              <p>プロフェッショナルな見積書を生成</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💾</div>
              <h4>データ保存</h4>
              <p>見積データの保存・呼び出し機能</p>
            </div>
          </div>
        </div>

        <div className="demo-user-selection">
          <h3>デモユーザーを選択</h3>
          <div className="user-options">
            <label className={`user-option ${selectedUserType === 'manager' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="userType"
                value="manager"
                checked={selectedUserType === 'manager'}
                onChange={e => setSelectedUserType(e.target.value)}
              />
              <div className="user-info">
                <div className="user-avatar">👤</div>
                <div className="user-details">
                  <strong>管理者（田中 太郎）</strong>
                  <span>緑化工業株式会社</span>
                  <small>全機能アクセス可能</small>
                </div>
              </div>
            </label>

            <label className={`user-option ${selectedUserType === 'employee' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="userType"
                value="employee"
                checked={selectedUserType === 'employee'}
                onChange={e => setSelectedUserType(e.target.value)}
              />
              <div className="user-info">
                <div className="user-avatar">👩</div>
                <div className="user-details">
                  <strong>従業員（佐藤 花子）</strong>
                  <span>緑化工業株式会社</span>
                  <small>基本機能のみ</small>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="demo-actions">
          <button className="demo-start-btn" onClick={handleStartDemo}>
            🚀 デモを開始する
          </button>
          <p className="demo-note">
            ※ デモ環境では実際のデータベースには接続されません。
            <br />
            全ての操作はサンプルデータで行われます。
          </p>
        </div>

        <div className="demo-info">
          <div className="info-section">
            <h4>🎯 対象ユーザー</h4>
            <ul>
              <li>造園業事業者</li>
              <li>外構工事業者</li>
              <li>エクステリア業者</li>
              <li>ランドスケープデザイナー</li>
            </ul>
          </div>

          <div className="info-section">
            <h4>💡 期待効果</h4>
            <ul>
              <li>見積作成時間の大幅短縮</li>
              <li>価格計算ミスの削減</li>
              <li>顧客対応の効率化</li>
              <li>業務の標準化</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoLandingPage;
