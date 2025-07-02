/**
 * 造園業界強化フォーマッティング機能
 * テンプレート改良・業界標準準拠強化のための補助関数群
 */

import { LANDSCAPING_STANDARDS } from './landscapingInvoicePDFGenerator';

/**
 * 造園業界工種分類による色分けマッピング
 */
const CATEGORY_COLOR_MAP = {
  '植栽工事': '#2d5a3d', // 深い緑
  '外構工事': '#5d4e37', // 茶色（土・石材）
  '造成工事': '#8b4513', // 茶色（土木）
  '設計監理': '#1e3a8a', // 青（設計）
  '維持管理': '#059669', // エメラルド（管理）
  '撤去工事': '#dc2626', // 赤（撤去）
  'その他工事': '#6b7280' // グレー（その他）
};

/**
 * 工種分類の色を取得
 */
export const getCategoryColor = (category) => {
  if (!category) return LANDSCAPING_STANDARDS.colors.text;
  
  // 部分一致で検索
  for (const [key, color] of Object.entries(CATEGORY_COLOR_MAP)) {
    if (category.includes(key)) {
      return color;
    }
  }
  
  return LANDSCAPING_STANDARDS.colors.secondary;
};

/**
 * 造園業界標準の工事明細説明フォーマット
 */
export const formatItemDescription = (item) => {
  if (!item) return '';
  
  const parts = [];
  
  // 基本項目名
  if (item.item_name) {
    parts.push(item.item_name);
  }
  
  // 仕様・詳細（造園業界では重要）
  if (item.specification) {
    parts.push(`[${item.specification}]`);
  } else if (item.item_description) {
    parts.push(`[${item.item_description}]`);
  }
  
  // サイズ・規格
  if (item.size) {
    parts.push(`${item.size}`);
  }
  
  // 品種・等級（植栽工事の場合）
  if (item.grade) {
    parts.push(`(${item.grade})`);
  }
  
  // 備考（重要な条件）
  if (item.notes && item.notes.length > 0 && item.notes.length <= 20) {
    parts.push(`※${item.notes}`);
  }
  
  return parts.join(' ');
};

/**
 * 造園業界標準の数値フォーマット（小数点対応）
 */
export const formatLandscapingNumber = (num) => {
  if (!num && num !== 0) return '';
  
  const number = parseFloat(num);
  if (isNaN(number)) return '';
  
  // 整数の場合は小数点なし、小数の場合は必要な桁数まで表示
  if (number % 1 === 0) {
    return number.toLocaleString('ja-JP');
  } else {
    return number.toLocaleString('ja-JP', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    });
  }
};

/**
 * 造園業界標準の通貨フォーマット（税抜き表示対応）
 */
export const formatLandscapingCurrency = (amount, options = {}) => {
  if (!amount && amount !== 0) return '';
  
  const number = parseFloat(amount);
  if (isNaN(number)) return '';
  
  const formatted = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
  
  // 税抜き表示オプション
  if (options.showTaxExcluded && !options.isTaxIncluded) {
    return `${formatted}(税抜)`;
  }
  
  return formatted;
};

/**
 * 造園業界日付フォーマット（柔軟な年号対応）
 */
export const formatLandscapingDate = (dateString, options = {}) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // デフォルトは令和年号
  if (options.useWareki !== false) {
    const reiwaYear = year - 2018;
    if (reiwaYear > 0) {
      return `令和${reiwaYear}年${month}月${day}日`;
    }
  }
  
  // 西暦表示
  return `${year}年${month}月${day}日`;
};

/**
 * 造園業界標準の期間フォーマット
 */
export const formatLandscapingPeriod = (startDate, endDate) => {
  if (!startDate) return '';
  
  const start = formatLandscapingDate(startDate);
  
  if (!endDate) {
    return `${start}より`;
  }
  
  const end = formatLandscapingDate(endDate);
  return `${start} ～ ${end}`;
};

/**
 * 造園業界標準の工事規模表示
 */
export const formatProjectScale = (totalAmount) => {
  if (!totalAmount) return '';
  
  const amount = parseFloat(totalAmount);
  if (isNaN(amount)) return '';
  
  if (amount < 500000) {
    return '小規模工事';
  } else if (amount < 3000000) {
    return '中規模工事';
  } else if (amount < 10000000) {
    return '大規模工事';
  } else {
    return '大型工事';
  }
};

/**
 * 造園業界標準の植栽工事特有フォーマット
 */
export const formatPlantingSpecification = (item) => {
  if (!item || !item.category || !item.category.includes('植栽')) {
    return formatItemDescription(item);
  }
  
  const parts = [];
  
  // 植物名
  if (item.item_name) {
    parts.push(item.item_name);
  }
  
  // 高さ・幹周（重要な規格）
  if (item.height) {
    parts.push(`H${item.height}`);
  }
  if (item.trunk_circumference) {
    parts.push(`幹周${item.trunk_circumference}`);
  }
  
  // 鉢サイズ・根回し
  if (item.pot_size) {
    parts.push(`${item.pot_size}鉢`);
  }
  if (item.root_wrapped) {
    parts.push('根回し済み');
  }
  
  // 等級・品質
  if (item.grade) {
    parts.push(item.grade);
  }
  
  return parts.join(' ');
};

/**
 * パフォーマンス統計更新関数
 */
const performanceStats = {
  table_rendering: [],
  formatting_operations: [],
  cache_hits: 0,
  cache_misses: 0
};

export const updatePerformanceStats = (operation, time) => {
  if (!performanceStats[operation]) {
    performanceStats[operation] = [];
  }
  
  performanceStats[operation].push(time);
  
  // 最新100件のみ保持
  if (performanceStats[operation].length > 100) {
    performanceStats[operation] = performanceStats[operation].slice(-100);
  }
};

/**
 * パフォーマンス統計取得
 */
export const getFormattingPerformanceStats = () => {
  const stats = {};
  
  for (const [operation, times] of Object.entries(performanceStats)) {
    if (Array.isArray(times) && times.length > 0) {
      stats[operation] = {
        count: times.length,
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times)
      };
    }
  }
  
  return {
    ...stats,
    cache_hits: performanceStats.cache_hits,
    cache_misses: performanceStats.cache_misses,
    cache_hit_rate: performanceStats.cache_hits / (performanceStats.cache_hits + performanceStats.cache_misses) * 100
  };
};

/**
 * 造園業界標準バリデーション（強化版）
 */
export const validateLandscapingItem = (item) => {
  const errors = [];
  
  if (!item) {
    errors.push('明細項目が未定義です');
    return { isValid: false, errors };
  }
  
  // 基本項目チェック
  if (!item.category || !LANDSCAPING_STANDARDS.landscaping.standardCategories.includes(item.category)) {
    errors.push('工種分類が正しくありません');
  }
  
  if (!item.item_name || item.item_name.trim().length === 0) {
    errors.push('工事名称が入力されていません');
  }
  
  if (!item.unit || !LANDSCAPING_STANDARDS.landscaping.standardUnits.includes(item.unit)) {
    errors.push('単位が造園業界標準に準拠していません');
  }
  
  // 数値チェック
  if (item.quantity !== undefined && (isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) < 0)) {
    errors.push('数量が正しくありません');
  }
  
  if (item.unit_price !== undefined && (isNaN(parseFloat(item.unit_price)) || parseFloat(item.unit_price) < 0)) {
    errors.push('単価が正しくありません');
  }
  
  // 植栽工事特有チェック
  if (item.category && item.category.includes('植栽')) {
    if (!item.specification && !item.size && !item.grade) {
      errors.push('植栽工事には樹木の規格（高さ・幹周・等級等）の記載が必要です');
    }
  }
  
  // 外構工事特有チェック
  if (item.category && item.category.includes('外構')) {
    if (!item.specification && !item.material) {
      errors.push('外構工事には使用材料・仕様の記載が必要です');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: generateItemWarnings(item)
  };
};

/**
 * 警告メッセージ生成
 */
const generateItemWarnings = (item) => {
  const warnings = [];
  
  // 高額項目の警告
  if (item.amount && parseFloat(item.amount) > 500000) {
    warnings.push('高額項目です。見積精度を十分確認してください');
  }
  
  // 植栽工事の季節チェック
  if (item.category && item.category.includes('植栽')) {
    const now = new Date();
    const month = now.getMonth() + 1;
    if (month >= 7 && month <= 9) {
      warnings.push('夏季の植栽工事です。活着率を考慮してください');
    }
  }
  
  return warnings;
};

export default {
  getCategoryColor,
  formatItemDescription,
  formatLandscapingNumber,
  formatLandscapingCurrency,
  formatLandscapingDate,
  formatLandscapingPeriod,
  formatProjectScale,
  formatPlantingSpecification,
  updatePerformanceStats,
  getFormattingPerformanceStats,
  validateLandscapingItem
};