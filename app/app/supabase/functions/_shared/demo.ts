/**
 * デモモード検出・処理ユーティリティ
 * テストユーザー向けのデモ環境対応
 */

export interface DemoConfig {
  isDemo: boolean;
  companyId?: string;
  userId?: string;
  features?: {
    readOnly?: boolean;
    limitedData?: boolean;
    watermark?: boolean;
  };
}

export interface DemoDataItem {
  id: string;
  name: string;
  code: string;
  unit: string;
  unit_price: number;
  purchase_price: number;
  markup_rate: number;
  adjustment_amount: number;
}

export interface DemoDataCategory {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  items: DemoDataItem[];
}

export interface DemoEstimateItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

export interface DemoEstimate {
  id: string;
  estimate_number: string;
  customer_name: string;
  project_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: DemoEstimateItem[];
}

export interface DemoTask {
  id: string;
  name: string;
  status: string;
  progress: number;
  start_date: string;
  end_date: string;
}

export interface DemoProject {
  id: string;
  name: string;
  code: string;
  status: string;
  start_date: string;
  end_date: string;
  progress: number;
  tasks: DemoTask[];
}

export interface DemoInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  tax_amount: number;
  status: string;
  paid_amount: number;
}

export interface DemoCompany {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  settings: {
    tax_rate: number;
    fiscal_year_start: number;
    invoice_prefix: string;
    estimate_validity_days: number;
  };
}

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company_id: string;
}

export interface DemoDataStructure {
  company: DemoCompany;
  user: DemoUser;
  estimates: DemoEstimate[];
  priceMaster: {
    categories: DemoDataCategory[];
  };
  projects: DemoProject[];
  invoices: DemoInvoice[];
}

/**
 * デモモード検出
 * 環境変数、ヘッダー、URLパラメータから判定
 */
export function detectDemoMode(req: Request): DemoConfig {
  // 環境変数チェック
  const envDemo = Deno.env.get('DEMO_MODE') === 'true';
  
  // ヘッダーチェック
  const headerDemo = req.headers.get('X-Demo-Mode') === 'true';
  
  // URLパラメータチェック
  const url = new URL(req.url);
  const urlDemo = url.searchParams.get('demo') === 'true';
  
  // リファラーチェック（デモサイトからのアクセス）
  const referer = req.headers.get('referer') || '';
  const refererDemo = referer.includes('demo.') || referer.includes('-demo.');
  
  // デモモード判定
  const isDemo = envDemo || headerDemo || urlDemo || refererDemo;
  
  // デモ設定
  if (isDemo) {
    return {
      isDemo: true,
      companyId: 'demo-company-001',
      userId: 'demo-user-001',
      features: {
        readOnly: true,
        limitedData: true,
        watermark: true
      }
    };
  }
  
  return { isDemo: false };
}

/**
 * デモデータ生成ヘルパー
 */
export const demoData = {
  // デモ会社情報
  company: {
    id: 'demo-company-001',
    name: 'デモ造園株式会社',
    code: 'DEMO001',
    address: '東京都渋谷区デモ町1-2-3',
    phone: '03-0000-0000',
    email: 'demo@garden-dx.com',
    settings: {
      tax_rate: 0.10,
      fiscal_year_start: 4,
      invoice_prefix: 'DEMO',
      estimate_validity_days: 30
    }
  },
  
  // デモユーザー情報
  user: {
    id: 'demo-user-001',
    email: 'demo@garden-dx.com',
    name: 'デモ太郎',
    role: 'admin',
    company_id: 'demo-company-001'
  },
  
  // デモ見積データ
  estimates: [
    {
      id: 'demo-estimate-001',
      estimate_number: 'DEMO-2025-001',
      customer_name: 'サンプル顧客A',
      project_name: '庭園リニューアル工事',
      total_amount: 1500000,
      status: 'sent',
      created_at: new Date().toISOString(),
      items: [
        {
          id: 'demo-item-001',
          name: '植栽工事',
          quantity: 1,
          unit: '式',
          unit_price: 800000,
          amount: 800000
        },
        {
          id: 'demo-item-002',
          name: '石組み工事',
          quantity: 1,
          unit: '式',
          unit_price: 700000,
          amount: 700000
        }
      ]
    },
    {
      id: 'demo-estimate-002',
      estimate_number: 'DEMO-2025-002',
      customer_name: 'サンプル顧客B',
      project_name: '外構工事',
      total_amount: 2200000,
      status: 'draft',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      items: [
        {
          id: 'demo-item-003',
          name: 'フェンス設置',
          quantity: 50,
          unit: 'm',
          unit_price: 20000,
          amount: 1000000
        },
        {
          id: 'demo-item-004',
          name: '門扉設置',
          quantity: 1,
          unit: '基',
          unit_price: 1200000,
          amount: 1200000
        }
      ]
    }
  ],
  
  // デモ単価マスターデータ
  priceMaster: {
    categories: [
      {
        id: 'demo-category-001',
        name: '植栽工事',
        code: 'PLANT',
        parent_id: null,
        items: [
          {
            id: 'demo-price-001',
            name: '高木植栽（3m以上）',
            code: 'PLANT-001',
            unit: '本',
            unit_price: 50000,
            purchase_price: 30000,
            markup_rate: 1.5,
            adjustment_amount: 5000
          },
          {
            id: 'demo-price-002',
            name: '低木植栽（1m未満）',
            code: 'PLANT-002',
            unit: '本',
            unit_price: 8000,
            purchase_price: 5000,
            markup_rate: 1.6,
            adjustment_amount: 0
          }
        ]
      },
      {
        id: 'demo-category-002',
        name: '外構工事',
        code: 'EXTERIOR',
        parent_id: null,
        items: [
          {
            id: 'demo-price-003',
            name: 'コンクリート打設',
            code: 'EXT-001',
            unit: '㎡',
            unit_price: 15000,
            purchase_price: 8000,
            markup_rate: 1.8,
            adjustment_amount: 1000
          }
        ]
      }
    ]
  } as { categories: DemoDataCategory[] },
  
  // デモプロジェクトデータ
  projects: [
    {
      id: 'demo-project-001',
      name: '〇〇邸庭園工事',
      code: 'DEMO-PRJ-001',
      status: 'in_progress',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      progress: 45,
      tasks: [
        {
          id: 'demo-task-001',
          name: '現場調査',
          status: 'completed',
          progress: 100,
          start_date: new Date(Date.now() - 7 * 86400000).toISOString(),
          end_date: new Date(Date.now() - 5 * 86400000).toISOString()
        },
        {
          id: 'demo-task-002',
          name: '基礎工事',
          status: 'in_progress',
          progress: 60,
          start_date: new Date(Date.now() - 3 * 86400000).toISOString(),
          end_date: new Date(Date.now() + 4 * 86400000).toISOString()
        }
      ]
    }
  ],
  
  // デモ請求書データ
  invoices: [
    {
      id: 'demo-invoice-001',
      invoice_number: 'DEMO-INV-2025-001',
      customer_name: 'サンプル顧客A',
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      total_amount: 1650000,
      tax_amount: 150000,
      status: 'sent',
      paid_amount: 0
    }
  ]
};

/**
 * デモモードレスポンス生成
 */
export function createDemoResponse(
  endpoint: string,
  method: string,
  params?: Record<string, unknown>
): Record<string, unknown> {
  // エンドポイント別のデモレスポンス
  switch (endpoint) {
    case 'estimates':
      if (method === 'GET' && params?.id) {
        return demoData.estimates.find(e => e.id === params.id) || demoData.estimates[0];
      }
      return { estimates: demoData.estimates };
      
    case 'price-master':
      return demoData.priceMaster;
      
    case 'projects':
      if (method === 'GET' && params?.id) {
        return demoData.projects.find(p => p.id === params.id) || demoData.projects[0];
      }
      return { projects: demoData.projects };
      
    case 'invoices':
      return { invoices: demoData.invoices };
      
    case 'auth':
      return {
        user: demoData.user,
        token: 'demo-jwt-token',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };
      
    case 'companies':
      return demoData.company;
      
    default:
      return {
        demo: true,
        message: 'これはデモデータです',
        timestamp: new Date().toISOString()
      };
  }
}

/**
 * デモモード制限チェック
 */
export function checkDemoRestrictions(
  method: string,
  endpoint: string
): { allowed: boolean; message?: string } {
  // デモモードでは更新系操作を制限
  const readOnlyMethods = ['GET', 'OPTIONS', 'HEAD'];
  
  if (!readOnlyMethods.includes(method)) {
    return {
      allowed: false,
      message: 'デモモードでは参照のみ可能です。データの変更はできません。'
    };
  }
  
  // 特定のエンドポイントへのアクセス制限
  const restrictedEndpoints = ['admin', 'settings', 'backup'];
  if (restrictedEndpoints.some(ep => endpoint.includes(ep))) {
    return {
      allowed: false,
      message: 'デモモードではこの機能は利用できません。'
    };
  }
  
  return { allowed: true };
}

/**
 * デモモードウォーターマーク追加
 */
export function addDemoWatermark(data: Record<string, unknown>): Record<string, unknown> {
  if (typeof data === 'object' && data !== null) {
    return {
      ...data,
      _demo: {
        isDemo: true,
        watermark: 'DEMO VERSION - NOT FOR PRODUCTION USE',
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }
    };
  }
  return data;
}