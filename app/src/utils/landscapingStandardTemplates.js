/**
 * 造園業界標準テンプレート定義
 * 業界慣習に基づいた標準的な書式・レイアウト・文言テンプレート
 */

// 造園業界標準カテゴリ定義
export const LANDSCAPING_CATEGORIES = {
  PRELIMINARY: {
    id: 'preliminary',
    name: '仮設工事',
    order: 1,
    color: '#757575',
    description: '現場事務所・仮囲い・養生等',
    standardItems: ['現場事務所設置', '仮囲い設置', '養生シート', '仮設電気・水道', '仮設トイレ'],
  },
  EARTHWORK: {
    id: 'earthwork',
    name: '土工事',
    order: 2,
    color: '#8D6E63',
    description: '掘削・盛土・整地等',
    standardItems: ['掘削工事', '盛土工事', '整地工事', '残土処分', '土壌改良'],
  },
  FOUNDATION: {
    id: 'foundation',
    name: '基盤整備',
    order: 3,
    color: '#5D4037',
    description: '路盤・排水・土壌改良等',
    standardItems: ['路盤工事', '排水工事', '暗渠設置', '土壌改良材散布', '防草シート敷設'],
  },
  PLANTING: {
    id: 'planting',
    name: '植栽工事',
    order: 4,
    color: '#2E7D32',
    description: '高木・低木・地被類植栽',
    standardItems: ['高木植栽', '中木植栽', '低木植栽', '地被類植栽', '支柱設置', '客土工事'],
  },
  EXTERIOR: {
    id: 'exterior',
    name: '外構工事',
    order: 5,
    color: '#455A64',
    description: 'フェンス・門扉・車庫等',
    standardItems: ['フェンス工事', '門扉設置', 'カーポート設置', 'ブロック積み', '土留め工事'],
  },
  STONEWORK: {
    id: 'stonework',
    name: '石工事',
    order: 6,
    color: '#616161',
    description: '石積み・石張り・飛石等',
    standardItems: ['石積み工事', '石張り工事', '飛石設置', '景石設置', '砂利敷き'],
  },
  PATHWAY: {
    id: 'pathway',
    name: '園路工事',
    order: 7,
    color: '#795548',
    description: '園路・階段・スロープ等',
    standardItems: ['園路舗装', '階段設置', 'スロープ設置', 'インターロッキング', '洗い出し仕上げ'],
  },
  EQUIPMENT: {
    id: 'equipment',
    name: '設備工事',
    order: 8,
    color: '#607D8B',
    description: '照明・散水・排水設備等',
    standardItems: ['照明設備', '散水設備', '排水設備', '電気配線', '給水配管'],
  },
  OTHER: {
    id: 'other',
    name: 'その他工事',
    order: 9,
    color: '#9E9E9E',
    description: 'その他付帯工事',
    standardItems: [],
  },
  OVERHEAD: {
    id: 'overhead',
    name: '諸経費',
    order: 10,
    color: '#FF6F00',
    description: '現場管理費・一般管理費等',
    standardItems: ['現場管理費', '一般管理費', '安全管理費', '廃棄物処理費', '運搬費'],
  },
};

// 標準単位定義
export const LANDSCAPING_UNITS = {
  PIECE: { symbol: '本', name: '本数', type: 'count' },
  SQUARE_METER: { symbol: 'm2', name: '平米', type: 'area' },
  CUBIC_METER: { symbol: 'm3', name: '立米', type: 'volume' },
  METER: { symbol: 'm', name: 'メートル', type: 'length' },
  SET: { symbol: '式', name: '一式', type: 'set' },
  UNIT: { symbol: '台', name: '台数', type: 'count' },
  ITEM: { symbol: '個', name: '個数', type: 'count' },
  TIME: { symbol: '回', name: '回数', type: 'count' },
  KILOGRAM: { symbol: 'kg', name: 'キログラム', type: 'weight' },
  TON: { symbol: 't', name: 'トン', type: 'weight' },
  DAY: { symbol: '日', name: '日数', type: 'time' },
  HOUR: { symbol: '時間', name: '時間', type: 'time' },
  PERSON: { symbol: '人', name: '人工', type: 'labor' },
};

// 造園業界標準の特記事項テンプレート
export const STANDARD_TERMS_TEMPLATES = {
  general: [
    '上記金額は税込価格です。',
    '見積有効期限は発行日より30日間とします。',
    '天候不良により工期が延長する場合があります。',
    '支払条件：工事完了後、請求書発行より30日以内',
  ],
  planting: [
    '植栽材料は生き物のため、形状・枝ぶり等に多少の違いがあります。',
    '枯れ保証期間は植栽完了日より1年間とします（天災・人災は除く）。',
    '移植などによる根回し期間が必要な場合は別途ご相談します。',
    '植栽時期は樹種により最適期に施工させていただきます。',
  ],
  construction: [
    '既存構造物の撤去費は現地確認後、別途見積いたします。',
    '地中埋設物が発見された場合は別途協議とします。',
    '残土処分費は別途申し受けます。',
    '工事範囲外の復旧費用は含まれておりません。',
  ],
  safety: [
    '工事期間中は適切な安全対策を実施いたします。',
    '近隣への配慮を十分に行い施工いたします。',
    '工事期間中の事故に備え、適切な保険に加入いたします。',
  ],
};

// 造園業界標準の工事保証内容
export const WARRANTY_TEMPLATES = {
  planting: {
    title: '植栽枯れ保証',
    period: '1年間',
    coverage: '植栽の活着不良による枯死',
    exclusions: [
      '天災（台風、地震、洪水等）による被害',
      '人為的な損傷（いたずら、事故等）',
      '管理不足（水やり不足、施肥不良等）',
      '病害虫の発生（適切な管理下を除く）',
    ],
  },
  construction: {
    title: '施工保証',
    period: '1年間',
    coverage: '施工不良による不具合',
    exclusions: [
      '経年劣化によるもの',
      '天災による被害',
      '使用方法の誤りによる損傷',
      '第三者による破損',
    ],
  },
  waterproof: {
    title: '防水保証',
    period: '3年間',
    coverage: '防水施工部分の漏水',
    exclusions: ['構造体の変形による損傷', '故意による破損', '経年劣化'],
  },
};

// 見積書・請求書の標準レイアウト構成
export const DOCUMENT_LAYOUTS = {
  estimate: {
    coverPage: {
      required: true,
      elements: [
        'companyLogo',
        'documentTitle',
        'estimateNumber',
        'issueDate',
        'customerInfo',
        'projectName',
        'totalAmount',
        'validityPeriod',
      ],
    },
    summaryPage: {
      required: true,
      elements: ['categoryBreakdown', 'subtotal', 'tax', 'totalAmount'],
    },
    detailPage: {
      required: true,
      elements: ['itemList', 'unitPrices', 'quantities', 'amounts', 'notes'],
    },
    termsPage: {
      required: true,
      elements: ['generalTerms', 'specificTerms', 'warranty', 'paymentTerms', 'companyInfo'],
    },
  },
  invoice: {
    mainPage: {
      required: true,
      elements: [
        'companyHeader',
        'invoiceTitle',
        'invoiceNumber',
        'issueDate',
        'dueDate',
        'customerInfo',
        'projectInfo',
        'itemBreakdown',
        'totalAmount',
        'paymentInfo',
        'companySeal',
      ],
    },
  },
};

// 標準的な植栽仕様
export const PLANTING_SPECIFICATIONS = {
  tree_sizes: {
    H: '樹高',
    C: '幹周',
    W: '葉張',
    R: '根鉢径',
  },
  standard_sizes: {
    high_tree: {
      min_height: 3.0,
      max_height: 7.0,
      unit: 'm',
    },
    medium_tree: {
      min_height: 1.5,
      max_height: 3.0,
      unit: 'm',
    },
    low_tree: {
      min_height: 0.3,
      max_height: 1.5,
      unit: 'm',
    },
  },
};

// 造園業界でよく使用される定型文
export const STANDARD_PHRASES = {
  greetings: {
    opening: 'この度は、お見積りのご依頼をいただき誠にありがとうございます。',
    closing: '何卒ご検討の程、よろしくお願い申し上げます。',
  },
  project: {
    description: '下記の通り、お見積りさせていただきます。',
    scope: '工事内容は別紙明細の通りです。',
  },
  notes: {
    priceValidity: '材料価格の変動により、金額が変更となる場合があります。',
    siteCondition: '現地状況により、追加工事が必要となる場合があります。',
  },
};

// 業界標準の端数処理ルール
export const ROUNDING_RULES = {
  subtotal: {
    method: 'floor',
    unit: 1000,
    description: '小計は1,000円未満切り捨て',
  },
  itemPrice: {
    method: 'round',
    unit: 10,
    description: '単価は10円単位で四捨五入',
  },
  total: {
    method: 'floor',
    unit: 1000,
    description: '合計金額は1,000円未満切り捨て',
  },
};

export default {
  LANDSCAPING_CATEGORIES,
  LANDSCAPING_UNITS,
  STANDARD_TERMS_TEMPLATES,
  WARRANTY_TEMPLATES,
  DOCUMENT_LAYOUTS,
  PLANTING_SPECIFICATIONS,
  STANDARD_PHRASES,
  ROUNDING_RULES,
};
