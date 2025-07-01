/**
 * 見積書と請求書の統合システム
 * worker1の見積書システムとworker3の請求書システムの連携
 */

import { invoiceApi } from '../api/invoiceApi';
import { downloadLandscapingInvoicePDF } from './landscapingInvoicePDFGenerator';

/**
 * 見積書データの構造化
 */
export const formatEstimateForInvoice = (estimateData) => {
  return {
    estimate_id: estimateData.id,
    estimate_number: estimateData.estimate_number,
    project_id: estimateData.project_id,
    customer_id: estimateData.customer_id,
    
    // 造園業界標準項目
    work_type: estimateData.work_type || '造園工事',
    site_conditions: estimateData.site_conditions || '',
    work_period: estimateData.work_period || '',
    conditions: estimateData.conditions || '',
    
    // 見積明細の変換
    items: estimateData.items?.map(item => ({
      category: item.category || item.work_type,
      sub_category: item.sub_category,
      item_name: item.item_name || item.description,
      item_description: item.specification || item.item_description,
      quantity: parseFloat(item.quantity) || 0,
      unit: item.unit,
      unit_price: parseFloat(item.unit_price) || 0,
      amount: parseFloat(item.amount) || 0,
      notes: item.notes || item.remarks
    })) || [],
    
    // 金額情報
    subtotal: parseFloat(estimateData.subtotal) || 0,
    tax_rate: parseFloat(estimateData.tax_rate) || 0.10,
    tax_amount: parseFloat(estimateData.tax_amount) || 0,
    total_amount: parseFloat(estimateData.total_amount) || 0,
    
    // 造園業特有の情報
    planting_season: estimateData.planting_season || '',
    maintenance_period: estimateData.maintenance_period || '1年間',
    warranty_conditions: estimateData.warranty_conditions || '植栽活着保証',
    
    // 特記事項
    special_notes: estimateData.special_notes || '',
    construction_notes: estimateData.construction_notes || ''
  };
};

/**
 * 請求書への自動変換
 */
export const convertEstimateToInvoice = async (estimateId, additionalData = {}) => {
  try {
    // 見積書データを取得（worker1システムから）
    const estimateData = await fetchEstimateData(estimateId);
    
    if (!estimateData) {
      throw new Error('見積書データが見つかりません');
    }
    
    // 造園業界標準に準拠した請求書データを作成
    const invoiceData = {
      // 基本情報
      project_id: estimateData.project_id,
      customer_id: estimateData.customer_id,
      estimate_id: estimateId,
      
      // 請求書番号（自動生成）
      invoice_number: generateInvoiceNumber(),
      
      // 日付設定
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: calculateDueDate(),
      
      // 造園業界標準の税率設定
      tax_rate: estimateData.tax_rate || 0.10,
      
      // ステータス
      status: '未送付',
      payment_status: '未払い',
      
      // 明細データ（見積書から継承）
      items: estimateData.items || [],
      
      // 造園業界特有項目
      work_type: estimateData.work_type,
      site_address: estimateData.site_address,
      construction_period: estimateData.work_period,
      
      // 特記事項（見積書から継承）
      notes: combineNotesFromEstimate(estimateData),
      
      // 追加データの適用
      ...additionalData
    };
    
    return invoiceData;
    
  } catch (error) {
    console.error('見積書から請求書への変換エラー:', error);
    throw error;
  }
};

/**
 * 見積書データの取得（worker1システム連携）
 */
const fetchEstimateData = async (estimateId) => {
  try {
    // TODO: 実際のworker1見積書APIとの連携
    // 現在は仮データを返す
    const mockEstimateData = {
      id: estimateId,
      estimate_number: `EST-2024-${String(estimateId).padStart(3, '0')}`,
      project_id: 1,
      customer_id: 1,
      work_type: '庭園造成工事',
      site_address: '東京都新宿区○○1-1-1',
      work_period: '令和6年7月1日～令和6年8月31日',
      conditions: [
        '天候不良により工期延長の場合があります',
        '植栽材料は現地確認後決定いたします',
        '既存構造物撤去で追加費用発生時は事前協議'
      ].join('\n'),
      items: [
        {
          category: '植栽工事',
          item_name: 'ソメイヨシノ H3.0',
          quantity: 3,
          unit: '本',
          unit_price: 45000,
          amount: 135000,
          notes: '根回し済み'
        },
        {
          category: '植栽工事', 
          item_name: 'ヒラドツツジ H0.8',
          quantity: 20,
          unit: '本',
          unit_price: 3500,
          amount: 70000
        },
        {
          category: '外構工事',
          item_name: '石積み工事',
          quantity: 15,
          unit: 'm2',
          unit_price: 35000,
          amount: 525000
        }
      ],
      subtotal: 730000,
      tax_rate: 0.10,
      tax_amount: 73000,
      total_amount: 803000,
      special_notes: '完成後1年間の活着保証付き',
      construction_notes: '工事期間中の安全管理を徹底'
    };
    
    return formatEstimateForInvoice(mockEstimateData);
    
  } catch (error) {
    console.error('見積書データ取得エラー:', error);
    throw error;
  }
};

/**
 * 請求書番号の生成（造園業界標準）
 */
const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  
  return `INV-${year}${month}${day}-${random}`;
};

/**
 * 支払期限の計算（造園業界慣習：月末締め翌月末払い）
 */
const calculateDueDate = () => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return nextMonth.toISOString().split('T')[0];
};

/**
 * 見積書からの特記事項統合
 */
const combineNotesFromEstimate = (estimateData) => {
  const notes = [];
  
  // 造園業界標準の特記事項
  notes.push('【工事条件】');
  if (estimateData.conditions) {
    notes.push(estimateData.conditions);
  }
  
  if (estimateData.special_notes) {
    notes.push('');
    notes.push('【特記事項】');
    notes.push(estimateData.special_notes);
  }
  
  if (estimateData.construction_notes) {
    notes.push('');
    notes.push('【施工上の注意】');
    notes.push(estimateData.construction_notes);
  }
  
  // 造園業界標準の保証条項
  notes.push('');
  notes.push('【保証について】');
  notes.push('植栽については、完成後1年間の活着保証をいたします。');
  notes.push('ただし、天災や人為的な損傷は除きます。');
  
  return notes.join('\n');
};

/**
 * 統合PDF生成（見積書と請求書の連携）
 */
export const generateIntegratedInvoicePDF = async (invoiceData, estimateData = null) => {
  try {
    // 会社情報の取得（設定から）
    const companyInfo = await getCompanyInfo();
    
    // 見積書データの統合
    const enhancedInvoiceData = {
      ...invoiceData,
      // 見積書からの追加情報
      estimate_reference: estimateData?.estimate_number,
      original_estimate_date: estimateData?.created_date,
      work_specifications: estimateData?.work_specifications,
      site_survey_notes: estimateData?.site_survey_notes
    };
    
    // 造園業界標準PDFを生成
    return await downloadLandscapingInvoicePDF(
      enhancedInvoiceData,
      companyInfo,
      estimateData
    );
    
  } catch (error) {
    console.error('統合PDF生成エラー:', error);
    throw error;
  }
};

/**
 * 会社情報の取得
 */
const getCompanyInfo = async () => {
  // TODO: 実際の設定APIから取得
  return {
    name: '造園業株式会社',
    postal_code: '123-0000',
    address: '東京都新宿区○○1-1-1 ○○ビル3F',
    phone: '03-0000-0000',
    fax: '03-0000-0001',
    email: 'info@landscaping-company.co.jp',
    business_license: '東京都知事許可（般-XX）第XXXXX号',
    
    // 振込先情報
    bank_name: 'みずほ銀行 新宿支店',
    account_type: '普通預金',
    account_number: '1234567',
    account_holder: '造園業株式会社',
    
    // 印鑑・ロゴ
    company_seal: null, // Base64エンコードされた印鑑画像
    logo: null // Base64エンコードされたロゴ画像
  };
};

/**
 * 見積書変更時の請求書自動更新
 */
export const syncEstimateChangesToInvoice = async (estimateId, invoiceId) => {
  try {
    // 最新の見積書データを取得
    const latestEstimateData = await fetchEstimateData(estimateId);
    
    // 請求書データを更新
    const updatedInvoiceData = await convertEstimateToInvoice(estimateId);
    
    // APIで請求書を更新
    await invoiceApi.updateInvoice(invoiceId, updatedInvoiceData);
    
    return {
      success: true,
      message: '見積書の変更を請求書に反映しました'
    };
    
  } catch (error) {
    console.error('見積書変更同期エラー:', error);
    return {
      success: false,
      message: '見積書の変更反映に失敗しました',
      error: error.message
    };
  }
};

/**
 * 造園業界標準バリデーション
 */
export const validateLandscapingInvoice = (invoiceData) => {
  const errors = [];
  
  // 必須項目チェック
  if (!invoiceData.customer_id) {
    errors.push('請求先が選択されていません');
  }
  
  if (!invoiceData.project_id) {
    errors.push('工事案件が選択されていません');
  }
  
  if (!invoiceData.items || invoiceData.items.length === 0) {
    errors.push('請求明細が入力されていません');
  }
  
  // 造園業界特有のチェック
  if (invoiceData.items) {
    invoiceData.items.forEach((item, index) => {
      if (!item.category) {
        errors.push(`明細${index + 1}: 工種が選択されていません`);
      }
      
      if (!item.unit && item.quantity > 0) {
        errors.push(`明細${index + 1}: 単位が入力されていません`);
      }
      
      if (item.category === '植栽工事' && !item.notes) {
        errors.push(`明細${index + 1}: 植栽工事には仕様の記載が必要です`);
      }
    });
  }
  
  // 金額チェック
  if (invoiceData.total_amount <= 0) {
    errors.push('請求金額が正しくありません');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  formatEstimateForInvoice,
  convertEstimateToInvoice,
  generateIntegratedInvoicePDF,
  syncEstimateChangesToInvoice,
  validateLandscapingInvoice
};