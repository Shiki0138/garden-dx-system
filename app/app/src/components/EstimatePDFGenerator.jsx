/**
 * 見積書PDF生成コンポーネント
 * 造園業界標準準拠の見積書PDF出力専用コンポーネント
 */

import React from 'react';
import { jsPDF } from 'jspdf';
import {
  formatLandscapingCurrency,
  formatLandscapingDate,
  formatLandscapingNumber,
  getCategoryColor,
  formatItemDescription,
} from '../utils/landscapingEnhancedFormatting';

/**
 * 造園業界標準見積書PDF生成
 */
export const generateEstimatePDF = async (estimateData, companyInfo = {}, options = {}) => {
  try {
    // PDF設定（造園業界標準）
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      precision: 2,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = { top: 20, bottom: 25, left: 20, right: 15 };

    let currentY = margins.top;

    // 見積書ヘッダー
    currentY = addEstimateHeader(doc, estimateData, companyInfo, margins, currentY, pageWidth);

    // 見積先情報
    currentY = addEstimateCustomerInfo(doc, estimateData, margins, currentY, pageWidth);

    // 見積基本情報
    currentY = addEstimateBasicInfo(doc, estimateData, margins, currentY, pageWidth);

    // 見積明細表
    currentY = addEstimateItemsTable(doc, estimateData.items, margins, currentY, pageWidth);

    // 合計金額
    currentY = addEstimateTotalSection(doc, estimateData, margins, currentY, pageWidth);

    // 工事条件・特記事項
    currentY = addEstimateConditions(doc, estimateData, margins, currentY, pageWidth);

    // フッター
    addEstimateFooter(doc, companyInfo, pageHeight, pageWidth, margins);

    // PDFメタデータ設定
    doc.setProperties({
      title: `見積書 ${estimateData.estimate_number || ''}`,
      subject: '造園業見積書',
      author: companyInfo.name || '造園業株式会社',
      keywords: '見積書,造園業,PDF',
      creator: 'Teisou System v1.0',
      producer: 'Teisou Estimate Generator',
    });

    return doc;
  } catch (error) {
    console.error('見積書PDF生成エラー:', error);
    throw error;
  }
};

/**
 * 見積書ヘッダー
 */
const addEstimateHeader = (doc, estimateData, companyInfo, margins, startY, pageWidth) => {
  let y = startY;

  // 背景グラデーション効果
  doc.setFillColor(250, 252, 250);
  doc.rect(margins.left, y - 5, pageWidth - margins.left - margins.right, 50, 'F');

  // 会社ロゴ（左上）
  if (companyInfo.logo) {
    doc.addImage(companyInfo.logo, 'PNG', margins.left, y, 35, 25);
  } else {
    // ロゴなしの場合の代替表示
    doc.setFillColor(26, 71, 42);
    doc.rect(margins.left, y, 35, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('LOGO', margins.left + 17.5, y + 12.5, { align: 'center' });
  }

  // 会社名
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 71, 42);
  const companyName = companyInfo.name || '造園業株式会社';
  doc.text(companyName, margins.left + 40, y + 14);

  // 建設業許可番号
  if (companyInfo.business_license) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(74, 74, 74);
    doc.text(`建設業許可：${companyInfo.business_license}`, margins.left + 40, y + 22);
  }

  // 見積書タイトル（右上）
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 71, 42);
  const titleX = pageWidth - margins.right - 50;
  doc.text('見　積　書', titleX, y + 18);

  // タイトル下線
  doc.setLineWidth(1.2);
  doc.setDrawColor(26, 71, 42);
  doc.line(titleX, y + 20, titleX + 45, y + 20);

  // 発行日
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 74, 74);
  const today = new Date();
  const issueDate = formatLandscapingDate(today.toISOString());
  doc.text(`発行日：${issueDate}`, titleX, y + 27);

  y += 45;

  // 区切り線
  doc.setLineWidth(0.8);
  doc.setDrawColor(26, 71, 42);
  doc.line(margins.left, y, pageWidth - margins.right, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(74, 124, 60);
  doc.line(margins.left, y + 2, pageWidth - margins.right, y + 2);

  return y + 12;
};

/**
 * 見積先情報
 */
const addEstimateCustomerInfo = (doc, estimateData, margins, startY, pageWidth) => {
  let y = startY;

  // 見積先ボックス
  const boxWidth = 95;
  const boxHeight = 35;

  doc.setLineWidth(0.6);
  doc.setDrawColor(138, 138, 138);
  doc.rect(margins.left, y, boxWidth, boxHeight);

  // 見積先ラベル
  doc.setFillColor(245, 248, 245);
  doc.rect(margins.left, y, boxWidth, 10, 'F');

  doc.setLineWidth(0.3);
  doc.setDrawColor(208, 208, 208);
  doc.line(margins.left, y + 10, margins.left + boxWidth, y + 10);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 71, 42);
  doc.text('見　積　先', margins.left + 3, y + 7);

  // 顧客種別表示
  const customerType = estimateData.customer_type || '法人';
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`(${customerType})`, margins.left + boxWidth - 25, y + 7);

  // 見積先情報
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  y += 14;

  const customerInfo = [];

  if (estimateData.customer_name) {
    customerInfo.push(estimateData.customer_name);
    if (estimateData.customer_title) {
      customerInfo.push(estimateData.customer_title);
    }
  }

  if (estimateData.customer_postal_code) {
    customerInfo.push(`〒${estimateData.customer_postal_code}`);
  }
  if (estimateData.customer_address) {
    customerInfo.push(estimateData.customer_address);
  }

  if (estimateData.customer_phone) {
    customerInfo.push(`TEL：${estimateData.customer_phone}`);
  }

  if (estimateData.customer_contact) {
    customerInfo.push(`ご担当：${estimateData.customer_contact}`);
  }

  customerInfo.forEach((info, index) => {
    if (info.trim() && index < 6) {
      const lineY = y + index * 3.5;
      if (lineY < y + boxHeight - 15) {
        doc.text(info, margins.left + 3, lineY);
      }
    }
  });

  return startY + boxHeight + 12;
};

/**
 * 見積基本情報
 */
const addEstimateBasicInfo = (doc, estimateData, margins, startY, pageWidth) => {
  const y = startY;

  // 右側に情報配置
  const rightX = pageWidth - margins.right - 85;
  const boxWidth = 85;
  const boxHeight = 40;

  doc.setLineWidth(0.6);
  doc.setDrawColor(138, 138, 138);
  doc.rect(rightX, y, boxWidth, boxHeight);

  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);

  const infoItems = [
    ['見積書No.', estimateData.estimate_number || ''],
    ['見積日', formatLandscapingDate(estimateData.estimate_date) || ''],
    ['有効期限', formatLandscapingDate(estimateData.valid_until) || ''],
    ['工事件名', estimateData.project_name || ''],
    ['工事場所', estimateData.site_address || ''],
    ['工事期間', estimateData.work_period || ''],
  ];

  infoItems.forEach(([label, value], index) => {
    const itemY = y + 4 + index * 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, rightX + 2, itemY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, rightX + 28, itemY);
  });

  return y + boxHeight + 5;
};

/**
 * 見積明細表
 */
const addEstimateItemsTable = (doc, items, margins, startY, pageWidth) => {
  let y = startY;

  const tableWidth = pageWidth - (margins.left + margins.right);
  const columnWidths = [8, 28, 55, 12, 10, 22, 25];
  const headerHeight = 10;

  // テーブルタイトル
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 71, 42);
  doc.text('見積明細一覧表', margins.left, y - 3);

  // テーブルヘッダー
  doc.setFillColor(240, 250, 240);
  doc.rect(margins.left, y, tableWidth, headerHeight, 'F');

  doc.setLineWidth(0.8);
  doc.setDrawColor(26, 71, 42);
  doc.rect(margins.left, y, tableWidth, headerHeight);

  doc.setTextColor(26, 71, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');

  const headers = ['No.', '工種分類', '工事名称・仕様', '数量', '単位', '単価(円)', '金額(円)'];

  let xPos = margins.left + 1;

  headers.forEach((header, index) => {
    if (index > 0) {
      doc.setLineWidth(0.6);
      doc.setDrawColor(138, 138, 138);
      doc.line(xPos, y, xPos, y + headerHeight);
    }

    const textWidth = (doc.getStringUnitWidth(header) * 11) / doc.internal.scaleFactor;
    const centerX = xPos + (columnWidths[index] - textWidth) / 2;
    doc.text(header, centerX, y + 7);

    xPos += columnWidths[index];
  });

  y += headerHeight;

  // データ行
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  items.forEach((item, rowIndex) => {
    const rowHeight = 8;

    // 交互背景色
    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 253, 248);
      doc.rect(margins.left, y, tableWidth, rowHeight, 'F');
    }

    // 行の枠線
    doc.setLineWidth(0.3);
    doc.setDrawColor(208, 208, 208);
    doc.rect(margins.left, y, tableWidth, rowHeight);

    // 工種分類の色分け
    const categoryColor = getCategoryColor(item.category);

    xPos = margins.left + 1;
    const rowData = [
      (rowIndex + 1).toString(),
      item.category || '',
      formatItemDescription(item),
      formatLandscapingNumber(item.quantity) || '',
      item.unit || '',
      formatLandscapingCurrency(item.unit_price) || '',
      formatLandscapingCurrency(item.amount) || '',
    ];

    rowData.forEach((data, colIndex) => {
      if (colIndex > 0) {
        doc.setLineWidth(0.2);
        doc.setDrawColor(208, 208, 208);
        doc.line(xPos, y, xPos, y + rowHeight);
      }

      // テキスト色設定
      if (colIndex === 1) {
        doc.setTextColor(categoryColor);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
      }

      const cellPadding = 2;
      if (colIndex >= 3 && colIndex !== 4) {
        // 数量・単価・金額は右寄せ
        const textWidth = (doc.getStringUnitWidth(data) * 10) / doc.internal.scaleFactor;
        doc.text(data, xPos + columnWidths[colIndex] - textWidth - cellPadding, y + 6);
      } else if (colIndex === 4) {
        // 単位は中央寄せ
        const textWidth = (doc.getStringUnitWidth(data) * 10) / doc.internal.scaleFactor;
        const centerX = xPos + (columnWidths[colIndex] - textWidth) / 2;
        doc.text(data, centerX, y + 6);
      } else {
        // その他は左寄せ
        const maxWidth = columnWidths[colIndex] - cellPadding * 2;
        const lines = doc.splitTextToSize(data, maxWidth);
        lines.forEach((line, lineIndex) => {
          if (lineIndex < 2) {
            doc.text(line, xPos + cellPadding, y + 6 + lineIndex * 3);
          }
        });
      }

      xPos += columnWidths[colIndex];
    });

    y += rowHeight;
  });

  // テーブル外枠
  doc.setLineWidth(0.8);
  doc.setDrawColor(26, 71, 42);
  doc.rect(margins.left, startY, tableWidth, y - startY);

  // テーブルサマリー
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  const summaryY = y + 3;
  doc.text(`合計 ${items.length} 項目`, margins.left, summaryY);

  const hasPlantingWork = items.some(item => item.category && item.category.includes('植栽'));
  if (hasPlantingWork) {
    doc.text('※植栽材料は現地確認後、最終決定いたします', margins.left + 100, summaryY);
  }

  return y + 12;
};

/**
 * 合計金額セクション
 */
const addEstimateTotalSection = (doc, estimateData, margins, startY, pageWidth) => {
  let y = startY;

  const rightAlign = pageWidth - margins.right - 65;
  const boxWidth = 65;
  const boxHeight = 28;

  // 合計金額ボックス
  doc.setLineWidth(0.8);
  doc.setDrawColor(26, 71, 42);
  doc.rect(rightAlign, y, boxWidth, boxHeight);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);

  // 小計
  doc.text('工事費小計', rightAlign + 2, y + 6);
  doc.text(
    formatLandscapingCurrency(estimateData.subtotal || 0),
    rightAlign + boxWidth - 2,
    y + 6,
    { align: 'right' }
  );

  y += 6;

  // 消費税
  const taxRate = estimateData.tax_rate || 0.1;
  const taxRatePercent = Math.round(taxRate * 100);
  doc.text(`消費税(${taxRatePercent}%)`, rightAlign + 2, y + 6);
  doc.text(
    formatLandscapingCurrency(estimateData.tax_amount || 0),
    rightAlign + boxWidth - 2,
    y + 6,
    { align: 'right' }
  );

  y += 6;

  // 区切り線
  doc.setLineWidth(0.5);
  doc.line(rightAlign + 2, y + 2, rightAlign + boxWidth - 2, y + 2);
  y += 4;

  // 見積金額（太字・大きく）
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 71, 42);
  doc.text('見積金額', rightAlign + 2, y + 6);
  doc.text(
    formatLandscapingCurrency(estimateData.total_amount || 0),
    rightAlign + boxWidth - 2,
    y + 6,
    { align: 'right' }
  );

  return y + 15;
};

/**
 * 工事条件・特記事項
 */
const addEstimateConditions = (doc, estimateData, margins, startY, pageWidth) => {
  let y = startY;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 71, 42);
  doc.text('【工事条件・特記事項】', margins.left, y);

  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);

  // 造園業界標準の工事条件
  const standardConditions = [
    '1. 上記金額は税込価格です。',
    '2. 植栽材料は現地確認後、最終決定いたします。',
    '3. 天候不良により工期が延長する場合があります。',
    '4. 既存構造物の撤去で追加費用が発生する場合は事前にご相談いたします。',
    '5. 完成後1年間、植栽の活着について保証いたします。',
    '6. 本見積書の有効期限は発行日より30日間です。',
    '7. 工事着手前に詳細な施工図面をご確認いただきます。',
  ];

  // カスタム条件
  if (estimateData.conditions) {
    const customConditions = estimateData.conditions.split('\n');
    customConditions.forEach(condition => {
      if (condition.trim()) {
        standardConditions.push(condition.trim());
      }
    });
  }

  const maxWidth = pageWidth - (margins.left + margins.right);
  standardConditions.forEach(condition => {
    const lines = doc.splitTextToSize(condition, maxWidth);
    lines.forEach(line => {
      doc.text(line, margins.left, y);
      y += 4;
    });
  });

  return y + 5;
};

/**
 * フッター
 */
const addEstimateFooter = (doc, companyInfo, pageHeight, pageWidth, margins) => {
  const footerY = pageHeight - 40;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);

  // 会社情報
  const companyDetails = [
    `〒${companyInfo.postal_code || '000-0000'} ${companyInfo.address || '東京都○○区○○1-1-1'}`,
    `TEL: ${companyInfo.phone || '03-0000-0000'} FAX: ${companyInfo.fax || '03-0000-0001'}`,
    `Email: ${companyInfo.email || 'info@landscaping-company.co.jp'}`,
    `${companyInfo.business_license ? `建設業許可番号: ${companyInfo.business_license}` : ''}`,
  ];

  companyDetails.forEach((detail, index) => {
    if (detail.trim()) {
      doc.text(detail, margins.left, footerY + index * 4);
    }
  });

  // 印鑑欄
  const sealX = pageWidth - margins.right - 18 - 5;
  const sealY = footerY - 10;

  doc.setLineWidth(0.5);
  doc.setDrawColor(138, 138, 138);
  doc.rect(sealX, sealY, 18, 18);

  doc.setFontSize(9);
  doc.text('印', sealX - 8, sealY + 9);

  if (companyInfo.company_seal) {
    doc.addImage(companyInfo.company_seal, 'PNG', sealX + 1, sealY + 1, 16, 16);
  }
};

/**
 * 見積書PDFダウンロード
 */
export const downloadEstimatePDF = async (
  estimateData,
  companyInfo,
  filename = null,
  options = {}
) => {
  try {
    const pdf = await generateEstimatePDF(estimateData, companyInfo, options);

    const sanitizedEstimateNumber = (estimateData.estimate_number || 'No未設定')
      .replace(/[^\w\s-_.]/g, '')
      .substring(0, 50);
    const sanitizedCustomerName = (estimateData.customer_name || '顧客名未設定')
      .replace(/[^\w\s-_.]/g, '')
      .substring(0, 50);
    const defaultFilename = `見積書_${sanitizedEstimateNumber}_${sanitizedCustomerName}.pdf`;

    const finalFilename = filename || defaultFilename;

    pdf.save(finalFilename);

    return pdf;
  } catch (error) {
    console.error('見積書PDFダウンロードエラー:', error);
    throw error;
  }
};

export default {
  generateEstimatePDF,
  downloadEstimatePDF,
};
