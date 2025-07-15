import jsPDF from 'jspdf';
import 'jspdf-autotable';

// 日本語フォントの設定
const setupJapaneseFont = (doc) => {
  // 必要に応じて日本語フォントを追加
  // doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
  // doc.setFont('NotoSansJP');
};

// 工程表PDF生成メインクラス
export class ProcessPDFGenerator {
  constructor(options = {}) {
    this.options = {
      format: 'a4',
      orientation: 'landscape',
      fontSize: 10,
      headerColor: '#3b82f6',
      ...options
    };
    
    this.doc = new jsPDF({
      orientation: this.options.orientation,
      unit: 'mm',
      format: this.options.format
    });
    
    setupJapaneseFont(this.doc);
  }

  // ガントチャート形式の工程表を生成
  generateGanttChart(processData) {
    const { processes, metadata } = processData;
    
    // ページ設定
    this.doc.setFontSize(16);
    this.doc.text('工程表（ガントチャート）', 20, 20);
    
    // プロジェクト情報
    this.addProjectInfo(metadata, 20, 30);
    
    // ガントチャート描画
    this.drawGanttChart(processes, 20, 60);
    
    // 凡例
    this.addLegend(20, this.doc.internal.pageSize.height - 40);
    
    // ページ番号
    this.addPageNumbers();
    
    return this.doc;
  }

  // カレンダー形式の工程表を生成
  generateCalendarView(processData) {
    const { processes, metadata } = processData;
    
    // ページ設定
    this.doc.setFontSize(16);
    this.doc.text('工程表（カレンダー形式）', 20, 20);
    
    // プロジェクト情報
    this.addProjectInfo(metadata, 20, 30);
    
    // カレンダー描画
    this.drawCalendarView(processes, 20, 60);
    
    return this.doc;
  }

  // 工程リスト形式の工程表を生成
  generateProcessList(processData) {
    const { processes, metadata } = processData;
    
    // ページ設定
    this.doc.setFontSize(16);
    this.doc.text('工程一覧表', 20, 20);
    
    // プロジェクト情報
    this.addProjectInfo(metadata, 20, 30);
    
    // 工程リスト描画
    this.drawProcessList(processes, 20, 60);
    
    return this.doc;
  }

  // プロジェクト情報を追加
  addProjectInfo(metadata, x, y) {
    this.doc.setFontSize(10);
    
    const info = [
      ['プロジェクト規模', this.getScaleText(metadata.projectScale)],
      ['開始予定日', this.formatDate(metadata.startDate)],
      ['完了予定日', this.formatDate(metadata.estimatedEndDate)],
      ['総工程数', `${metadata.totalProcesses}個`],
      ['予想期間', `${metadata.totalDuration}日`],
      ['作成日時', this.formatDate(metadata.generatedAt)]
    ];
    
    let currentY = y;
    info.forEach(([label, value]) => {
      this.doc.text(`${label}: ${value}`, x, currentY);
      currentY += 5;
    });
  }

  // ガントチャートを描画
  drawGanttChart(processes, x, y) {
    if (processes.length === 0) return;
    
    // 日付範囲を計算
    const startDate = new Date(Math.min(...processes.map(p => new Date(p.startDate))));
    const endDate = new Date(Math.max(...processes.map(p => new Date(p.endDate))));
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // チャート設定
    const chartWidth = 200;
    const chartHeight = processes.length * 8;
    const rowHeight = 8;
    const nameColumnWidth = 60;
    
    // ヘッダー描画
    this.doc.setFontSize(8);
    this.doc.text('工程名', x, y - 2);
    this.doc.text('期間', x + nameColumnWidth, y - 2);
    
    // 日付軸の描画
    this.drawDateAxis(x + nameColumnWidth, y - 8, chartWidth, startDate, endDate);
    
    // 工程バーの描画
    processes.forEach((process, index) => {
      const rowY = y + (index * rowHeight);
      
      // 工程名
      this.doc.setFontSize(8);
      this.doc.text(this.truncateText(process.name, 25), x, rowY);
      
      // 工程バー
      this.drawProcessBar(
        x + nameColumnWidth,
        rowY - 4,
        chartWidth,
        process,
        startDate,
        totalDays
      );
      
      // 進捗率
      this.doc.setFontSize(7);
      this.doc.text(`${process.progress}%`, x + nameColumnWidth + chartWidth + 5, rowY);
    });
    
    // 枠線を描画
    this.doc.rect(x, y - 6, nameColumnWidth + chartWidth, chartHeight + 6);
    this.doc.line(x + nameColumnWidth, y - 6, x + nameColumnWidth, y + chartHeight);
  }

  // 日付軸を描画
  drawDateAxis(x, y, width, startDate, endDate) {
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dayWidth = width / totalDays;
    
    // 週単位の目盛りを描画
    for (let i = 0; i <= totalDays; i += 7) {
      const axisX = x + (i * dayWidth);
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      this.doc.line(axisX, y, axisX, y + 4);
      
      if (i % 14 === 0) { // 2週間おきに日付を表示
        this.doc.setFontSize(6);
        this.doc.text(
          `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
          axisX - 5,
          y - 2
        );
      }
    }
  }

  // 工程バーを描画
  drawProcessBar(x, y, maxWidth, process, startDate, totalDays) {
    const processStart = new Date(process.startDate);
    const processEnd = new Date(process.endDate);
    const processDays = Math.ceil((processEnd - processStart) / (1000 * 60 * 60 * 24));
    const daysFromStart = Math.ceil((processStart - startDate) / (1000 * 60 * 60 * 24));
    
    const barX = x + (daysFromStart / totalDays) * maxWidth;
    const barWidth = (processDays / totalDays) * maxWidth;
    const barHeight = 6;
    
    // 背景バー
    this.doc.setFillColor(230, 230, 230);
    this.doc.rect(barX, y, barWidth, barHeight, 'F');
    
    // 進捗バー
    const progressWidth = barWidth * (process.progress / 100);
    this.doc.setFillColor(...this.getProgressColor(process.progress));
    this.doc.rect(barX, y, progressWidth, barHeight, 'F');
    
    // 枠線
    this.doc.setDrawColor(0, 0, 0);
    this.doc.rect(barX, y, barWidth, barHeight);
    
    // 工程期間テキスト
    this.doc.setFontSize(6);
    this.doc.text(
      `${processDays}日`,
      barX + barWidth / 2 - 4,
      y + barHeight / 2 + 1
    );
  }

  // カレンダービューを描画
  drawCalendarView(processes, x, y) {
    if (processes.length === 0) return;
    
    // 月ごとにグループ化
    const processsByMonth = this.groupProcessesByMonth(processes);
    
    let currentY = y;
    Object.keys(processsByMonth).forEach(monthKey => {
      const monthProcesses = processsByMonth[monthKey];
      const [year, month] = monthKey.split('-');
      
      // 月タイトル
      this.doc.setFontSize(12);
      this.doc.text(`${year}年${month}月`, x, currentY);
      currentY += 10;
      
      // カレンダーグリッドを描画
      this.drawMonthCalendar(x, currentY, parseInt(year), parseInt(month), monthProcesses);
      currentY += 50;
      
      // ページ分割チェック
      if (currentY > this.doc.internal.pageSize.height - 40) {
        this.doc.addPage();
        currentY = 20;
      }
    });
  }

  // 月カレンダーを描画
  drawMonthCalendar(x, y, year, month, processes) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const cellWidth = 25;
    const cellHeight = 20;
    
    // 曜日ヘッダー
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    this.doc.setFontSize(8);
    weekdays.forEach((day, index) => {
      this.doc.text(day, x + (index * cellWidth) + 10, y - 2);
    });
    
    // 日付セルを描画
    for (let day = 1; day <= daysInMonth; day++) {
      const cellX = x + ((firstDay + day - 1) % 7) * cellWidth;
      const cellY = y + Math.floor((firstDay + day - 1) / 7) * cellHeight;
      
      // セル枠
      this.doc.rect(cellX, cellY, cellWidth, cellHeight);
      
      // 日付
      this.doc.setFontSize(8);
      this.doc.text(day.toString(), cellX + 2, cellY + 8);
      
      // その日の工程を表示
      const dayProcesses = processes.filter(p => {
        const processDate = new Date(p.startDate);
        return processDate.getDate() === day;
      });
      
      if (dayProcesses.length > 0) {
        this.doc.setFontSize(6);
        dayProcesses.slice(0, 2).forEach((process, index) => {
          this.doc.text(
            this.truncateText(process.name, 8),
            cellX + 2,
            cellY + 12 + (index * 4)
          );
        });
        
        if (dayProcesses.length > 2) {
          this.doc.text(`+${dayProcesses.length - 2}`, cellX + 2, cellY + 20);
        }
      }
    }
  }

  // 工程リストを描画
  drawProcessList(processes, x, y) {
    const tableColumns = [
      { header: '工程名', dataKey: 'name' },
      { header: 'カテゴリ', dataKey: 'category' },
      { header: '開始日', dataKey: 'startDate' },
      { header: '終了日', dataKey: 'endDate' },
      { header: '期間', dataKey: 'duration' },
      { header: '進捗', dataKey: 'progress' },
      { header: '状態', dataKey: 'status' }
    ];
    
    const tableData = processes.map(process => ({
      name: process.name,
      category: this.getCategoryText(process.category),
      startDate: this.formatDate(process.startDate),
      endDate: this.formatDate(process.endDate),
      duration: `${process.duration}日`,
      progress: `${process.progress}%`,
      status: this.getStatusText(process.status)
    }));
    
    this.doc.autoTable({
      startY: y,
      head: [tableColumns.map(col => col.header)],
      body: tableData.map(row => tableColumns.map(col => row[col.dataKey])),
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 40 }, // 工程名
        1: { cellWidth: 25 }, // カテゴリ
        2: { cellWidth: 25 }, // 開始日
        3: { cellWidth: 25 }, // 終了日
        4: { cellWidth: 15 }, // 期間
        5: { cellWidth: 15 }, // 進捗
        6: { cellWidth: 20 }  // 状態
      }
    });
  }

  // 凡例を追加
  addLegend(x, y) {
    this.doc.setFontSize(10);
    this.doc.text('凡例', x, y);
    
    const legendItems = [
      { color: [34, 197, 94], label: '完了' },
      { color: [245, 158, 11], label: '進行中' },
      { color: [156, 163, 175], label: '未開始' },
      { color: [239, 68, 68], label: '遅延' }
    ];
    
    let currentX = x;
    legendItems.forEach(item => {
      // 色サンプル
      this.doc.setFillColor(...item.color);
      this.doc.rect(currentX, y + 2, 4, 4, 'F');
      
      // ラベル
      this.doc.setFontSize(8);
      this.doc.text(item.label, currentX + 6, y + 6);
      
      currentX += 30;
    });
  }

  // ページ番号を追加
  addPageNumbers() {
    const pageCount = this.doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.text(
        `${i} / ${pageCount}`,
        this.doc.internal.pageSize.width - 20,
        this.doc.internal.pageSize.height - 10
      );
    }
  }

  // ヘルパーメソッド
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  getScaleText(scale) {
    const scales = {
      small: '小規模',
      medium: '中規模',
      large: '大規模',
      xlarge: '超大規模'
    };
    return scales[scale] || '不明';
  }

  getCategoryText(category) {
    const categories = {
      survey: '調査',
      design: '設計',
      procurement: '調達',
      preparation: '準備',
      demolition: '解体',
      earthwork: '土工',
      foundation: '基礎',
      drainage: '排水',
      electrical: '電気',
      structures: '構造',
      paving: '舗装',
      waterfeatures: '水景',
      planting: '植栽',
      lawn: '芝生',
      finishing: '仕上',
      maintenance: '保守'
    };
    return categories[category] || category;
  }

  getStatusText(status) {
    const statuses = {
      pending: '未開始',
      'in-progress': '進行中',
      completed: '完了',
      overdue: '遅延'
    };
    return statuses[status] || status;
  }

  getProgressColor(progress) {
    if (progress === 100) return [34, 197, 94]; // green
    if (progress > 0) return [245, 158, 11]; // orange
    return [156, 163, 175]; // gray
  }

  groupProcessesByMonth(processes) {
    const grouped = {};
    
    processes.forEach(process => {
      const date = new Date(process.startDate);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(process);
    });
    
    return grouped;
  }
}

// 工程表PDF生成のメイン関数
export const generateProcessPDF = async (processData, options = {}) => {
  const {
    format = 'gantt', // 'gantt', 'calendar', 'list'
    filename = 'process-schedule.pdf',
    download = true
  } = options;
  
  const generator = new ProcessPDFGenerator(options);
  let doc;
  
  switch (format) {
    case 'gantt':
      doc = generator.generateGanttChart(processData);
      break;
    case 'calendar':
      doc = generator.generateCalendarView(processData);
      break;
    case 'list':
      doc = generator.generateProcessList(processData);
      break;
    default:
      doc = generator.generateGanttChart(processData);
  }
  
  if (download) {
    doc.save(filename);
  }
  
  return doc;
};

// 工程表データの検証
export const validateProcessData = (processData) => {
  if (!processData || typeof processData !== 'object') {
    throw new Error('工程データが無効です');
  }
  
  if (!processData.processes || !Array.isArray(processData.processes)) {
    throw new Error('工程リストが無効です');
  }
  
  if (processData.processes.length === 0) {
    throw new Error('工程が存在しません');
  }
  
  // 各工程の必須フィールドチェック
  processData.processes.forEach((process, index) => {
    if (!process.name) {
      throw new Error(`工程${index + 1}: 工程名が必要です`);
    }
    
    if (!process.startDate) {
      throw new Error(`工程${index + 1}: 開始日が必要です`);
    }
    
    if (!process.endDate) {
      throw new Error(`工程${index + 1}: 終了日が必要です`);
    }
    
    if (new Date(process.startDate) > new Date(process.endDate)) {
      throw new Error(`工程${index + 1}: 開始日が終了日より後になっています`);
    }
  });
  
  return true;
};

// 工程表印刷用の設定
export const printProcessSchedule = (processData, options = {}) => {
  const {
    format = 'gantt',
    paperSize = 'A4',
    orientation = 'landscape'
  } = options;
  
  return new Promise((resolve, reject) => {
    try {
      validateProcessData(processData);
      
      const generator = new ProcessPDFGenerator({
        format: paperSize.toLowerCase(),
        orientation: orientation.toLowerCase()
      });
      
      let doc;
      switch (format) {
        case 'gantt':
          doc = generator.generateGanttChart(processData);
          break;
        case 'calendar':
          doc = generator.generateCalendarView(processData);
          break;
        case 'list':
          doc = generator.generateProcessList(processData);
          break;
        default:
          doc = generator.generateGanttChart(processData);
      }
      
      // 印刷用にブラウザで開く
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      const printWindow = window.open(url, '_blank');
      printWindow.onload = () => {
        printWindow.print();
        URL.revokeObjectURL(url);
      };
      
      resolve(doc);
    } catch (error) {
      reject(error);
    }
  });
};

// 工程表メール送信用のデータ準備
export const prepareProcessPDFForEmail = async (processData, options = {}) => {
  const {
    format = 'gantt',
    filename = 'process-schedule.pdf'
  } = options;
  
  validateProcessData(processData);
  
  const generator = new ProcessPDFGenerator();
  let doc;
  
  switch (format) {
    case 'gantt':
      doc = generator.generateGanttChart(processData);
      break;
    case 'calendar':
      doc = generator.generateCalendarView(processData);
      break;
    case 'list':
      doc = generator.generateProcessList(processData);
      break;
    default:
      doc = generator.generateGanttChart(processData);
  }
  
  // Base64エンコードされたPDFデータを返す
  const pdfData = doc.output('datauristring');
  
  return {
    filename,
    data: pdfData,
    mimeType: 'application/pdf'
  };
};

export default {
  generateProcessPDF,
  validateProcessData,
  printProcessSchedule,
  prepareProcessPDFForEmail,
  ProcessPDFGenerator
};