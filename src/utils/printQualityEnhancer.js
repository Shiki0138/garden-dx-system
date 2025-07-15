/**
 * 印刷品質向上ユーティリティ
 * 高品質印刷・プロフェッショナル出力のための最適化機能
 */

import { jsPDF } from 'jspdf';

// 印刷品質設定
export const PRINT_QUALITY_SETTINGS = {
  // 解像度設定
  resolution: {
    screen: 72, // 画面表示用
    standard: 150, // 標準印刷
    high: 300, // 高品質印刷
    professional: 600, // プロフェッショナル印刷
  },

  // カラーモード
  colorMode: {
    RGB: 'RGB',
    CMYK: 'CMYK',
    GRAYSCALE: 'Grayscale',
  },

  // 用紙設定
  paperSize: {
    A4: {
      width: 210,
      height: 297,
      printableArea: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
      },
    },
    A3: {
      width: 297,
      height: 420,
      printableArea: {
        top: 15,
        bottom: 15,
        left: 15,
        right: 15,
      },
    },
  },

  // フォント最適化設定
  fontOptimization: {
    hinting: true,
    kerning: true,
    subpixelRendering: true,
    embedFonts: true,
  },
};

/**
 * PDF印刷品質エンハンサー
 */
export class PrintQualityEnhancer {
  constructor(options = {}) {
    this.settings = {
      resolution: PRINT_QUALITY_SETTINGS.resolution.high,
      colorMode: PRINT_QUALITY_SETTINGS.colorMode.CMYK,
      paperSize: PRINT_QUALITY_SETTINGS.paperSize.A4,
      ...options,
    };
  }

  /**
   * 高品質PDFドキュメントの作成
   */
  createHighQualityPDF(options = {}) {
    const pdfOptions = {
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4',
      compress: false, // 高品質のため圧縮を無効化
      precision: 16, // 高精度
      userUnit: 1.0,
      hotfixes: ['px_scaling'], // ピクセルスケーリング修正
    };

    const doc = new jsPDF(pdfOptions);

    // 高品質設定の適用
    this.applyHighQualitySettings(doc);

    return doc;
  }

  /**
   * 高品質設定の適用
   */
  applyHighQualitySettings(doc) {
    // 解像度設定
    doc.internal.scaleFactor = this.settings.resolution / 72;

    // レンダリング品質設定
    doc.internal.write('q'); // グラフィック状態を保存
    doc.internal.write('2 J'); // ラインキャップスタイル（丸型）
    doc.internal.write('1 j'); // ラインジョインスタイル（丸型）
    doc.internal.write('0.5 w'); // 線幅の最小値

    // テキストレンダリング設定
    doc.internal.write('3 Tr'); // テキストレンダリングモード（塗りつぶし）

    // アンチエイリアシング設定
    if (doc.internal.pdf) {
      doc.internal.pdf.internal.put('/Interpolate true');
    }

    return doc;
  }

  /**
   * 画像の高品質最適化
   */
  async optimizeImageForPrint(imageUrl, options = {}) {
    const {
      targetDPI = this.settings.resolution,
      format = 'JPEG',
      quality = 0.95,
      colorSpace = this.settings.colorMode,
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 印刷用の高解像度サイズ計算
        const printWidth = options.printWidth || 100; // mm
        const printHeight = options.printHeight || (img.height / img.width) * printWidth;

        // ピクセルサイズ計算（DPIベース）
        const pixelWidth = Math.round((printWidth * targetDPI) / 25.4);
        const pixelHeight = Math.round((printHeight * targetDPI) / 25.4);

        canvas.width = pixelWidth;
        canvas.height = pixelHeight;

        // 高品質レンダリング設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // シャープネス適用（印刷用）
        if (options.sharpen) {
          ctx.filter = 'contrast(1.1) brightness(1.05)';
        }

        // 画像描画
        ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);

        // カラープロファイル変換（簡易版）
        if (colorSpace === 'CMYK') {
          this.convertToCMYK(ctx, pixelWidth, pixelHeight);
        } else if (colorSpace === 'Grayscale') {
          this.convertToGrayscale(ctx, pixelWidth, pixelHeight);
        }

        // 最適化された画像データを返す
        canvas.toBlob(
          blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                dataUrl: reader.result,
                width: printWidth,
                height: printHeight,
                pixelWidth,
                pixelHeight,
                dpi: targetDPI,
              });
            };
            reader.readAsDataURL(blob);
          },
          format === 'PNG' ? 'image/png' : 'image/jpeg',
          quality
        );
      };

      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  /**
   * CMYKカラー変換（簡易版）
   */
  convertToCMYK(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      // 簡易的なRGB→CMYK変換
      const k = 1 - Math.max(r, g, b);
      const c = (1 - r - k) / (1 - k) || 0;
      const m = (1 - g - k) / (1 - k) || 0;
      const y = (1 - b - k) / (1 - k) || 0;

      // CMYKをRGBに戻して表示（PDF内部で正しく処理される）
      data[i] = 255 * (1 - c) * (1 - k);
      data[i + 1] = 255 * (1 - m) * (1 - k);
      data[i + 2] = 255 * (1 - y) * (1 - k);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * グレースケール変換
   */
  convertToGrayscale(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // 輝度計算（印刷用の重み付け）
      const gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 印刷用マージン設定
   */
  setPrintMargins(doc, margins = {}) {
    const { top = 10, bottom = 10, left = 10, right = 10 } = margins;

    // 印刷可能領域の設定
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    return {
      printableWidth: pageWidth - left - right,
      printableHeight: pageHeight - top - bottom,
      margins: { top, bottom, left, right },
    };
  }

  /**
   * 印刷用フォント最適化
   */
  optimizeFontForPrint(doc, fontName, options = {}) {
    const { embedSubset = true, hinting = true, kerning = true } = options;

    // フォント埋め込み設定
    if (embedSubset) {
      doc.internal.events.subscribe('putFont', args => {
        if (args.font.fontName === fontName) {
          args.font.metadata = {
            ...args.font.metadata,
            embedSubset: true,
            hinting,
            kerning,
          };
        }
      });
    }
  }

  /**
   * 印刷用カラープロファイル設定
   */
  setColorProfile(doc, profile = 'Japan Color 2011 Coated') {
    // PDFメタデータにカラープロファイル情報を追加
    doc.internal.events.subscribe('putCatalog', () => {
      doc.internal.write('/OutputIntents [<<');
      doc.internal.write('/Type /OutputIntent');
      doc.internal.write('/S /GTS_PDFX');
      doc.internal.write(`/OutputConditionIdentifier (${profile})`);
      doc.internal.write('/RegistryName (http://www.color.org)');
      doc.internal.write('>>]');
    });
  }

  /**
   * 印刷品質チェック
   */
  validatePrintQuality(doc) {
    const issues = [];

    // 解像度チェック
    const scaleFactor = doc.internal.scaleFactor;
    const effectiveDPI = scaleFactor * 72;

    if (effectiveDPI < 300) {
      issues.push({
        type: 'warning',
        message: `解像度が推奨値（300DPI）を下回っています: ${effectiveDPI.toFixed(0)}DPI`,
      });
    }

    // フォントチェック
    const fonts = doc.internal.getFont();
    if (!fonts.isEmbedded) {
      issues.push({
        type: 'warning',
        message: 'フォントが埋め込まれていません',
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations: this.getPrintRecommendations(issues),
    };
  }

  /**
   * 印刷推奨事項の取得
   */
  getPrintRecommendations(issues) {
    const recommendations = [];

    if (issues.some(i => i.message.includes('解像度'))) {
      recommendations.push('高品質印刷には300DPI以上の解像度を推奨します');
    }

    if (issues.some(i => i.message.includes('フォント'))) {
      recommendations.push('フォントを埋め込むことで、印刷品質が向上します');
    }

    recommendations.push('印刷前にプリンターの設定で「高品質」モードを選択してください');
    recommendations.push('用紙は上質紙またはコート紙の使用を推奨します');

    return recommendations;
  }
}

/**
 * 印刷プリセット
 */
export const PRINT_PRESETS = {
  draft: {
    resolution: PRINT_QUALITY_SETTINGS.resolution.screen,
    colorMode: PRINT_QUALITY_SETTINGS.colorMode.RGB,
    compress: true,
    quality: 0.7,
  },
  standard: {
    resolution: PRINT_QUALITY_SETTINGS.resolution.standard,
    colorMode: PRINT_QUALITY_SETTINGS.colorMode.RGB,
    compress: true,
    quality: 0.85,
  },
  high: {
    resolution: PRINT_QUALITY_SETTINGS.resolution.high,
    colorMode: PRINT_QUALITY_SETTINGS.colorMode.CMYK,
    compress: false,
    quality: 0.95,
  },
  professional: {
    resolution: PRINT_QUALITY_SETTINGS.resolution.professional,
    colorMode: PRINT_QUALITY_SETTINGS.colorMode.CMYK,
    compress: false,
    quality: 1.0,
    sharpen: true,
  },
};

export default PrintQualityEnhancer;
