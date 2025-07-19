/**
 * デモ用サンプルデータ - 造園業者向け実用的データセット
 * Phase 1 テスト用：オーナー・現場監督の確認項目を網羅
 */

// 造園業界標準の工事項目データ
export const DEMO_WORK_CATEGORIES = [
  {
    id: 'landscape_design',
    name: '造園設計・計画',
    items: [
      { name: '現地調査・測量', unit: '式', unit_price: 30000, category: 'design' },
      { name: '造園設計図作成', unit: '式', unit_price: 80000, category: 'design' },
      { name: '植栽計画書作成', unit: '式', unit_price: 25000, category: 'design' },
    ]
  },
  {
    id: 'earthwork',
    name: '土工事・基盤整備',
    items: [
      { name: '表土剥ぎ取り', unit: 'm²', unit_price: 800, category: 'earthwork' },
      { name: '残土処分', unit: 'm³', unit_price: 3500, category: 'earthwork' },
      { name: '客土搬入', unit: 'm³', unit_price: 4200, category: 'earthwork' },
      { name: '整地・転圧', unit: 'm²', unit_price: 600, category: 'earthwork' },
    ]
  },
  {
    id: 'planting',
    name: '植栽工事',
    items: [
      { name: 'ヤマボウシ（H=3.0m）', unit: '本', unit_price: 35000, category: 'tree' },
      { name: 'モミジ（H=2.5m）', unit: '本', unit_price: 28000, category: 'tree' },
      { name: 'ツツジ（H=0.8m）', unit: '本', unit_price: 3500, category: 'shrub' },
      { name: 'シバザクラ', unit: 'ポット', unit_price: 400, category: 'flower' },
      { name: '芝張り（高麗芝）', unit: 'm²', unit_price: 1200, category: 'grass' },
    ]
  },
  {
    id: 'hardscape',
    name: 'エクステリア工事',
    items: [
      { name: '自然石敷設', unit: 'm²', unit_price: 8500, category: 'stone' },
      { name: 'レンガ歩道', unit: 'm²', unit_price: 6800, category: 'brick' },
      { name: '木製デッキ', unit: 'm²', unit_price: 12000, category: 'deck' },
      { name: '竹垣設置', unit: 'm', unit_price: 15000, category: 'fence' },
    ]
  },
  {
    id: 'water_feature',
    name: '水景・irrigation',
    items: [
      { name: '池造成（防水シート込）', unit: 'm²', unit_price: 18000, category: 'pond' },
      { name: '散水設備設置', unit: '式', unit_price: 120000, category: 'irrigation' },
      { name: '照明設備', unit: '式', unit_price: 85000, category: 'lighting' },
    ]
  }
];

// デモ用顧客データ
export const DEMO_CUSTOMERS = [
  {
    id: 'customer_001',
    name: '田中太郎',
    company: '田中工務店',
    address: '東京都世田谷区用賀3-15-8',
    phone: '03-1234-5678',
    email: 'tanaka@example.com',
    project_count: 12,
    last_project: '2024-06-15'
  },
  {
    id: 'customer_002', 
    name: '山田花子',
    company: '個人邸',
    address: '神奈川県川崎市高津区溝口2-8-12',
    phone: '044-987-6543',
    email: 'yamada@example.com',
    project_count: 3,
    last_project: '2024-07-02'
  },
  {
    id: 'customer_003',
    name: '佐藤商事',
    company: '佐藤商事株式会社',
    address: '千葉県市川市八幡2-2-1',
    phone: '047-456-7890',
    email: 'sato@example.com',
    project_count: 8,
    last_project: '2024-05-20'
  }
];

// デモ用見積データ
export const DEMO_ESTIMATES = [
  {
    estimate_id: 'demo-est-001',
    estimate_number: 'EST-2024-001',
    estimate_name: '個人邸庭園リニューアル工事',
    client_name: '田中太郎',
    client_company: '田中工務店',
    site_address: '東京都世田谷区用賀3-15-8',
    project_period: '着工：2024年8月15日～完工：2024年9月30日',
    notes: '既存庭園の全面リニューアル。和風庭園をモダンな洋風庭園に変更。',
    adjustment_amount: -50000,
    total_amount: 2850000,
    created_at: '2024-07-10T09:00:00Z',
    status: 'pending',
    items: [
      {
        id: 'item_001',
        item_description: '設計・調査費',
        item_type: 'header',
        level: 0,
        quantity: null,
        unit: null,
        unit_price: null,
        amount: null,
        sort_order: 0,
        is_visible_to_customer: true
      },
      {
        id: 'item_002', 
        item_description: '現地調査・測量',
        item_type: 'item',
        level: 1,
        quantity: 1,
        unit: '式',
        unit_price: 30000,
        amount: 30000,
        sort_order: 1,
        is_visible_to_customer: true
      },
      {
        id: 'item_003',
        item_description: '造園設計図作成',
        item_type: 'item', 
        level: 1,
        quantity: 1,
        unit: '式',
        unit_price: 80000,
        amount: 80000,
        sort_order: 2,
        is_visible_to_customer: true
      },
      {
        id: 'item_004',
        item_description: '土工事',
        item_type: 'header',
        level: 0,
        quantity: null,
        unit: null,
        unit_price: null,
        amount: null,
        sort_order: 3,
        is_visible_to_customer: true
      },
      {
        id: 'item_005',
        item_description: '表土剥ぎ取り',
        item_type: 'item',
        level: 1,
        quantity: 150,
        unit: 'm²',
        unit_price: 800,
        amount: 120000,
        sort_order: 4,
        is_visible_to_customer: true
      },
      {
        id: 'item_006',
        item_description: '残土処分',
        item_type: 'item',
        level: 1,
        quantity: 45,
        unit: 'm³',
        unit_price: 3500,
        amount: 157500,
        sort_order: 5,
        is_visible_to_customer: true
      },
      {
        id: 'item_007',
        item_description: '植栽工事',
        item_type: 'header',
        level: 0,
        quantity: null,
        unit: null,
        unit_price: null,
        amount: null,
        sort_order: 6,
        is_visible_to_customer: true
      },
      {
        id: 'item_008',
        item_description: 'ヤマボウシ（H=3.0m）',
        item_type: 'item',
        level: 1,
        quantity: 3,
        unit: '本',
        unit_price: 35000,
        amount: 105000,
        sort_order: 7,
        is_visible_to_customer: true
      },
      {
        id: 'item_009',
        item_description: 'モミジ（H=2.5m）',
        item_type: 'item',
        level: 1,
        quantity: 2,
        unit: '本',
        unit_price: 28000,
        amount: 56000,
        sort_order: 8,
        is_visible_to_customer: true
      },
      {
        id: 'item_010',
        item_description: 'ツツジ（H=0.8m）',
        item_type: 'item',
        level: 1,
        quantity: 20,
        unit: '本',
        unit_price: 3500,
        amount: 70000,
        sort_order: 9,
        is_visible_to_customer: true
      },
      {
        id: 'item_011',
        item_description: '芝張り（高麗芝）',
        item_type: 'item',
        level: 1,
        quantity: 80,
        unit: 'm²',
        unit_price: 1200,
        amount: 96000,
        sort_order: 10,
        is_visible_to_customer: true
      },
      {
        id: 'item_012',
        item_description: 'エクステリア工事',
        item_type: 'header',
        level: 0,
        quantity: null,
        unit: null,
        unit_price: null,
        amount: null,
        sort_order: 11,
        is_visible_to_customer: true
      },
      {
        id: 'item_013',
        item_description: '自然石敷設',
        item_type: 'item',
        level: 1,
        quantity: 25,
        unit: 'm²',
        unit_price: 8500,
        amount: 212500,
        sort_order: 12,
        is_visible_to_customer: true
      },
      {
        id: 'item_014',
        item_description: '木製デッキ',
        item_type: 'item',
        level: 1,
        quantity: 12,
        unit: 'm²', 
        unit_price: 12000,
        amount: 144000,
        sort_order: 13,
        is_visible_to_customer: true
      },
      {
        id: 'item_015',
        item_description: '竹垣設置',
        item_type: 'item',
        level: 1,
        quantity: 15,
        unit: 'm',
        unit_price: 15000,
        amount: 225000,
        sort_order: 14,
        is_visible_to_customer: true
      },
      {
        id: 'item_016',
        item_description: '水景・設備工事',
        item_type: 'header',
        level: 0,
        quantity: null,
        unit: null,
        unit_price: null,
        amount: null,
        sort_order: 15,
        is_visible_to_customer: true
      },
      {
        id: 'item_017',
        item_description: '散水設備設置',
        item_type: 'item',
        level: 1,
        quantity: 1,
        unit: '式',
        unit_price: 120000,
        amount: 120000,
        sort_order: 16,
        is_visible_to_customer: true
      },
      {
        id: 'item_018',
        item_description: '照明設備',
        item_type: 'item',
        level: 1,
        quantity: 1,
        unit: '式',
        unit_price: 85000,
        amount: 85000,
        sort_order: 17,
        is_visible_to_customer: true
      }
    ]
  },
  {
    estimate_id: 'demo-est-002',
    estimate_number: 'EST-2024-002',
    estimate_name: '小規模メンテナンス工事',
    client_name: '山田花子',
    client_company: '個人邸',
    site_address: '神奈川県川崎市高津区溝口2-8-12',
    project_period: '着工：2024年8月5日～完工：2024年8月10日',
    notes: '既存庭園の部分的メンテナンス。樹木剪定と芝生補修。',
    adjustment_amount: 0,
    total_amount: 180000,
    created_at: '2024-07-12T14:30:00Z',
    status: 'approved',
    items: [
      {
        id: 'item_201',
        item_description: '樹木メンテナンス',
        item_type: 'header',
        level: 0,
        quantity: null,
        unit: null,
        unit_price: null,
        amount: null,
        sort_order: 0,
        is_visible_to_customer: true
      },
      {
        id: 'item_202',
        item_description: '樹木剪定（高木）',
        item_type: 'item',
        level: 1,
        quantity: 5,
        unit: '本',
        unit_price: 12000,
        amount: 60000,
        sort_order: 1,
        is_visible_to_customer: true
      },
      {
        id: 'item_203',
        item_description: '芝生補修',
        item_type: 'item',
        level: 1,
        quantity: 25,
        unit: 'm²',
        unit_price: 1200,
        amount: 30000,
        sort_order: 2,
        is_visible_to_customer: true
      },
      {
        id: 'item_204',
        item_description: '雑草除去・薬剤散布',
        item_type: 'item',
        level: 1,
        quantity: 100,
        unit: 'm²',
        unit_price: 900,
        amount: 90000,
        sort_order: 3,
        is_visible_to_customer: true
      }
    ]
  }
];

// デモ用請求書データ
export const DEMO_INVOICES = [
  {
    invoice_id: 'demo-inv-001',
    invoice_number: 'INV-2024-001',
    estimate_id: 'demo-est-001',
    invoice_date: '2024-09-30',
    due_date: '2024-10-30',
    client_name: '田中太郎',
    client_company: '田中工務店',
    client_address: '東京都世田谷区用賀3-15-8',
    project_name: '個人邸庭園リニューアル工事',
    total_amount: 2850000,
    paid_amount: 0,
    status: 'pending',
    notes: '工事完了につき請求させていただきます。',
    created_at: '2024-09-30T17:00:00Z'
  },
  {
    invoice_id: 'demo-inv-002',
    invoice_number: 'INV-2024-002',
    estimate_id: 'demo-est-002',
    invoice_date: '2024-08-10',
    due_date: '2024-09-10',
    client_name: '山田花子',
    client_company: '個人邸',
    client_address: '神奈川県川崎市高津区溝口2-8-12',
    project_name: '小規模メンテナンス工事',
    total_amount: 180000,
    paid_amount: 180000,
    status: 'paid',
    notes: 'お支払いありがとうございました。',
    created_at: '2024-08-10T16:00:00Z'
  }
];

// デモ用プロジェクトデータ
export const DEMO_PROJECTS = [
  {
    project_id: 'demo-proj-001',
    estimate_id: 'demo-est-001',
    project_name: '個人邸庭園リニューアル工事',
    client_name: '田中太郎',
    start_date: '2024-08-15',
    end_date: '2024-09-30',
    progress: 75,
    status: 'in_progress',
    supervisor: '現場監督：佐藤一郎',
    tasks: [
      { name: '現地調査・測量', status: 'completed', start_date: '2024-08-15', end_date: '2024-08-16' },
      { name: '既存庭園撤去', status: 'completed', start_date: '2024-08-17', end_date: '2024-08-20' },
      { name: '土工事', status: 'completed', start_date: '2024-08-21', end_date: '2024-08-28' },
      { name: '植栽工事', status: 'in_progress', start_date: '2024-08-29', end_date: '2024-09-10' },
      { name: 'エクステリア工事', status: 'pending', start_date: '2024-09-11', end_date: '2024-09-25' },
      { name: '設備工事・仕上げ', status: 'pending', start_date: '2024-09-26', end_date: '2024-09-30' }
    ]
  },
  {
    project_id: 'demo-proj-002',
    estimate_id: 'demo-est-002', 
    project_name: '小規模メンテナンス工事',
    client_name: '山田花子',
    start_date: '2024-08-05',
    end_date: '2024-08-10',
    progress: 100,
    status: 'completed',
    supervisor: '現場監督：田中次郎',
    tasks: [
      { name: '樹木剪定', status: 'completed', start_date: '2024-08-05', end_date: '2024-08-07' },
      { name: '芝生補修', status: 'completed', start_date: '2024-08-08', end_date: '2024-08-09' },
      { name: '雑草除去・薬剤散布', status: 'completed', start_date: '2024-08-09', end_date: '2024-08-10' }
    ]
  }
];

// デモ用スタッフデータ（権限テスト用）
export const DEMO_STAFF = [
  {
    user_id: 'demo-owner-001',
    name: '田中社長',
    role: 'owner',
    email: 'owner@garden-dx.example.com',
    permissions: ['view_profit', 'create_invoice', 'manage_staff', 'view_all_projects'],
    last_login: '2024-07-15T08:30:00Z'
  },
  {
    user_id: 'demo-supervisor-001',
    name: '佐藤一郎',
    role: 'supervisor',
    email: 'sato@garden-dx.example.com',
    permissions: ['create_estimate', 'manage_project', 'view_schedule'],
    last_login: '2024-07-15T07:45:00Z'
  },
  {
    user_id: 'demo-supervisor-002',
    name: '田中次郎',
    role: 'supervisor',
    email: 'tanaka-j@garden-dx.example.com',
    permissions: ['create_estimate', 'manage_project', 'view_schedule'],
    last_login: '2024-07-14T17:20:00Z'
  }
];

// 造園業界用語集（検索・入力補助用）
export const LANDSCAPING_TERMINOLOGY = {
  plants: [
    'ヤマボウシ', 'モミジ', 'ケヤキ', 'イロハモミジ', 'ツツジ', 'サツキ',
    'シャクナゲ', 'アジサイ', 'シバザクラ', 'ヒメシャラ', 'エゴノキ'
  ],
  materials: [
    '自然石', 'レンガ', '化粧砂利', '真砂土', '腐葉土', '堆肥',
    '防草シート', '植栽マット', '竹垣', '木製デッキ', 'タイル'
  ],
  tools: [
    '散水設備', 'ドリップチューブ', 'タイマー散水', '照明設備',
    'ソーラーライト', '防犯カメラ', '温度センサー'
  ],
  units: [
    '本', '株', 'ポット', 'm²', 'm³', 'm', '式', 'セット', 'kg', 'L'
  ]
};

// デモデータ取得関数
export const getDemoEstimate = (estimateId = 'demo-est-001') => {
  const estimate = DEMO_ESTIMATES.find(est => est.estimate_id === estimateId);
  return estimate || DEMO_ESTIMATES[0];
};

export const getDemoEstimates = () => DEMO_ESTIMATES;

export const getDemoInvoices = () => DEMO_INVOICES;

export const getDemoProjects = () => DEMO_PROJECTS;

export const getDemoCustomers = () => DEMO_CUSTOMERS;

export const getDemoStaff = () => DEMO_STAFF;

export const getWorkCategories = () => DEMO_WORK_CATEGORIES;

// ランダムデモデータ生成
export const generateRandomDemoEstimate = () => {
  const customers = DEMO_CUSTOMERS;
  const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
  
  const now = new Date();
  const estimateId = `demo-est-${now.getTime()}`;
  
  return {
    estimate_id: estimateId,
    estimate_number: `EST-2024-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
    estimate_name: '新規見積プロジェクト',
    client_name: randomCustomer.name,
    client_company: randomCustomer.company,
    site_address: randomCustomer.address,
    project_period: `着工：${now.toISOString().split('T')[0]}～完工：未定`,
    notes: 'お客様との打ち合わせ内容を記載してください。',
    adjustment_amount: 0,
    total_amount: 0,
    created_at: now.toISOString(),
    status: 'draft',
    items: []
  };
};