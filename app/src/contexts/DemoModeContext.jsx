/**
 * デモモードコンテキスト
 * テストユーザー向けのデモ環境管理
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const DemoModeContext = createContext({});

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};

// デモユーザーデータ
const DEMO_USERS = {
  manager: {
    id: 'demo-manager-001',
    email: 'demo@garden-dx.com',
    role: 'manager',
    company: '緑化工業株式会社',
    name: '田中 太郎',
    user_metadata: {
      role: 'manager',
      company_name: '緑化工業株式会社',
      full_name: '田中 太郎'
    }
  },
  employee: {
    id: 'demo-employee-001',
    email: 'staff@garden-dx.com',
    role: 'employee',
    company: '緑化工業株式会社',
    name: '佐藤 花子',
    user_metadata: {
      role: 'employee',
      company_name: '緑化工業株式会社',
      full_name: '佐藤 花子'
    }
  }
};

// サンプルデータ
export const DEMO_DATA = {
  companies: [
    {
      id: 'demo-company-001',
      name: '緑化工業株式会社',
      address: '東京都渋谷区神宮前1-1-1',
      phone: '03-1234-5678',
      email: 'info@garden-dx.com',
      created_at: '2024-01-01'
    }
  ],
  clients: [
    {
      id: 'demo-client-001',
      name: '山田花子',
      company: '株式会社ガーデンホーム',
      email: 'yamada@gardenhome.jp',
      phone: '090-1234-5678',
      address: '東京都世田谷区駒沢2-2-2',
      created_at: '2024-01-15'
    },
    {
      id: 'demo-client-002',
      name: '鈴木一郎',
      company: '鈴木建設',
      email: 'suzuki@suzukikensetsu.co.jp',
      phone: '090-8765-4321',
      address: '神奈川県横浜市青葉区美しが丘3-3-3',
      created_at: '2024-02-01'
    }
  ],
  projects: [
    {
      id: 'demo-project-001',
      client_id: 'demo-client-001',
      name: '駒沢公園前庭園リニューアル工事',
      description: '既存庭園の全面リニューアル。植栽、石組み、水景を含む総合工事',
      status: 'in_progress',
      start_date: '2024-03-01',
      end_date: '2024-04-30',
      budget: 2500000,
      location: '東京都世田谷区駒沢2-2-2',
      created_at: '2024-02-15'
    },
    {
      id: 'demo-project-002',
      client_id: 'demo-client-002',
      name: '横浜モデルハウス外構工事',
      description: 'モデルハウスのエントランス庭園設計・施工',
      status: 'planning',
      start_date: '2024-05-15',
      end_date: '2024-06-30',
      budget: 1800000,
      location: '神奈川県横浜市青葉区美しが丘3-3-3',
      created_at: '2024-03-01'
    }
  ],
  estimates: [
    {
      id: 'demo-estimate-001',
      project_id: 'demo-project-001',
      client_id: 'demo-client-001',
      title: '駒沢公園前庭園リニューアル工事見積書',
      status: 'approved',
      total_amount: 2500000,
      tax_amount: 250000,
      grand_total: 2750000,
      valid_until: '2024-03-31',
      items: [
        {
          category: '植栽工事',
          name: 'クロマツ H3.0m',
          quantity: 3,
          unit: '本',
          unit_price: 35000,
          amount: 105000
        },
        {
          category: '植栽工事',
          name: 'モミジ H2.5m',
          quantity: 5,
          unit: '本',
          unit_price: 25000,
          amount: 125000
        },
        {
          category: '石工事',
          name: '庭石据付（1t程度）',
          quantity: 8,
          unit: '個',
          unit_price: 45000,
          amount: 360000
        }
      ],
      created_at: '2024-02-20',
      updated_at: '2024-02-25'
    }
  ]
};

export const DemoModeProvider = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoUser, setDemoUser] = useState(null);
  const [demoData, setDemoData] = useState(DEMO_DATA);

  // デモモード初期化
  useEffect(() => {
    // 環境変数またはローカルストレージでデモモード判定
    const isDemo = process.env.REACT_APP_DEMO_MODE === 'true' || 
                   localStorage.getItem('demo_mode') === 'true' ||
                   window.location.hostname.includes('demo');
    
    setIsDemoMode(isDemo);
    
    if (isDemo) {
      console.log('🎭 デモモードが有効になりました');
      // デフォルトでマネージャーユーザーを設定
      setDemoUser(DEMO_USERS.manager);
    }
  }, []);

  // デモモード有効化
  const enableDemoMode = () => {
    setIsDemoMode(true);
    setDemoUser(DEMO_USERS.manager);
    localStorage.setItem('demo_mode', 'true');
    console.log('🎭 デモモードを有効にしました');
  };

  // デモモード無効化
  const disableDemoMode = () => {
    setIsDemoMode(false);
    setDemoUser(null);
    localStorage.removeItem('demo_mode');
    console.log('🔒 デモモードを無効にしました');
  };

  // デモユーザー切り替え
  const switchDemoUser = (userType) => {
    if (DEMO_USERS[userType]) {
      setDemoUser(DEMO_USERS[userType]);
      console.log(`👤 デモユーザーを${userType}に切り替えました`);
    }
  };

  // デモデータ追加
  const addDemoData = (dataType, newData) => {
    setDemoData(prev => ({
      ...prev,
      [dataType]: [...prev[dataType], newData]
    }));
  };

  // デモデータ更新
  const updateDemoData = (dataType, id, updates) => {
    setDemoData(prev => ({
      ...prev,
      [dataType]: prev[dataType].map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  };

  // デモデータ削除
  const deleteDemoData = (dataType, id) => {
    setDemoData(prev => ({
      ...prev,
      [dataType]: prev[dataType].filter(item => item.id !== id)
    }));
  };

  // デモ用API呼び出しシミュレーション
  const simulateApiCall = async (operation, delay = 500) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`🎭 デモAPI呼び出し: ${operation}`);
        resolve({ success: true, message: `${operation}が完了しました（デモ）` });
      }, delay);
    });
  };

  const value = {
    // 状態
    isDemoMode,
    demoUser,
    demoData,
    
    // デモモード制御
    enableDemoMode,
    disableDemoMode,
    switchDemoUser,
    
    // データ操作
    addDemoData,
    updateDemoData,
    deleteDemoData,
    
    // ユーティリティ
    simulateApiCall,
    
    // デモユーザー情報
    availableUsers: DEMO_USERS
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
};

export default DemoModeProvider;