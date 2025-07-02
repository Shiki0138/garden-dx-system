/**
 * デモモードバナーコンポーネント
 * デモ環境であることをユーザーに明示
 */

import React from 'react';
import { useDemoMode } from '../contexts/DemoModeContext';
import './DemoBanner.css';

const DemoBanner = () => {
  const { isDemoMode, demoUser, switchDemoUser, availableUsers, disableDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <div className="demo-banner">
      <div className="demo-banner-content">
        <div className="demo-banner-left">
          <span className="demo-banner-icon">🎭</span>
          <div className="demo-banner-text">
            <strong>デモモード</strong>
            <span>テスト環境でご利用中です</span>
          </div>
        </div>
        
        <div className="demo-banner-center">
          <div className="demo-user-info">
            <span className="demo-user-label">現在のユーザー:</span>
            <span className="demo-user-name">{demoUser?.name}</span>
            <span className="demo-user-role">({demoUser?.role === 'manager' ? '管理者' : '従業員'})</span>
          </div>
        </div>
        
        <div className="demo-banner-right">
          <div className="demo-controls">
            <select 
              className="demo-user-selector"
              value={demoUser?.role || 'manager'}
              onChange={(e) => switchDemoUser(e.target.value)}
            >
              <option value="manager">管理者 (田中 太郎)</option>
              <option value="employee">従業員 (佐藤 花子)</option>
            </select>
            
            <button 
              className="demo-exit-btn"
              onClick={disableDemoMode}
              title="デモモードを終了"
            >
              終了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;