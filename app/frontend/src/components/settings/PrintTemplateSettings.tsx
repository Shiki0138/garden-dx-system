/**
 * 帳票テンプレート設定コンポーネント - 見積書・請求書テンプレート管理
 * 造園業界標準準拠・カスタムテンプレート・印刷設定
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Print as PrintIcon,
  Description as DescriptionIcon,
  Receipt as ReceiptIcon,
  Palette as PaletteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Image as ImageIcon,
  FormatPaint as FormatPaintIcon,
  Settings as SettingsIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

interface TemplateConfig {
  id: string;
  name: string;
  type: 'estimate' | 'invoice';
  is_default: boolean;
  layout: {
    page_size: string;
    orientation: string;
    margins: { top: number; right: number; bottom: number; left: number };
    header_height: number;
    footer_height: number;
  };
  styling: {
    primary_color: string;
    secondary_color: string;
    text_color: string;
    border_color: string;
    font_family: string;
    font_size: number;
  };
  content: {
    show_logo: boolean;
    show_seal: boolean;
    show_business_license: boolean;
    show_bank_info: boolean;
    show_notes_section: boolean;
    show_terms_conditions: boolean;
    custom_fields: string[];
  };
  landscaping_specific: {
    show_plant_specifications: boolean;
    show_maintenance_terms: boolean;
    show_warranty_info: boolean;
    category_color_coding: boolean;
    show_soil_analysis: boolean;
  };
}

interface PrintTemplateSettingsProps {
  onChanged: () => void;
}

const PrintTemplateSettings: React.FC<PrintTemplateSettingsProps> = ({ onChanged }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    // デモデータ
    setTemplates([
      {
        id: 'estimate_standard',
        name: '見積書（標準）',
        type: 'estimate',
        is_default: true,
        layout: {
          page_size: 'A4',
          orientation: 'portrait',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          header_height: 80,
          footer_height: 60
        },
        styling: {
          primary_color: '#2E7D32',
          secondary_color: '#4CAF50',
          text_color: '#333333',
          border_color: '#E0E0E0',
          font_family: 'Noto Sans JP',
          font_size: 10
        },
        content: {
          show_logo: true,
          show_seal: true,
          show_business_license: true,
          show_bank_info: false,
          show_notes_section: true,
          show_terms_conditions: true,
          custom_fields: ['現場住所', '工期', '担当者']
        },
        landscaping_specific: {
          show_plant_specifications: true,
          show_maintenance_terms: true,
          show_warranty_info: true,
          category_color_coding: true,
          show_soil_analysis: false
        }
      },
      {
        id: 'invoice_standard',
        name: '請求書（標準）',
        type: 'invoice',
        is_default: true,
        layout: {
          page_size: 'A4',
          orientation: 'portrait',
          margins: { top: 25, right: 20, bottom: 25, left: 20 },
          header_height: 90,
          footer_height: 70
        },
        styling: {
          primary_color: '#1976D2',
          secondary_color: '#42A5F5',
          text_color: '#2C2C2C',
          border_color: '#CCCCCC',
          font_family: 'Noto Sans JP',
          font_size: 11
        },
        content: {
          show_logo: true,
          show_seal: true,
          show_business_license: true,
          show_bank_info: true,
          show_notes_section: true,
          show_terms_conditions: false,
          custom_fields: ['支払期限', '振込手数料', '工事完了日']
        },
        landscaping_specific: {
          show_plant_specifications: false,
          show_maintenance_terms: false,
          show_warranty_info: true,
          category_color_coding: false,
          show_soil_analysis: false
        }
      }
    ]);
  };

  const handleTemplateEdit = (template: TemplateConfig) => {
    setSelectedTemplate({ ...template });
    setIsEditDialogOpen(true);
  };

  const handleTemplateSave = async () => {
    if (!selectedTemplate) return;
    
    try {
      // TODO: API呼び出し
      // await fetch(`/api/templates/${selectedTemplate.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(selectedTemplate)
      // });
      
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id ? selectedTemplate : t
      ));
      setIsEditDialogOpen(false);
      onChanged();
      alert('テンプレートが保存されました');
    } catch (error) {
      console.error('保存に失敗:', error);
      alert('保存に失敗しました');
    }
  };

  const handleSetDefault = async (templateId: string, type: string) => {
    try {
      // TODO: API呼び出し
      setTemplates(prev => prev.map(t => ({
        ...t,
        is_default: t.id === templateId && t.type === type
      })));
      onChanged();
      alert('デフォルトテンプレートを変更しました');
    } catch (error) {
      console.error('デフォルト設定に失敗:', error);
    }
  };

  const handlePreview = (template: TemplateConfig) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const estimateTemplates = templates.filter(t => t.type === 'estimate');
  const invoiceTemplates = templates.filter(t => t.type === 'invoice');

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          帳票テンプレート設定
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedTemplate(null);
            setIsEditDialogOpen(true);
          }}
        >
          新規テンプレート
        </Button>
      </Box>

      {/* タブ */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          <Tab 
            icon={<DescriptionIcon />} 
            label="見積書テンプレート" 
            iconPosition="start"
          />
          <Tab 
            icon={<ReceiptIcon />} 
            label="請求書テンプレート" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* テンプレート一覧 */}
      <Grid container spacing={3}>
        {(activeTab === 0 ? estimateTemplates : invoiceTemplates).map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card>
              <CardHeader
                avatar={
                  <Avatar 
                    sx={{ 
                      bgcolor: template.styling.primary_color,
                      color: 'white'
                    }}
                  >
                    {template.type === 'estimate' ? <DescriptionIcon /> : <ReceiptIcon />}
                  </Avatar>
                }
                title={template.name}
                subheader={template.is_default ? 'デフォルト' : ''}
                action={
                  template.is_default ? (
                    <Chip label="デフォルト" color="primary" size="small" />
                  ) : null
                }
              />
              
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    レイアウト設定
                  </Typography>
                  <Typography variant="body2">
                    {template.layout.page_size} {template.layout.orientation === 'portrait' ? '縦' : '横'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    カラーテーマ
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: 1,
                        bgcolor: template.styling.primary_color,
                        border: '1px solid #ccc'
                      }}
                    />
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: 1,
                        bgcolor: template.styling.secondary_color,
                        border: '1px solid #ccc'
                      }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    造園業界対応
                  </Typography>
                  <List dense>
                    {template.landscaping_specific.show_plant_specifications && (
                      <ListItem sx={{ py: 0 }}>
                        <ListItemIcon sx={{ minWidth: 20 }}>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="植栽仕様" />
                      </ListItem>
                    )}
                    {template.landscaping_specific.category_color_coding && (
                      <ListItem sx={{ py: 0 }}>
                        <ListItemIcon sx={{ minWidth: 20 }}>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="カテゴリ色分け" />
                      </ListItem>
                    )}
                  </List>
                </Box>
              </CardContent>

              <CardActions>
                <Button 
                  size="small" 
                  startIcon={<VisibilityIcon />}
                  onClick={() => handlePreview(template)}
                >
                  プレビュー
                </Button>
                <Button 
                  size="small" 
                  startIcon={<EditIcon />}
                  onClick={() => handleTemplateEdit(template)}
                >
                  編集
                </Button>
                {!template.is_default && (
                  <Button 
                    size="small"
                    onClick={() => handleSetDefault(template.id, template.type)}
                  >
                    デフォルトに設定
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* テンプレート編集ダイアログ */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTemplate?.id ? 'テンプレート編集' : '新規テンプレート作成'}
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <TemplateEditForm 
              template={selectedTemplate}
              onChange={setSelectedTemplate}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleTemplateSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* プレビューダイアログ */}
      <Dialog 
        open={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          テンプレートプレビュー - {selectedTemplate?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            実際の印刷プレビューです。PDF生成時の表示と同等です。
          </Alert>
          {/* TODO: PDFプレビューコンポーネント */}
          <Box
            sx={{
              height: 600,
              border: '1px solid #ccc',
              borderRadius: 1,
              bgcolor: 'white',
              p: 2,
              overflow: 'auto'
            }}
          >
            <Typography variant="h6" gutterBottom>
              {selectedTemplate?.name}
            </Typography>
            <Typography variant="body2">
              ここに実際のPDFプレビューが表示されます
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPreviewOpen(false)}>
            閉じる
          </Button>
          <Button startIcon={<DownloadIcon />}>
            サンプルPDF出力
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// テンプレート編集フォーム
const TemplateEditForm: React.FC<{
  template: TemplateConfig;
  onChange: (template: TemplateConfig) => void;
}> = ({ template, onChange }) => {
  const handleChange = (section: string, field: string, value: any) => {
    onChange({
      ...template,
      [section]: {
        ...template[section as keyof TemplateConfig],
        [field]: value
      }
    });
  };

  return (
    <Box sx={{ pt: 2 }}>
      <Grid container spacing={3}>
        {/* 基本設定 */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <SettingsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">基本設定</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="テンプレート名"
                    value={template.name}
                    onChange={(e) => onChange({ ...template, name: e.target.value })}
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>種類</InputLabel>
                    <Select
                      value={template.type}
                      label="種類"
                      onChange={(e) => onChange({ ...template, type: e.target.value as 'estimate' | 'invoice' })}
                    >
                      <MenuItem value="estimate">見積書</MenuItem>
                      <MenuItem value="invoice">請求書</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>ページサイズ</InputLabel>
                    <Select
                      value={template.layout.page_size}
                      label="ページサイズ"
                      onChange={(e) => handleChange('layout', 'page_size', e.target.value)}
                    >
                      <MenuItem value="A4">A4</MenuItem>
                      <MenuItem value="A3">A3</MenuItem>
                      <MenuItem value="Letter">Letter</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>向き</InputLabel>
                    <Select
                      value={template.layout.orientation}
                      label="向き"
                      onChange={(e) => handleChange('layout', 'orientation', e.target.value)}
                    >
                      <MenuItem value="portrait">縦</MenuItem>
                      <MenuItem value="landscape">横</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* カラー設定 */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <PaletteIcon sx={{ mr: 1 }} />
              <Typography variant="h6">カラー・フォント設定</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="メインカラー"
                    type="color"
                    value={template.styling.primary_color}
                    onChange={(e) => handleChange('styling', 'primary_color', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="サブカラー"
                    type="color"
                    value={template.styling.secondary_color}
                    onChange={(e) => handleChange('styling', 'secondary_color', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>フォント</InputLabel>
                    <Select
                      value={template.styling.font_family}
                      label="フォント"
                      onChange={(e) => handleChange('styling', 'font_family', e.target.value)}
                    >
                      <MenuItem value="Noto Sans JP">Noto Sans JP</MenuItem>
                      <MenuItem value="Hiragino Sans">Hiragino Sans</MenuItem>
                      <MenuItem value="MS Gothic">MS Gothic</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="フォントサイズ"
                    type="number"
                    value={template.styling.font_size}
                    onChange={(e) => handleChange('styling', 'font_size', parseInt(e.target.value))}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 表示項目設定 */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <FormatPaintIcon sx={{ mr: 1 }} />
              <Typography variant="h6">表示項目設定</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={template.content.show_logo}
                        onChange={(e) => handleChange('content', 'show_logo', e.target.checked)}
                      />
                    }
                    label="会社ロゴ表示"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={template.content.show_seal}
                        onChange={(e) => handleChange('content', 'show_seal', e.target.checked)}
                      />
                    }
                    label="印章表示"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={template.content.show_business_license}
                        onChange={(e) => handleChange('content', 'show_business_license', e.target.checked)}
                      />
                    }
                    label="許可番号表示"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={template.content.show_bank_info}
                        onChange={(e) => handleChange('content', 'show_bank_info', e.target.checked)}
                      />
                    }
                    label="振込先情報表示"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 造園業界特化設定 */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <BusinessIcon sx={{ mr: 1 }} />
              <Typography variant="h6">造園業界特化設定</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={template.landscaping_specific.show_plant_specifications}
                        onChange={(e) => handleChange('landscaping_specific', 'show_plant_specifications', e.target.checked)}
                      />
                    }
                    label="植栽仕様表示"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={template.landscaping_specific.category_color_coding}
                        onChange={(e) => handleChange('landscaping_specific', 'category_color_coding', e.target.checked)}
                      />
                    }
                    label="工種カテゴリ色分け"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={template.landscaping_specific.show_maintenance_terms}
                        onChange={(e) => handleChange('landscaping_specific', 'show_maintenance_terms', e.target.checked)}
                      />
                    }
                    label="メンテナンス条件表示"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={template.landscaping_specific.show_warranty_info}
                        onChange={(e) => handleChange('landscaping_specific', 'show_warranty_info', e.target.checked)}
                      />
                    }
                    label="保証情報表示"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PrintTemplateSettings;