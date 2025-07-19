import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// フォント設定（日本語対応）
const setupPDFFont = doc => {
  // TODO: 日本語フォントの設定
  // jsPDF の日本語フォント対応は追加ライブラリが必要
};

/**
 * 請求書PDFを生成する
 * @param {Object} invoiceData - 請求書データ
 * @param {Object} companyInfo - 会社情報
 * @returns {Promise<jsPDF>} - 生成されたPDF
 */
export const generateInvoicePDF = async (invoiceData, companyInfo = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  setupPDFFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  // ヘッダー部分
  currentY = addHeader(doc, invoiceData, companyInfo, margin, currentY, pageWidth);

  // 請求先情報
  currentY = addBillingInfo(doc, invoiceData, margin, currentY);

  // 請求書基本情報
  currentY = addInvoiceInfo(doc, invoiceData, margin, currentY, pageWidth);

  // 明細表
  currentY = addItemsTable(doc, invoiceData.items, margin, currentY, pageWidth);

  // 合計金額
  currentY = addTotalSection(doc, invoiceData, margin, currentY, pageWidth);

  // 備考
  if (invoiceData.notes) {
    currentY = addNotes(doc, invoiceData.notes, margin, currentY, pageWidth);
  }

  // フッター
  addFooter(doc, companyInfo, pageHeight);

  return doc;
};

/**
 * ヘッダー部分を追加
 */
const addHeader = (doc, invoiceData, companyInfo, margin, startY, pageWidth) => {
  let y = startY;

  // 会社ロゴ（将来的に追加）
  // if (companyInfo.logo) {
  //   doc.addImage(companyInfo.logo, 'PNG', margin, y, 40, 20);
  // }

  // 会社名
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name || '造園業株式会社', margin, y + 15);

  // 請求書タイトル
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('請求書', pageWidth - margin - 40, y + 20);

  y += 40;

  // 区切り線
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  return y + 10;
};

/**
 * 請求先情報を追加
 */
const addBillingInfo = (doc, invoiceData, margin, startY) => {
  let y = startY;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  // 請求先
  doc.setFont('helvetica', 'bold');
  doc.text('請求先:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.customer_name || '', margin + 25, y);

  y += 15;

  return y;
};

/**
 * 請求書基本情報を追加
 */
const addInvoiceInfo = (doc, invoiceData, margin, startY, pageWidth) => {
  const y = startY;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const infoItems = [
    ['請求書番号:', invoiceData.invoice_number || ''],
    ['請求日:', formatDate(invoiceData.invoice_date) || ''],
    ['支払期限:', formatDate(invoiceData.due_date) || ''],
    ['案件名:', invoiceData.project_name || ''],
  ];

  infoItems.forEach(([label, value], index) => {
    const xPos = pageWidth - margin - 80;
    doc.text(label, xPos, y + index * 8);
    doc.text(value, xPos + 30, y + index * 8);
  });

  return y + infoItems.length * 8 + 15;
};

/**
 * 明細表を追加
 */
const addItemsTable = (doc, items, margin, startY, pageWidth) => {
  let y = startY;

  // テーブルヘッダー
  const tableWidth = pageWidth - margin * 2;
  const columnWidths = [30, 60, 20, 15, 25, 25]; // カテゴリ、品目、数量、単位、単価、金額
  const headerHeight = 8;

  doc.setFillColor(52, 73, 94); // ダークグレー
  doc.rect(margin, y, tableWidth, headerHeight, 'F');

  doc.setTextColor(255, 255, 255); // 白文字
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  const headers = ['カテゴリ', '品目・摘要', '数量', '単位', '単価', '金額'];
  let xPos = margin + 2;

  headers.forEach((header, index) => {
    doc.text(header, xPos, y + 6);
    xPos += columnWidths[index];
  });

  y += headerHeight;
  doc.setTextColor(0, 0, 0); // 黒文字に戻す
  doc.setFont('helvetica', 'normal');

  // データ行
  items.forEach((item, rowIndex) => {
    const rowHeight = 8;

    // 交互の背景色
    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y, tableWidth, rowHeight, 'F');
    }

    xPos = margin + 2;
    const rowData = [
      item.category || '',
      item.item_name || '',
      item.quantity?.toString() || '',
      item.unit || '',
      formatCurrency(item.unit_price) || '',
      formatCurrency(item.amount) || '',
    ];

    rowData.forEach((data, colIndex) => {
      // 右寄せ（数量、単価、金額）
      if (colIndex >= 2) {
        doc.text(data, xPos + columnWidths[colIndex] - 5, y + 6, { align: 'right' });
      } else {
        doc.text(data, xPos, y + 6);
      }
      xPos += columnWidths[colIndex];
    });

    y += rowHeight;
  });

  // テーブル枠線
  doc.setLineWidth(0.5);
  doc.rect(margin, startY, tableWidth, y - startY);

  return y + 10;
};

/**
 * 合計金額セクションを追加
 */
const addTotalSection = (doc, invoiceData, margin, startY, pageWidth) => {
  let y = startY;

  const rightAlign = pageWidth - margin - 60;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  // 小計
  doc.text('小計:', rightAlign, y);
  doc.text(formatCurrency(invoiceData.subtotal || 0), rightAlign + 35, y, { align: 'right' });
  y += 8;

  // 消費税
  doc.text('消費税(10%):', rightAlign, y);
  doc.text(formatCurrency(invoiceData.tax_amount || 0), rightAlign + 35, y, { align: 'right' });
  y += 8;

  // 区切り線
  doc.setLineWidth(0.5);
  doc.line(rightAlign, y, rightAlign + 35, y);
  y += 5;

  // 合計
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('合計金額:', rightAlign, y);
  doc.text(formatCurrency(invoiceData.total_amount || 0), rightAlign + 35, y, { align: 'right' });

  return y + 20;
};

/**
 * 備考を追加
 */
const addNotes = (doc, notes, margin, startY, pageWidth) => {
  let y = startY;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('備考:', margin, y);

  y += 8;
  doc.setFont('helvetica', 'normal');

  // 備考テキストを分割して表示
  const maxWidth = pageWidth - margin * 2;
  const lines = doc.splitTextToSize(notes, maxWidth);

  lines.forEach(line => {
    doc.text(line, margin, y);
    y += 6;
  });

  return y + 10;
};

/**
 * フッターを追加
 */
const addFooter = (doc, companyInfo, pageHeight) => {
  const footerY = pageHeight - 30;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // 会社情報
  const companyDetails = [
    companyInfo.address || '〒000-0000 東京都○○区○○1-1-1',
    `TEL: ${companyInfo.phone || '03-0000-0000'}`,
    `Email: ${companyInfo.email || 'info@company.com'}`,
  ];

  companyDetails.forEach((detail, index) => {
    doc.text(detail, 20, footerY + index * 5);
  });

  // 振込先情報
  const bankInfo = ['振込先: ○○銀行 ○○支店', '普通 0000000', '造園業株式会社'];

  bankInfo.forEach((info, index) => {
    doc.text(info, 120, footerY + index * 5);
  });
};

/**
 * 日付フォーマット
 */
const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * 通貨フォーマット
 */
const formatCurrency = amount => {
  if (!amount) return '¥0';
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * PDFダウンロード
 */
export const downloadInvoicePDF = async (invoiceData, companyInfo, filename = 'invoice.pdf') => {
  try {
    const pdf = await generateInvoicePDF(invoiceData, companyInfo);
    pdf.save(filename);
  } catch (error) {
    console.error('PDF生成エラー:', error);
    throw error;
  }
};

/**
 * HTMLからPDF生成（プレビュー用）
 */
export const generatePDFFromHTML = async (element, filename = 'document.pdf') => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('HTML→PDF変換エラー:', error);
    throw error;
  }
};
