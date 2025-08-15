/**
 * プログレッシブPDF生成ユーティリティ
 * 大きなPDFを段階的に生成してメモリ効率を向上
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * PDFジェネレータークラス（プログレッシブレンダリング対応）
 */
export class ProgressivePDFGenerator {
  constructor(options = {}) {
    this.pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: options.unit || 'mm',
      format: options.format || 'a4',
      compress: true
    });
    
    this.pageHeight = this.pdf.internal.pageSize.height;
    this.pageWidth = this.pdf.internal.pageSize.width;
    this.margin = options.margin || 20;
    this.currentY = this.margin;
    this.pageNumber = 1;
    
    // プログレス管理
    this.totalSteps = 0;
    this.completedSteps = 0;
    this.onProgress = options.onProgress || null;
    
    // メモリ管理
    this.memoryThreshold = options.memoryThreshold || 50; // MB
    this.chunkSize = options.chunkSize || 100; // 一度に処理する項目数
    
    // 日本語フォント設定
    this.setupJapaneseFont();
  }
  
  /**
   * 日本語フォントの設定
   */
  setupJapaneseFont() {
    // IPAフォントまたはNoto Sans JPのBase64エンコードデータを設定
    // 実際の実装では、フォントファイルをBase64エンコードして設定
    try {
      // this.pdf.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
      // this.pdf.setFont('NotoSansJP');
    } catch (error) {
      console.warn('日本語フォントの設定に失敗しました:', error);
    }
  }
  
  /**
   * プログレスを更新
   */
  updateProgress(step, message) {
    this.completedSteps++;
    const percentage = Math.round((this.completedSteps / this.totalSteps) * 100);
    
    if (this.onProgress) {
      this.onProgress({
        step,
        message,
        percentage,
        completed: this.completedSteps,
        total: this.totalSteps
      });
    }
  }
  
  /**
   * メモリ使用量をチェック
   */
  async checkMemory() {
    if (performance.memory) {
      const usedMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
      
      if (usedMemory > this.memoryThreshold) {
        // メモリが閾値を超えた場合、一時停止
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (global.gc) {
          global.gc();
        }
      }
    }
  }
  
  /**
   * ヘッダーを追加
   */
  async addHeader(title, subtitle) {
    this.totalSteps++;
    
    this.pdf.setFontSize(24);
    this.pdf.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 10;
    
    if (subtitle) {
      this.pdf.setFontSize(14);
      this.pdf.text(subtitle, this.pageWidth / 2, this.currentY, { align: 'center' });
      this.currentY += 10;
    }
    
    this.currentY += 10;
    this.updateProgress('header', 'ヘッダーを追加しました');
    
    await this.checkMemory();
  }
  
  /**
   * セクションを追加
   */
  async addSection(title, content) {
    this.totalSteps++;
    
    // セクションタイトル
    this.pdf.setFontSize(16);
    this.pdf.setFont(undefined, 'bold');
    
    if (this.checkNewPage(20)) {
      this.addNewPage();
    }
    
    this.pdf.text(title, this.margin, this.currentY);
    this.currentY += 10;
    
    // コンテンツ
    this.pdf.setFontSize(12);
    this.pdf.setFont(undefined, 'normal');
    
    const lines = this.pdf.splitTextToSize(content, this.pageWidth - (this.margin * 2));
    
    for (const line of lines) {
      if (this.checkNewPage(10)) {
        this.addNewPage();
      }
      
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += 7;
    }
    
    this.currentY += 10;
    this.updateProgress('section', `セクション「${title}」を追加しました`);
    
    await this.checkMemory();
  }
  
  /**
   * テーブルを段階的に追加
   */
  async addProgressiveTable(headers, data, options = {}) {
    const chunks = this.chunkArray(data, this.chunkSize);
    this.totalSteps += chunks.length;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isFirstChunk = i === 0;
      const isLastChunk = i === chunks.length - 1;
      
      // 最初のチャンクのみヘッダーを表示
      const tableOptions = {
        startY: this.currentY,
        head: isFirstChunk ? [headers] : [],
        body: chunk,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 3,
          overflow: 'linebreak',
          ...options.styles
        },
        headStyles: {
          fillColor: [45, 80, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          ...options.headStyles
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
          ...options.alternateRowStyles
        },
        ...options
      };
      
      // ページ分割を考慮
      this.pdf.autoTable(tableOptions);
      
      // 現在のY位置を更新
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
      
      this.updateProgress('table', `テーブルデータを追加中 (${i + 1}/${chunks.length})`);
      
      // メモリチェックと小休止
      await this.checkMemory();
      
      if (!isLastChunk) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }
  
  /**
   * 画像を段階的に追加
   */
  async addProgressiveImages(images, options = {}) {
    const { 
      imagesPerRow = 2,
      imageWidth = 80,
      imageHeight = 60,
      spacing = 10
    } = options;
    
    this.totalSteps += images.length;
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const col = i % imagesPerRow;
      const row = Math.floor(i / imagesPerRow);
      
      // 新しい行の場合、Y位置を確認
      if (col === 0 && this.checkNewPage(imageHeight + 20)) {
        this.addNewPage();
      }
      
      const x = this.margin + (col * (imageWidth + spacing));
      const y = this.currentY;
      
      try {
        // 画像を追加
        this.pdf.addImage(
          image.data,
          image.format || 'JPEG',
          x,
          y,
          imageWidth,
          imageHeight
        );
        
        // キャプションを追加
        if (image.caption) {
          this.pdf.setFontSize(10);
          this.pdf.text(
            image.caption,
            x + (imageWidth / 2),
            y + imageHeight + 5,
            { align: 'center' }
          );
        }
        
        // 行の最後の画像の場合、Y位置を更新
        if (col === imagesPerRow - 1 || i === images.length - 1) {
          this.currentY = y + imageHeight + 20;
        }
      } catch (error) {
        console.error(`画像の追加に失敗しました: ${image.caption}`, error);
      }
      
      this.updateProgress('image', `画像を追加中 (${i + 1}/${images.length})`);
      
      // メモリチェック
      await this.checkMemory();
      
      // 定期的に小休止
      if ((i + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 最後の行が完了していない場合のY位置調整
    const lastRowImages = images.length % imagesPerRow;
    if (lastRowImages > 0) {
      this.currentY += imageHeight + 20;
    }
  }
  
  /**
   * 新しいページが必要かチェック
   */
  checkNewPage(requiredHeight) {
    return this.currentY + requiredHeight > this.pageHeight - this.margin;
  }
  
  /**
   * 新しいページを追加
   */
  addNewPage() {
    this.pdf.addPage();
    this.pageNumber++;
    this.currentY = this.margin;
    
    // ページ番号を追加
    this.pdf.setFontSize(10);
    this.pdf.text(
      `${this.pageNumber}`,
      this.pageWidth / 2,
      this.pageHeight - 10,
      { align: 'center' }
    );
  }
  
  /**
   * 配列をチャンクに分割
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  /**
   * PDFを保存
   */
  async save(filename) {
    this.totalSteps++;
    
    // フッターを追加
    this.addFooter();
    
    this.updateProgress('save', 'PDFを保存中...');
    
    // 保存
    this.pdf.save(filename);
    
    this.updateProgress('complete', 'PDFの生成が完了しました');
  }
  
  /**
   * PDFをBlobとして取得
   */
  async getBlob() {
    this.totalSteps++;
    
    // フッターを追加
    this.addFooter();
    
    this.updateProgress('blob', 'PDFデータを生成中...');
    
    const blob = this.pdf.output('blob');
    
    this.updateProgress('complete', 'PDFの生成が完了しました');
    
    return blob;
  }
  
  /**
   * PDFをBase64として取得
   */
  async getBase64() {
    this.totalSteps++;
    
    // フッターを追加
    this.addFooter();
    
    this.updateProgress('base64', 'PDFデータを生成中...');
    
    const base64 = this.pdf.output('datauristring');
    
    this.updateProgress('complete', 'PDFの生成が完了しました');
    
    return base64;
  }
  
  /**
   * フッターを追加
   */
  addFooter() {
    const totalPages = this.pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);
      
      // 日付を追加
      this.pdf.setFontSize(10);
      this.pdf.text(
        `生成日: ${new Date().toLocaleDateString('ja-JP')}`,
        this.margin,
        this.pageHeight - 10
      );
      
      // ページ番号を再度追加（全ページ数付き）
      this.pdf.text(
        `${i} / ${totalPages}`,
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
  }
}

/**
 * 見積書PDF生成の例
 */
export const generateEstimatePDF = async (estimateData, onProgress) => {
  const generator = new ProgressivePDFGenerator({
    orientation: 'portrait',
    format: 'a4',
    margin: 20,
    onProgress
  });
  
  // ヘッダー
  await generator.addHeader(
    '御見積書',
    `見積番号: ${estimateData.estimateNumber}`
  );
  
  // 顧客情報
  await generator.addSection('お客様情報', `
    ${estimateData.customer.name} 様
    ${estimateData.customer.address}
    TEL: ${estimateData.customer.phone}
  `);
  
  // 見積内容テーブル
  const tableHeaders = ['項目', '数量', '単位', '単価', '金額'];
  const tableData = estimateData.items.map(item => [
    item.name,
    item.quantity.toString(),
    item.unit,
    `¥${item.unitPrice.toLocaleString()}`,
    `¥${item.totalPrice.toLocaleString()}`
  ]);
  
  await generator.addProgressiveTable(tableHeaders, tableData, {
    styles: {
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });
  
  // 画像がある場合
  if (estimateData.images && estimateData.images.length > 0) {
    await generator.addSection('参考画像', '');
    await generator.addProgressiveImages(estimateData.images, {
      imagesPerRow: 2,
      imageWidth: 80,
      imageHeight: 60
    });
  }
  
  // 備考
  if (estimateData.notes) {
    await generator.addSection('備考', estimateData.notes);
  }
  
  // PDFを保存
  return await generator.getBlob();
};

export default ProgressivePDFGenerator;