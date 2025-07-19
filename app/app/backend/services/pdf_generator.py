"""
Garden 造園業向け統合業務管理システム
PDF帳票生成サービス - 造園業界標準準拠
緊急対応：業界標準に完全準拠した見積書PDF生成
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import black, white, gray
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.platypus.flowables import PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from datetime import datetime, date
from decimal import Decimal
import os
from typing import Dict, List, Any, Optional, Tuple
from io import BytesIO
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading
import gc
import logging
from functools import lru_cache
import time

# ロギング設定
logger = logging.getLogger(__name__)

# 日本語フォント設定（キャッシュ対応）
@lru_cache(maxsize=1)
def get_japanese_font():
    """日本語フォントの取得（キャッシュ対応）"""
    try:
        pdfmetrics.registerFont(TTFont('NotoSansJP', '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc'))
        return 'NotoSansJP'
    except:
        return 'HeiseiKakuGo-W5'  # フォールバック

FONT_NAME = get_japanese_font()

# パフォーマンス監視デコレータ
def measure_performance(func):
    """関数の実行時間とメモリ使用量を測定"""
    def wrapper(*args, **kwargs):
        start_time = time.time()
        start_memory = gc.get_stats()[0].get('collected', 0)
        
        result = func(*args, **kwargs)
        
        end_time = time.time()
        end_memory = gc.get_stats()[0].get('collected', 0)
        
        duration = end_time - start_time
        memory_delta = end_memory - start_memory
        
        logger.info(f"{func.__name__} - 実行時間: {duration:.2f}秒, メモリ変化: {memory_delta}バイト")
        
        return result
    return wrapper


class PDFCache:
    """PDF生成結果のキャッシュ管理"""
    def __init__(self, max_size: int = 50 * 1024 * 1024):  # 50MB
        self.cache = {}
        self.max_size = max_size
        self.current_size = 0
        self.lock = threading.Lock()
        self.hit_count = 0
        self.miss_count = 0
    
    def get_key(self, data: Dict[str, Any]) -> str:
        """データからキャッシュキーを生成"""
        # シンプルなハッシュ生成
        data_str = str(sorted(data.items()))
        return str(hash(data_str))
    
    def get(self, key: str) -> Optional[bytes]:
        """キャッシュから取得"""
        with self.lock:
            if key in self.cache:
                self.hit_count += 1
                entry = self.cache[key]
                entry['last_accessed'] = time.time()
                return entry['data']
            self.miss_count += 1
            return None
    
    def set(self, key: str, data: bytes) -> None:
        """キャッシュに保存"""
        with self.lock:
            size = len(data)
            
            # サイズ制限チェック
            while self.current_size + size > self.max_size and self.cache:
                # LRU: 最も古いエントリを削除
                oldest_key = min(self.cache.keys(), 
                               key=lambda k: self.cache[k]['last_accessed'])
                oldest_size = len(self.cache[oldest_key]['data'])
                del self.cache[oldest_key]
                self.current_size -= oldest_size
            
            self.cache[key] = {
                'data': data,
                'created': time.time(),
                'last_accessed': time.time(),
                'size': size
            }
            self.current_size += size
    
    def get_stats(self) -> Dict[str, Any]:
        """統計情報を取得"""
        hit_rate = self.hit_count / (self.hit_count + self.miss_count) if (self.hit_count + self.miss_count) > 0 else 0
        return {
            'size': len(self.cache),
            'current_size_mb': self.current_size / 1024 / 1024,
            'max_size_mb': self.max_size / 1024 / 1024,
            'hit_count': self.hit_count,
            'miss_count': self.miss_count,
            'hit_rate': hit_rate
        }


class GardenEstimatePDFGenerator:
    """造園業界標準準拠見積書PDF生成クラス（最適化版）"""
    
    # クラス変数でキャッシュを共有
    _cache = PDFCache()
    _style_cache = {}
    _executor = ThreadPoolExecutor(max_workers=3)
    
    def __init__(self):
        self.page_width, self.page_height = A4
        self.margin = 20 * mm
        self.styles = self._create_custom_styles()
        self.enable_cache = True
        self.enable_parallel = True
        
    @lru_cache(maxsize=1)
    def _create_custom_styles(self):
        """造園業界標準スタイル定義（キャッシュ対応）"""
        # スタイルキャッシュチェック
        cache_key = 'garden_styles_v1'
        if cache_key in self._style_cache:
            return self._style_cache[cache_key]
        
        styles = getSampleStyleSheet()
        
        # 表紙タイトル（造園業界標準）
        styles.add(ParagraphStyle(
            name='EstimateTitle',
            parent=styles['Title'],
            fontName=FONT_NAME,
            fontSize=24,
            alignment=TA_CENTER,
            spaceAfter=30,
            textColor=colors.Color(0.2, 0.3, 0.6)  # 紺色
        ))
        
        # 会社名（大きく目立つ）
        styles.add(ParagraphStyle(
            name='CompanyName',
            parent=styles['Normal'],
            fontName=FONT_NAME,
            fontSize=18,
            alignment=TA_LEFT,
            spaceBefore=10,
            spaceAfter=5,
            textColor=colors.Color(0.1, 0.1, 0.4)
        ))
        
        # 見積番号（業界標準形式）
        styles.add(ParagraphStyle(
            name='EstimateNumber',
            parent=styles['Normal'],
            fontName=FONT_NAME,
            fontSize=14,
            alignment=TA_RIGHT,
            spaceBefore=5,
            textColor=colors.Color(0.6, 0.1, 0.1)  # 赤系
        ))
        
        # セクションヘッダー
        styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=styles['Heading2'],
            fontName=FONT_NAME,
            fontSize=16,
            alignment=TA_LEFT,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.Color(0.2, 0.4, 0.2)  # 緑系
        ))
        
        # 標準本文
        styles.add(ParagraphStyle(
            name='BodyText',
            parent=styles['Normal'],
            fontName=FONT_NAME,
            fontSize=11,
            alignment=TA_LEFT,
            spaceBefore=3,
            spaceAfter=3
        ))
        
        # 金額表示（右寄せ、太字）
        styles.add(ParagraphStyle(
            name='AmountText',
            parent=styles['Normal'],
            fontName=FONT_NAME,
            fontSize=11,
            alignment=TA_RIGHT,
            fontWeight='bold'
        ))
        
        # キャッシュに保存
        self._style_cache[cache_key] = styles
        return styles
    
    @measure_performance
    def generate_estimate_pdf(self, estimate_data: Dict[str, Any]) -> BytesIO:
        """
        造園業界標準準拠見積書PDF生成（最適化版）
        
        Args:
            estimate_data: 見積データ
            
        Returns:
            BytesIO: PDF バイナリデータ
        """
        # キャッシュチェック
        if self.enable_cache:
            cache_key = self._cache.get_key(estimate_data)
            cached_pdf = self._cache.get(cache_key)
            if cached_pdf:
                logger.info("PDFキャッシュヒット")
                return BytesIO(cached_pdf)
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin,
            title=f"見積書_{estimate_data.get('estimate_number', '')}"
        )
        
        # PDF構成要素
        story = []
        
        if self.enable_parallel:
            # 並列処理でページ生成
            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = [
                    executor.submit(self._create_cover_page, estimate_data),
                    executor.submit(self._create_summary_page, estimate_data),
                    executor.submit(self._create_detail_page, estimate_data),
                    executor.submit(self._create_terms_page, estimate_data)
                ]
                
                pages = [future.result() for future in futures]
                
                # ページ結合
                for i, page_elements in enumerate(pages):
                    story.extend(page_elements)
                    if i < len(pages) - 1:
                        story.append(PageBreak())
        else:
            # 通常の逐次処理
            story.extend(self._create_cover_page(estimate_data))
            story.append(PageBreak())
            story.extend(self._create_summary_page(estimate_data))
            story.append(PageBreak())
            story.extend(self._create_detail_page(estimate_data))
            story.append(PageBreak())
            story.extend(self._create_terms_page(estimate_data))
        
        # PDF生成
        doc.build(story)
        buffer.seek(0)
        
        # キャッシュに保存
        if self.enable_cache:
            pdf_data = buffer.getvalue()
            self._cache.set(cache_key, pdf_data)
            buffer.seek(0)
        
        # メモリ最適化
        gc.collect()
        
        return buffer
    
    def _create_cover_page(self, estimate_data: Dict[str, Any]) -> List:
        """表紙ページ生成（造園業界標準レイアウト）"""
        elements = []
        
        # 1. ヘッダー部分
        header_table = Table([
            [
                # 左側：会社ロゴエリア
                self._get_company_logo_cell(estimate_data.get('company', {})),
                # 右側：見積番号・日付
                self._get_estimate_info_cell(estimate_data)
            ]
        ], colWidths=[100*mm, 70*mm])
        
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'TOP'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(header_table)
        elements.append(Spacer(1, 20*mm))
        
        # 2. 見積書タイトル（業界標準）
        title = Paragraph("見 積 書", self.styles['EstimateTitle'])
        elements.append(title)
        elements.append(Spacer(1, 15*mm))
        
        # 3. 顧客情報部分
        customer_info = self._create_customer_info_section(estimate_data.get('customer', {}))
        elements.append(customer_info)
        elements.append(Spacer(1, 20*mm))
        
        # 4. 件名・現場情報
        project_info = self._create_project_info_section(estimate_data)
        elements.append(project_info)
        elements.append(Spacer(1, 20*mm))
        
        # 5. 見積金額（大きく表示）
        amount_section = self._create_amount_summary_section(estimate_data)
        elements.append(amount_section)
        elements.append(Spacer(1, 20*mm))
        
        # 6. 有効期限・支払条件
        terms_section = self._create_cover_terms_section(estimate_data)
        elements.append(terms_section)
        
        return elements
    
    def _get_company_logo_cell(self, company_data: Dict[str, Any]) -> Table:
        """会社ロゴ・情報セル（造園業界標準）"""
        company_info = []
        
        # ロゴがあれば表示
        logo_path = company_data.get('logo_url')
        if logo_path and os.path.exists(logo_path):
            try:
                logo = Image(logo_path, width=30*mm, height=30*mm)
                company_info.append([logo])
            except:
                pass
        
        # 会社名（大きく表示）
        company_name = company_data.get('company_name', '株式会社○○造園')
        company_info.append([Paragraph(company_name, self.styles['CompanyName'])])
        
        # 住所・連絡先
        address = company_data.get('address', '')
        if address:
            company_info.append([Paragraph(f"〒{address}", self.styles['BodyText'])])
        
        phone = company_data.get('phone', '')
        if phone:
            company_info.append([Paragraph(f"TEL: {phone}", self.styles['BodyText'])])
        
        email = company_data.get('email', '')
        if email:
            company_info.append([Paragraph(f"E-mail: {email}", self.styles['BodyText'])])
        
        return Table(company_info, colWidths=[100*mm])
    
    def _get_estimate_info_cell(self, estimate_data: Dict[str, Any]) -> Table:
        """見積情報セル（番号・日付）"""
        info_data = [
            [Paragraph(f"見積No. {estimate_data.get('estimate_number', '')}", 
                      self.styles['EstimateNumber'])],
            [Paragraph(f"見積日: {self._format_date(estimate_data.get('estimate_date'))}", 
                      self.styles['BodyText'])],
        ]
        
        valid_until = estimate_data.get('valid_until')
        if valid_until:
            info_data.append([Paragraph(f"有効期限: {self._format_date(valid_until)}", 
                                      self.styles['BodyText'])])
        
        return Table(info_data, colWidths=[70*mm])
    
    def _create_customer_info_section(self, customer_data: Dict[str, Any]) -> Table:
        """顧客情報セクション（造園業界標準）"""
        customer_name = customer_data.get('customer_name', '')
        customer_address = customer_data.get('address', '')
        customer_phone = customer_data.get('phone', '')
        
        data = [
            [Paragraph("お客様", self.styles['SectionHeader']), ''],
            [Paragraph(customer_name + " 様", self.styles['BodyText']), ''],
        ]
        
        if customer_address:
            data.append([Paragraph(f"ご住所: {customer_address}", self.styles['BodyText']), ''])
        
        if customer_phone:
            data.append([Paragraph(f"お電話: {customer_phone}", self.styles['BodyText']), ''])
        
        table = Table(data, colWidths=[170*mm, 10*mm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        return table
    
    def _create_project_info_section(self, estimate_data: Dict[str, Any]) -> Table:
        """工事件名・現場情報セクション"""
        estimate_name = estimate_data.get('estimate_name', '')
        site_address = estimate_data.get('site_address', '')
        
        data = [
            [Paragraph("件　名", self.styles['SectionHeader']), 
             Paragraph(estimate_name, self.styles['BodyText'])],
        ]
        
        if site_address:
            data.append([Paragraph("工事場所", self.styles['SectionHeader']), 
                        Paragraph(site_address, self.styles['BodyText'])])
        
        table = Table(data, colWidths=[30*mm, 140*mm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        return table
    
    def _create_amount_summary_section(self, estimate_data: Dict[str, Any]) -> Table:
        """見積金額サマリーセクション（消費税対応）"""
        subtotal = estimate_data.get('subtotal_amount', 0)
        adjustment = estimate_data.get('adjustment_amount', 0)
        total_before_tax = subtotal + adjustment
        
        # 消費税計算（標準税率10%、軽減税率8%対応）
        tax_rate_standard = 0.10
        tax_rate_reduced = 0.08
        
        # 項目別税率判定（簡略化：植栽関連は軽減税率対象外、資材等は標準税率）
        standard_tax_amount = int(total_before_tax * tax_rate_standard)
        total_with_tax = total_before_tax + standard_tax_amount
        
        # 金額表示テーブル
        amount_data = [
            ['工事金額（税抜）', f"¥ {total_before_tax:,}"],
            ['消費税（10%）', f"¥ {standard_tax_amount:,}"],
            ['', ''],  # 空行
            ['合計金額（税込）', f"¥ {total_with_tax:,}"],
        ]
        
        table = Table(amount_data, colWidths=[60*mm, 60*mm])
        table.setStyle(TableStyle([
            # 工事金額行
            ('FONTNAME', (0, 0), (-1, 1), FONT_NAME),
            ('FONTSIZE', (0, 0), (-1, 1), 12),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            
            # 合計金額行（強調）
            ('FONTNAME', (0, 3), (-1, 3), FONT_NAME),
            ('FONTSIZE', (0, 3), (-1, 3), 16),
            ('TEXTCOLOR', (0, 3), (-1, 3), colors.Color(0.6, 0.1, 0.1)),
            ('BOX', (0, 3), (-1, 3), 2, colors.Color(0.6, 0.1, 0.1)),
            ('BACKGROUND', (0, 3), (-1, 3), colors.Color(0.95, 0.95, 0.95)),
            
            # 全体
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        return table
    
    def _create_cover_terms_section(self, estimate_data: Dict[str, Any]) -> Table:
        """表紙用条件セクション"""
        valid_until = estimate_data.get('valid_until')
        
        terms_data = [
            ['■ 見積有効期限', self._format_date(valid_until) if valid_until else '見積日より30日間'],
            ['■ 支払条件', '工事完了後、請求書発行より30日以内'],
            ['■ 工事期間', '契約後、別途協議'],
            ['■ その他', '詳細は別紙特記事項をご確認ください'],
        ]
        
        table = Table(terms_data, colWidths=[40*mm, 130*mm])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        return table
    
    def _create_summary_page(self, estimate_data: Dict[str, Any]) -> List:
        """内訳書ページ（カテゴリ別サマリー）"""
        elements = []
        
        # ページタイトル
        title = Paragraph("工事費内訳書", self.styles['EstimateTitle'])
        elements.append(title)
        elements.append(Spacer(1, 20*mm))
        
        # カテゴリ別集計データの作成
        category_summary = self._calculate_category_summary(estimate_data.get('items', []))
        
        # 内訳テーブル
        summary_data = [
            ['工事項目', '金額（税抜）', '備考']
        ]
        
        total_amount = 0
        for category, amount in category_summary.items():
            summary_data.append([
                category,
                f"¥ {amount:,}",
                ''
            ])
            total_amount += amount
        
        # 調整額
        adjustment = estimate_data.get('adjustment_amount', 0)
        if adjustment != 0:
            adjustment_label = '値引き' if adjustment < 0 else '追加費用'
            summary_data.append([
                adjustment_label,
                f"¥ {adjustment:,}",
                ''
            ])
            total_amount += adjustment
        
        # 小計行
        summary_data.append(['小計', f"¥ {total_amount:,}", ''])
        
        # 消費税・合計
        tax_amount = int(total_amount * 0.10)
        final_total = total_amount + tax_amount
        
        summary_data.append(['消費税（10%）', f"¥ {tax_amount:,}", ''])
        summary_data.append(['合計金額（税込）', f"¥ {final_total:,}", ''])
        
        # テーブル作成
        table = Table(summary_data, colWidths=[80*mm, 50*mm, 40*mm])
        table.setStyle(TableStyle([
            # ヘッダー
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.8, 0.8, 0.8)),
            ('FONTNAME', (0, 0), (-1, 0), FONT_NAME),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # データ行
            ('FONTNAME', (0, 1), (-1, -3), FONT_NAME),
            ('FONTSIZE', (0, 1), (-1, -3), 11),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('ALIGN', (2, 1), (2, -1), 'LEFT'),
            
            # 小計以降（強調）
            ('FONTNAME', (0, -3), (-1, -1), FONT_NAME),
            ('FONTSIZE', (0, -3), (-1, -1), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.Color(0.9, 0.9, 0.9)),
            
            # 罫線
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        
        return elements
    
    @measure_performance
    def _create_detail_page(self, estimate_data: Dict[str, Any]) -> List:
        """明細書ページ（業界標準項目順序・最適化版）"""
        elements = []
        
        # ページタイトル
        title = Paragraph("工事明細書", self.styles['EstimateTitle'])
        elements.append(title)
        elements.append(Spacer(1, 15*mm))
        
        # 明細テーブルヘッダー
        detail_data = [
            ['項目', '規格・仕様', '数量', '単位', '単価', '金額']
        ]
        
        # 明細データの並び順（造園業界標準）
        items = estimate_data.get('items', [])
        sorted_items = self._sort_items_by_industry_standard(items)
        
        # バッチ処理でパフォーマンス向上
        batch_size = 50
        for i in range(0, len(sorted_items), batch_size):
            batch = sorted_items[i:i + batch_size]
            
            for item in batch:
                if item.get('item_type') == 'header':
                    # 見出し行
                    detail_data.append([
                        f"【{item.get('item_description', '')}】",
                        '', '', '', '', ''
                    ])
                elif item.get('item_type') == 'item':
                    # 明細行
                    quantity = item.get('quantity', 0)
                    unit_price = item.get('unit_price', 0)
                    line_total = quantity * unit_price + item.get('line_item_adjustment', 0)
                    
                    detail_data.append([
                        f"  {item.get('item_description', '')}",
                        item.get('specification', ''),
                        f"{quantity:g}" if quantity else '',
                        item.get('unit', ''),
                        f"{unit_price:,}" if unit_price else '',
                        f"{line_total:,}"
                    ])
        
        # テーブル作成
        table = Table(detail_data, colWidths=[40*mm, 35*mm, 20*mm, 15*mm, 25*mm, 25*mm])
        table.setStyle(TableStyle([
            # ヘッダー
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.8, 0.8, 0.8)),
            ('FONTNAME', (0, 0), (-1, 0), FONT_NAME),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # データ行
            ('FONTNAME', (0, 1), (-1, -1), FONT_NAME),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (1, -1), 'LEFT'),      # 項目・仕様
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),     # 数量
            ('ALIGN', (3, 1), (3, -1), 'CENTER'),    # 単位
            ('ALIGN', (4, 1), (5, -1), 'RIGHT'),     # 単価・金額
            
            # 罫線
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _create_terms_page(self, estimate_data: Dict[str, Any]) -> List:
        """特記事項・約款ページ（造園業界慣習）"""
        elements = []
        
        # ページタイトル
        title = Paragraph("特記事項・工事約款", self.styles['EstimateTitle'])
        elements.append(title)
        elements.append(Spacer(1, 20*mm))
        
        # 造園業界標準の特記事項
        standard_terms = [
            "■ 工事期間について",
            "・工事期間は天候により変動する場合があります",
            "・植栽工事は植栽適期を考慮し、時期を調整する場合があります",
            "",
            "■ 植栽材料について", 
            "・植栽材料は生き物のため、形状・枝ぶり等に多少の違いがあります",
            "・枯れ保証期間は植栽完了日より1年間とします（天災・人災は除く）",
            "・移植などによる根回し期間が必要な場合は別途ご相談します",
            "",
            "■ 土工事・基盤整備について",
            "・既存構造物の撤去費は現地確認後、別途見積いたします", 
            "・地中埋設物が発見された場合は別途協議とします",
            "・残土処分費は別途申し受けます",
            "",
            "■ その他",
            "・工事範囲外の復旧費用は含まれておりません",
            "・仮設工事が必要な場合は別途見積いたします",
            "・近隣への配慮を十分に行い施工いたします",
        ]
        
        # カスタム特記事項があれば追加
        custom_notes = estimate_data.get('notes', '')
        if custom_notes:
            standard_terms.extend([
                "",
                "■ その他特記事項",
                custom_notes
            ])
        
        # 支払条件・約款
        payment_terms = [
            "",
            "【お支払い・契約条件】",
            "・お支払い：工事完了後、請求書発行より30日以内にお振込みください",
            "・契約：本見積書にご同意いただけましたら、正式な工事契約書を取り交わします",
            "・変更：工事内容に変更が生じた場合は、別途変更契約を結ばせていただきます",
            "・保険：工事期間中は当社にて適切な保険に加入いたします",
            "",
            "ご不明な点がございましたら、お気軽にお問い合わせください。",
            "今後ともよろしくお願い申し上げます。"
        ]
        
        # 全ての条項をParagraphに変換
        all_terms = standard_terms + payment_terms
        for term in all_terms:
            if term == "":
                elements.append(Spacer(1, 5*mm))
            elif term.startswith("■") or term.startswith("【"):
                elements.append(Paragraph(term, self.styles['SectionHeader']))
            else:
                elements.append(Paragraph(term, self.styles['BodyText']))
        
        return elements
    
    def _calculate_category_summary(self, items: List[Dict]) -> Dict[str, int]:
        """カテゴリ別金額集計"""
        category_totals = {}
        current_category = "その他"
        
        for item in items:
            if item.get('item_type') == 'header':
                current_category = item.get('item_description', 'その他')
                if current_category not in category_totals:
                    category_totals[current_category] = 0
            elif item.get('item_type') == 'item':
                quantity = item.get('quantity', 0)
                unit_price = item.get('unit_price', 0)
                adjustment = item.get('line_item_adjustment', 0)
                line_total = quantity * unit_price + adjustment
                
                if current_category not in category_totals:
                    category_totals[current_category] = 0
                category_totals[current_category] += line_total
        
        return category_totals
    
    def _sort_items_by_industry_standard(self, items: List[Dict]) -> List[Dict]:
        """造園業界標準の項目順序でソート"""
        # 造園業界標準の工事順序
        category_order = {
            '仮設工事': 1,
            '土工事': 2, 
            '基盤整備': 3,
            '植栽工事': 4,
            '外構工事': 5,
            '石工事': 6,
            '園路工事': 7,
            '設備工事': 8,
            'その他工事': 9,
            '諸経費': 10
        }
        
        def get_sort_key(item):
            if item.get('item_type') == 'header':
                desc = item.get('item_description', '')
                for category, order in category_order.items():
                    if category in desc:
                        return (order, 0)
                return (99, 0)
            else:
                return (item.get('sort_order', 999), 1)
        
        return sorted(items, key=get_sort_key)
    
    def _format_date(self, date_value) -> str:
        """日付フォーマット（和暦対応）"""
        if not date_value:
            return ""
        
        if isinstance(date_value, str):
            try:
                date_obj = datetime.strptime(date_value, '%Y-%m-%d').date()
            except:
                return date_value
        elif isinstance(date_value, datetime):
            date_obj = date_value.date()
        elif isinstance(date_value, date):
            date_obj = date_value
        else:
            return str(date_value)
        
        # 西暦表示
        return f"{date_obj.year}年{date_obj.month}月{date_obj.day}日"
    
    async def generate_batch_pdfs(self, estimates_data: List[Dict[str, Any]], 
                                 max_concurrent: int = 3) -> List[BytesIO]:
        """
        複数の見積書PDFを並列生成（非同期対応）
        
        Args:
            estimates_data: 見積データのリスト
            max_concurrent: 最大同時実行数
            
        Returns:
            List[BytesIO]: 生成されたPDFのリスト
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def generate_with_limit(data):
            async with semaphore:
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(
                    self._executor, 
                    self.generate_estimate_pdf, 
                    data
                )
        
        tasks = [generate_with_limit(data) for data in estimates_data]
        return await asyncio.gather(*tasks)
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """パフォーマンス統計情報を取得"""
        return {
            'cache_stats': self._cache.get_stats(),
            'style_cache_size': len(self._style_cache),
            'thread_pool_active': self._executor._threads,
        }
    
    def clear_cache(self):
        """キャッシュをクリア"""
        self._cache.cache.clear()
        self._cache.current_size = 0
        self._cache.hit_count = 0
        self._cache.miss_count = 0
        self._style_cache.clear()
        gc.collect()
        logger.info("PDFキャッシュをクリアしました")