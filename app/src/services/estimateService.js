import { dbClient, storage } from '../lib/supabase';

/**
 * 見積サービス
 * EstimateWizardProで使用するSupabase連携機能
 */

// 見積番号生成
const generateEstimateNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EST-${year}${month}${day}-${random}`;
};

// 見積データ保存
export const saveEstimate = async (wizardData, companyId, userId) => {
  try {
    // 見積データ整形
    const estimateData = {
      company_id: companyId,
      client_id: wizardData.client_id || null,
      project_id: wizardData.project_id || null,
      estimate_number: generateEstimateNumber(),
      title: wizardData.project_name || '造園工事見積書',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30日後
      status: 'draft',
      subtotal: wizardData.calculatedAmounts.subtotal,
      tax_amount: 0, // 税額計算は別途実装
      total_amount: wizardData.calculatedAmounts.total_amount,
      notes: wizardData.notes || '',
      terms: wizardData.payment_terms || '工事完了後30日以内',
      created_by: userId
    };

    // 見積作成
    const { data: estimate, error: estimateError } = await dbClient.estimates.create(estimateData);
    if (estimateError) throw estimateError;

    // 見積項目作成
    const items = Object.values(wizardData.itemSelections)
      .filter(item => item.selected && item.quantity > 0)
      .map((item, index) => ({
        estimate_id: estimate.id,
        category: item.category,
        name: item.name,
        description: item.description || '',
        unit: item.unit,
        quantity: item.quantity,
        purchase_price: item.purchase_price,
        markup_rate: item.markup_rate,
        unit_price: item.purchase_price * item.markup_rate,
        amount: item.quantity * item.purchase_price * item.markup_rate,
        sort_order: index
      }));

    if (items.length > 0) {
      const { error: itemsError } = await dbClient.estimateItems.createMany(items);
      if (itemsError) throw itemsError;
    }

    // 顧客情報も新規の場合は作成
    if (wizardData.is_new_client && wizardData.client_name) {
      const clientData = {
        company_id: companyId,
        name: wizardData.client_name,
        postal_code: wizardData.client_postal_code || '',
        address: wizardData.client_address || '',
        phone: wizardData.client_phone || '',
        email: wizardData.client_email || '',
        contact_person: wizardData.client_contact_person || ''
      };

      const { data: client, error: clientError } = await dbClient.clients.create(clientData);
      if (clientError) throw clientError;

      // 見積に顧客IDを更新
      await dbClient.estimates.update(estimate.id, { client_id: client.id });
    }

    return { success: true, data: estimate };
  } catch (error) {
    console.error('見積保存エラー:', error);
    return { success: false, error: error.message };
  }
};

// 見積データ読み込み
export const loadEstimate = async (estimateId) => {
  try {
    const { data: estimate, error } = await dbClient.estimates.get(estimateId);
    if (error) throw error;

    // WizardData形式に変換
    const wizardData = {
      project_name: estimate.title,
      client_id: estimate.client_id,
      client_name: estimate.client?.name || '',
      client_postal_code: estimate.client?.postal_code || '',
      client_address: estimate.client?.address || '',
      client_phone: estimate.client?.phone || '',
      client_email: estimate.client?.email || '',
      client_contact_person: estimate.client?.contact_person || '',
      is_new_client: false,
      project_site_address: estimate.project?.site_address || '',
      start_date: estimate.project?.start_date || '',
      end_date: estimate.project?.end_date || '',
      notes: estimate.notes || '',
      payment_terms: estimate.terms || '',
      adjustment_amount: 0,
      adjustment_reason: '',
      itemSelections: {},
      calculatedAmounts: {
        subtotal: estimate.subtotal,
        total_amount: estimate.total_amount,
        itemCount: estimate.items?.length || 0
      }
    };

    // 項目データ変換
    if (estimate.items) {
      estimate.items.forEach(item => {
        wizardData.itemSelections[item.id] = {
          id: item.id,
          category: item.category,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          markup_rate: item.markup_rate,
          selected: true
        };
      });
    }

    return { success: true, data: wizardData };
  } catch (error) {
    console.error('見積読み込みエラー:', error);
    return { success: false, error: error.message };
  }
};

// 見積一覧取得
export const getEstimateList = async (companyId, filters = {}) => {
  try {
    const { data, error } = await dbClient.estimates.list(companyId, filters);
    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('見積一覧取得エラー:', error);
    return { success: false, error: error.message };
  }
};

// 見積削除
export const deleteEstimate = async (estimateId) => {
  try {
    const { error } = await dbClient.estimates.delete(estimateId);
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('見積削除エラー:', error);
    return { success: false, error: error.message };
  }
};

// PDF生成用データ取得
export const getEstimateForPDF = async (estimateId) => {
  try {
    const { data: estimate, error } = await dbClient.estimates.get(estimateId);
    if (error) throw error;

    // PDF生成に必要な形式に整形
    const pdfData = {
      estimateNumber: estimate.estimate_number,
      issueDate: estimate.issue_date,
      validUntil: estimate.valid_until,
      clientInfo: {
        name: estimate.client?.name || '',
        address: estimate.client?.address || '',
        contactPerson: estimate.client?.contact_person || ''
      },
      projectInfo: {
        name: estimate.title,
        siteAddress: estimate.project?.site_address || '',
        period: {
          start: estimate.project?.start_date || '',
          end: estimate.project?.end_date || ''
        }
      },
      items: estimate.items?.map(item => ({
        category: item.category,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        amount: item.amount
      })) || [],
      summary: {
        subtotal: estimate.subtotal,
        taxAmount: estimate.tax_amount,
        totalAmount: estimate.total_amount
      },
      notes: estimate.notes,
      terms: estimate.terms
    };

    return { success: true, data: pdfData };
  } catch (error) {
    console.error('PDF用データ取得エラー:', error);
    return { success: false, error: error.message };
  }
};

// ファイルアップロード
export const uploadEstimateFile = async (estimateId, file, fileType = 'pdf') => {
  try {
    const fileName = `estimates/${estimateId}/${fileType}_${Date.now()}_${file.name}`;
    const { data, error } = await storage.upload('garden-dx-files', fileName, file);
    
    if (error) throw error;

    // ファイル情報をDBに保存
    const fileRecord = {
      company_id: companyId,
      entity_type: 'estimate',
      entity_id: estimateId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: fileName
    };

    const { error: dbError } = await supabase
      .from('files')
      .insert(fileRecord);
    
    if (dbError) throw dbError;

    const publicUrl = await storage.getPublicUrl('garden-dx-files', fileName);
    
    return { success: true, data: { path: fileName, url: publicUrl } };
  } catch (error) {
    console.error('ファイルアップロードエラー:', error);
    return { success: false, error: error.message };
  }
};