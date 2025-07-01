"""
Garden DX - PDF帳票生成モジュール
造園業向け見積書・請求書PDF出力機能
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.platypus.flowables import KeepTogether
import os
from datetime import datetime
from typing import Dict, List, Any
import io

class EstimatePDFGenerator:
    """見積書PDF生成クラス"""
    
    def __init__(self):
        self.width, self.height = A4
        self.margin = 20 * mm
        
        # 日本語フォント設定（システムにインストールされている場合）
        try:
            # macOS/Linux用
            font_paths = [
                '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
                '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
                '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.otf'
            ]
            
            for font_path in font_paths:
                if os.path.exists(font_path):
                    pdfmetrics.registerFont(TTFont('NotoSans', font_path))
                    break
            else:
                # フォールバック
                pdfmetrics.registerFont(TTFont('NotoSans', 'DejaVuSans.ttf'))
        except:
            # フォントが見つからない場合はデフォルトを使用
            pass
    
    def generate_estimate_pdf(self, estimate_data: Dict[str, Any], items: List[Dict[str, Any]], 
                            company_data: Dict[str, Any], customer_data: Dict[str, Any]) -> bytes:
        """見積書PDF生成"""
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        # スタイル設定
        styles = self._get_styles()
        story = []
        
        # 1ページ目: 表紙
        story.extend(self._create_cover_page(estimate_data, company_data, customer_data, styles))
        story.append(PageBreak())
        
        # 2ページ目: 内訳書（カテゴリ別サマリー）
        story.extend(self._create_summary_page(items, styles))
        story.append(PageBreak())
        
        # 3ページ目: 明細書
        story.extend(self._create_detail_page(items, styles))
        story.append(PageBreak())
        
        # 4ページ目: 注意事項
        story.extend(self._create_terms_page(styles))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def _get_styles(self):
        """スタイル設定"""
        styles = getSampleStyleSheet()
        
        # 日本語対応スタイル
        styles.add(ParagraphStyle(
            name='JapaneseTitle',
            parent=styles['Heading1'],
            fontName='NotoSans',
            fontSize=24,
            alignment=TA_CENTER,
            spaceAfter=20
        ))
        
        styles.add(ParagraphStyle(
            name='JapaneseHeading',
            parent=styles['Heading2'],
            fontName='NotoSans',
            fontSize=16,
            alignment=TA_LEFT,
            spaceAfter=12
        ))
        
        styles.add(ParagraphStyle(
            name='JapaneseNormal',
            parent=styles['Normal'],
            fontName='NotoSans',
            fontSize=10,
            alignment=TA_LEFT
        ))
        
        styles.add(ParagraphStyle(
            name='JapaneseRight',
            parent=styles['Normal'],
            fontName='NotoSans',
            fontSize=10,
            alignment=TA_RIGHT
        ))
        
        styles.add(ParagraphStyle(
            name='JapaneseCenter',
            parent=styles['Normal'],
            fontName='NotoSans',
            fontSize=10,
            alignment=TA_CENTER
        ))
        
        return styles
    
    def _create_cover_page(self, estimate_data, company_data, customer_data, styles):
        """表紙ページ作成"""
        content = []
        
        # タイトル
        content.append(Paragraph("御　見　積　書", styles['JapaneseTitle']))
        content.append(Spacer(1, 30))
        
        # 顧客情報（左側）
        customer_info = f"""
        <b>{customer_data.get('customer_name', '')}</b> 様<br/>
        {customer_data.get('address', '')}<br/>
        """
        content.append(Paragraph(customer_info, styles['JapaneseNormal']))
        content.append(Spacer(1, 20))
        
        # 見積情報テーブル
        estimate_info_data = [
            ['見積番号', estimate_data.get('estimate_number', '')],
            ['見積日', estimate_data.get('estimate_date', '')],
            ['有効期限', estimate_data.get('valid_until', '')],
            ['案件名', estimate_data.get('project_name', '造園工事')]
        ]
        
        estimate_info_table = Table(
            estimate_info_data,
            colWidths=[40*mm, 80*mm]
        )
        estimate_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'NotoSans'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey)
        ]))
        content.append(estimate_info_table)
        content.append(Spacer(1, 30))
        
        # 見積金額（大きく表示）
        total_amount = estimate_data.get('total_amount', 0)
        amount_text = f"<b>見積金額　¥{total_amount:,}</b>"
        content.append(Paragraph(amount_text, ParagraphStyle(
            name='AmountStyle',
            parent=styles['JapaneseNormal'],
            fontSize=20,
            alignment=TA_CENTER,
            borderWidth=2,
            borderColor=colors.black,
            backColor=colors.lightblue,
            spaceAfter=30
        )))
        
        content.append(Spacer(1, 50))
        
        # 会社情報（右寄せ）
        company_info = f"""
        <b>{company_data.get('company_name', '')}</b><br/>
        {company_data.get('address', '')}<br/>
        TEL: {company_data.get('phone', '')}<br/>
        Email: {company_data.get('email', '')}<br/>
        """
        content.append(Paragraph(company_info, styles['JapaneseRight']))
        
        return content
    
    def _create_summary_page(self, items, styles):
        """内訳書ページ作成"""
        content = []
        content.append(Paragraph("工事内訳書", styles['JapaneseHeading']))
        content.append(Spacer(1, 20))
        
        # カテゴリ別集計
        category_totals = {}
        for item in items:
            if item.get('item_type') == 'item' and item.get('line_total'):
                # アイテムの親ヘッダーを探してカテゴリを判定（簡易実装）
                category = self._get_item_category(item, items)
                if category not in category_totals:
                    category_totals[category] = 0
                category_totals[category] += item.get('line_total', 0)
        
        # 内訳テーブル作成
        summary_data = [['工事区分', '金額']]
        total = 0
        for category, amount in category_totals.items():
            summary_data.append([category, f"¥{amount:,}"])
            total += amount
        
        summary_data.append(['', ''])  # 空行
        summary_data.append(['合計', f"¥{total:,}"])
        
        summary_table = Table(
            summary_data,
            colWidths=[100*mm, 60*mm]
        )
        summary_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'NotoSans'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -2), 0.5, colors.black),
            ('LINEBELOW', (0, -1), (-1, -1), 2, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT')
        ]))
        
        content.append(summary_table)
        return content
    
    def _create_detail_page(self, items, styles):
        """明細書ページ作成"""
        content = []
        content.append(Paragraph("詳細明細書", styles['JapaneseHeading']))
        content.append(Spacer(1, 20))
        
        # 明細テーブルヘッダー
        detail_data = [['項目', '数量', '単位', '単価', '金額']]
        
        for item in items:
            if item.get('item_type') == 'header':
                # 見出し行
                indent = '　' * (item.get('level', 0) * 2)
                detail_data.append([
                    f"{indent}■ {item.get('item_description', '')}",
                    '', '', '', ''
                ])
            elif item.get('item_type') == 'item':
                # 明細行
                indent = '　' * ((item.get('level', 0) + 1) * 2)
                detail_data.append([
                    f"{indent}{item.get('item_description', '')}",
                    str(item.get('quantity', '')),
                    item.get('unit', ''),
                    f"¥{item.get('unit_price', 0):,}" if item.get('unit_price') else '',
                    f"¥{item.get('line_total', 0):,}"
                ])
        
        detail_table = Table(
            detail_data,
            colWidths=[80*mm, 20*mm, 20*mm, 30*mm, 30*mm]
        )
        detail_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'NotoSans'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT')
        ]))
        
        content.append(detail_table)
        return content
    
    def _create_terms_page(self, styles):
        """注意事項ページ作成"""
        content = []
        content.append(Paragraph("お見積もりに関する注意事項", styles['JapaneseHeading']))
        content.append(Spacer(1, 20))
        
        terms_text = """
        1. 本見積書の有効期限は記載日より30日間とさせていただきます。<br/>
        2. 工事着手前に現地確認を行い、設計・仕様の最終確認をいたします。<br/>
        3. 地質の状況により、基礎工事等で追加費用が発生する場合があります。<br/>
        4. 樹木等の植栽については、気象条件により植栽時期を調整する場合があります。<br/>
        5. 隣地境界の確認は事前にお客様にてお願いいたします。<br/>
        6. 工事期間中は安全確保のため、現場への立ち入りをご遠慮ください。<br/>
        7. 追加工事が発生する場合は、事前にお見積もりを提出し、ご承認をいただきます。<br/>
        8. お支払いは工事完了後、請求書発行から30日以内にお願いいたします。<br/>
        9. 植栽に関しては1年間の枯れ保証をいたします（天災・人災を除く）。<br/>
        10. その他詳細については、工事請負契約書に記載いたします。<br/>
        """
        
        content.append(Paragraph(terms_text, styles['JapaneseNormal']))
        content.append(Spacer(1, 30))
        
        # お問い合わせ先
        contact_text = """
        <b>お問い合わせ・ご質問がございましたら、お気軽にご連絡ください。</b><br/>
        より良いお庭づくりのため、丁寧にご対応させていただきます。
        """
        content.append(Paragraph(contact_text, styles['JapaneseCenter']))
        
        return content
    
    def _get_item_category(self, item, items):
        """アイテムのカテゴリを判定（簡易実装）"""
        # 実際の実装では、アイテムの親ヘッダーを辿ってカテゴリを判定
        # ここでは簡易的に品目名から推定
        item_name = item.get('item_description', '')
        if 'マツ' in item_name or '植栽' in item_name or '樹木' in item_name:
            return '植栽工事'
        elif '石' in item_name or '舗装' in item_name or 'ブロック' in item_name:
            return '外構工事'
        elif '照明' in item_name or 'ライト' in item_name:
            return '設備工事'
        else:
            return 'その他工事'


class InvoicePDFGenerator(EstimatePDFGenerator):
    """請求書PDF生成クラス（見積書生成を継承）"""
    
    def generate_invoice_pdf(self, invoice_data: Dict[str, Any], estimate_data: Dict[str, Any],
                           company_data: Dict[str, Any], customer_data: Dict[str, Any]) -> bytes:
        """請求書PDF生成"""
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        styles = self._get_styles()
        story = []
        
        # 請求書表紙
        story.extend(self._create_invoice_cover(invoice_data, estimate_data, company_data, customer_data, styles))
        story.append(PageBreak())
        
        # 支払条件・振込先
        story.extend(self._create_payment_terms(invoice_data, company_data, styles))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def _create_invoice_cover(self, invoice_data, estimate_data, company_data, customer_data, styles):
        """請求書表紙作成"""
        content = []
        
        # タイトル
        content.append(Paragraph("請　求　書", styles['JapaneseTitle']))
        content.append(Spacer(1, 30))
        
        # 顧客情報
        customer_info = f"""
        <b>{customer_data.get('customer_name', '')}</b> 様<br/>
        {customer_data.get('address', '')}<br/>
        """
        content.append(Paragraph(customer_info, styles['JapaneseNormal']))
        content.append(Spacer(1, 20))
        
        # 請求情報
        invoice_info_data = [
            ['請求書番号', invoice_data.get('invoice_number', '')],
            ['請求日', invoice_data.get('invoice_date', '')],
            ['お支払期限', invoice_data.get('due_date', '')],
            ['工事名', estimate_data.get('project_name', '造園工事')]
        ]
        
        invoice_info_table = Table(invoice_info_data, colWidths=[40*mm, 80*mm])
        invoice_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'NotoSans'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey)
        ]))
        content.append(invoice_info_table)
        content.append(Spacer(1, 30))
        
        # 請求金額
        total_amount = invoice_data.get('total_amount', 0)
        amount_text = f"<b>ご請求金額　¥{total_amount:,}</b>"
        content.append(Paragraph(amount_text, ParagraphStyle(
            name='InvoiceAmountStyle',
            parent=styles['JapaneseNormal'],
            fontSize=20,
            alignment=TA_CENTER,
            borderWidth=2,
            borderColor=colors.red,
            backColor=colors.lightyellow,
            spaceAfter=30
        )))
        
        content.append(Spacer(1, 50))
        
        # 会社情報
        company_info = f"""
        <b>{company_data.get('company_name', '')}</b><br/>
        {company_data.get('address', '')}<br/>
        TEL: {company_data.get('phone', '')}<br/>
        Email: {company_data.get('email', '')}<br/>
        """
        content.append(Paragraph(company_info, styles['JapaneseRight']))
        
        return content
    
    def _create_payment_terms(self, invoice_data, company_data, styles):
        """支払条件・振込先ページ作成"""
        content = []
        content.append(Paragraph("お支払いについて", styles['JapaneseHeading']))
        content.append(Spacer(1, 20))
        
        payment_text = f"""
        お支払期限: {invoice_data.get('due_date', '')}<br/>
        お支払方法: {invoice_data.get('payment_method', '銀行振込')}<br/><br/>
        
        <b>振込先口座</b><br/>
        {invoice_data.get('bank_info', '銀行名: 〇〇銀行\\n支店名: 〇〇支店\\n口座種別: 普通\\n口座番号: 1234567\\n口座名義: ' + company_data.get('company_name', ''))}<br/><br/>
        
        ※振込手数料はお客様負担にてお願いいたします。<br/>
        ※領収書が必要な場合は、お振込後にご連絡ください。<br/>
        """
        
        content.append(Paragraph(payment_text, styles['JapaneseNormal']))
        
        return content


# PDF生成APIエンドポイント用のヘルパー関数
def generate_estimate_pdf_api(estimate_id: int, db_session) -> bytes:
    """見積書PDF生成API用関数"""
    # データベースからデータ取得（実際の実装では適切なORMクエリを使用）
    estimate_data = {
        'estimate_number': 'EST20241130-001',
        'estimate_date': '2024-11-30',
        'valid_until': '2024-12-30',
        'total_amount': 1500000,
        'project_name': '○○邸庭園工事'
    }
    
    items = [
        {'item_type': 'header', 'item_description': '植栽工事', 'level': 0},
        {'item_type': 'item', 'item_description': 'マツ H3.0', 'quantity': 3, 'unit': '本', 'unit_price': 50000, 'line_total': 150000, 'level': 1},
        {'item_type': 'header', 'item_description': '外構工事', 'level': 0},
        {'item_type': 'item', 'item_description': '御影石敷き', 'quantity': 20, 'unit': 'm2', 'unit_price': 15000, 'line_total': 300000, 'level': 1},
    ]
    
    company_data = {
        'company_name': 'サンプル造園株式会社',
        'address': '東京都渋谷区1-1-1',
        'phone': '03-1234-5678',
        'email': 'info@sample-garden.co.jp'
    }
    
    customer_data = {
        'customer_name': '田中太郎',
        'address': '東京都世田谷区2-2-2'
    }
    
    generator = EstimatePDFGenerator()
    return generator.generate_estimate_pdf(estimate_data, items, company_data, customer_data)

def generate_invoice_pdf_api(invoice_id: int, db_session) -> bytes:
    """請求書PDF生成API用関数"""
    # 実際の実装では適切なデータ取得を行う
    invoice_data = {
        'invoice_number': 'INV20241130-001',
        'invoice_date': '2024-11-30',
        'due_date': '2024-12-30',
        'total_amount': 1500000,
        'payment_method': '銀行振込',
        'bank_info': '○○銀行 ○○支店 普通 1234567 サンプルゾウエン(カ'
    }
    
    estimate_data = {'project_name': '○○邸庭園工事'}
    company_data = {
        'company_name': 'サンプル造園株式会社',
        'address': '東京都渋谷区1-1-1',
        'phone': '03-1234-5678',
        'email': 'info@sample-garden.co.jp'
    }
    customer_data = {
        'customer_name': '田中太郎',
        'address': '東京都世田谷区2-2-2'
    }
    
    generator = InvoicePDFGenerator()
    return generator.generate_invoice_pdf(invoice_data, estimate_data, company_data, customer_data)