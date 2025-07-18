/**
 * 会社情報設定コンポーネント - 造園事業者基本情報管理
 * 会社情報・印章・ロゴ設定・営業情報の統合管理
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  Typography,
  Paper,
  Button,
  IconButton,
  Avatar,
  Card,
  CardContent,
  CardActions,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Business as BusinessIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface CompanyInfo {
  company_id: number;
  company_name: string;
  postal_code: string;
  address: string;
  phone: string;
  email: string;
  fax?: string;
  website?: string;
  business_license?: string;
  representative_name: string;
  capital?: number;
  established_date?: string;
  business_hours?: string;
  closed_days?: string;
  logo_url?: string;
  seal_url?: string;
  business_description?: string;
  specialties?: string[];
  service_areas?: string[];
}

interface CompanyInfoSettingsProps {
  onChanged: () => void;
}

const CompanyInfoSettings: React.FC<CompanyInfoSettingsProps> = ({ onChanged }) => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    company_id: 1,
    company_name: '',
    postal_code: '',
    address: '',
    phone: '',
    email: '',
    representative_name: '',
    specialties: [],
    service_areas: []
  });

  const [isEditing, setIsEditing] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [sealPreview, setSealPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      // TODO: API呼び出し
      // const response = await fetch('/api/company/info');
      // const data = await response.json();
      // setCompanyInfo(data);
      
      // デモデータ
      setCompanyInfo({
        company_id: 1,
        company_name: '株式会社グリーンガーデン',
        postal_code: '150-0001',
        address: '東京都渋谷区神宮前1-1-1',
        phone: '03-1234-5678',
        email: 'info@green-garden.co.jp',
        fax: '03-1234-5679',
        website: 'https://green-garden.co.jp',
        business_license: '東京都知事許可（般-1）第12345号',
        representative_name: '田中 太郎',
        capital: 10000000,
        established_date: '2010-04-01',
        business_hours: '8:00-17:00',
        closed_days: '日曜日、祝日',
        business_description: '造園工事・庭園設計・緑地管理を専門とする総合造園業',
        specialties: ['庭園設計', '造園工事', '樹木剪定', '芝生管理', '外構工事'],
        service_areas: ['東京都', '神奈川県', '埼玉県']
      });
    } catch (error) {
      console.error('会社情報の読み込みに失敗:', error);
    }
  };

  const handleInputChange = (field: keyof CompanyInfo, value: any) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value
    }));
    onChanged();
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!companyInfo.company_name) {
      newErrors.company_name = '会社名は必須です';
    }
    if (!companyInfo.phone) {
      newErrors.phone = '電話番号は必須です';
    }
    if (!companyInfo.email) {
      newErrors.email = 'メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyInfo.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }
    if (!companyInfo.address) {
      newErrors.address = '住所は必須です';
    }
    if (!companyInfo.representative_name) {
      newErrors.representative_name = '代表者名は必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      // TODO: API呼び出し
      // await fetch('/api/company/info', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(companyInfo)
      // });
      
      setIsEditing(false);
      alert('会社情報が保存されました');
    } catch (error) {
      console.error('保存に失敗:', error);
      alert('保存に失敗しました');
    }
  };

  const handleFileUpload = (type: 'logo' | 'seal', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }

    // 画像プレビュー
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (type === 'logo') {
        setLogoPreview(preview);
        handleInputChange('logo_url', preview);
      } else {
        setSealPreview(preview);
        handleInputChange('seal_url', preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSpecialtyAdd = (specialty: string) => {
    if (specialty && !companyInfo.specialties?.includes(specialty)) {
      handleInputChange('specialties', [...(companyInfo.specialties || []), specialty]);
    }
  };

  const handleSpecialtyRemove = (specialty: string) => {
    handleInputChange('specialties', 
      companyInfo.specialties?.filter(s => s !== specialty) || []
    );
  };

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          会社情報設定
        </Typography>
        <Box>
          {!isEditing ? (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
            >
              編集
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={() => {
                  setIsEditing(false);
                  loadCompanyInfo();
                }}
                sx={{ mr: 1 }}
              >
                キャンセル
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
              >
                保存
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 基本情報 */}
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              基本情報
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="会社名 *"
                  value={companyInfo.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  disabled={!isEditing}
                  error={!!errors.company_name}
                  helperText={errors.company_name}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="代表者名 *"
                  value={companyInfo.representative_name}
                  onChange={(e) => handleInputChange('representative_name', e.target.value)}
                  disabled={!isEditing}
                  error={!!errors.representative_name}
                  helperText={errors.representative_name}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="業者許可番号"
                  value={companyInfo.business_license || ''}
                  onChange={(e) => handleInputChange('business_license', e.target.value)}
                  disabled={!isEditing}
                />
              </Grid>
              
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="郵便番号"
                  value={companyInfo.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  disabled={!isEditing}
                  placeholder="150-0001"
                />
              </Grid>
              
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="住所 *"
                  value={companyInfo.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={!isEditing}
                  error={!!errors.address}
                  helperText={errors.address}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="電話番号 *"
                  value={companyInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing}
                  error={!!errors.phone}
                  helperText={errors.phone}
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="FAX番号"
                  value={companyInfo.fax || ''}
                  onChange={(e) => handleInputChange('fax', e.target.value)}
                  disabled={!isEditing}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="メールアドレス *"
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                  error={!!errors.email}
                  helperText={errors.email}
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="ウェブサイト"
                  value={companyInfo.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://example.com"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ロゴ・印章 */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              ロゴ・印章
            </Typography>
            
            {/* 会社ロゴ */}
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>
                  会社ロゴ
                </Typography>
                <Avatar
                  sx={{ 
                    width: 100, 
                    height: 100, 
                    mx: 'auto', 
                    mb: 2,
                    bgcolor: 'primary.light'
                  }}
                  src={logoPreview || companyInfo.logo_url}
                >
                  <BusinessIcon sx={{ fontSize: 40 }} />
                </Avatar>
                {isEditing && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadIcon />}
                    component="label"
                  >
                    アップロード
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => handleFileUpload('logo', e)}
                    />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 印章 */}
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>
                  会社印章
                </Typography>
                <Avatar
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mx: 'auto', 
                    mb: 2,
                    bgcolor: 'secondary.light'
                  }}
                  src={sealPreview || companyInfo.seal_url}
                >
                  印
                </Avatar>
                {isEditing && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadIcon />}
                    component="label"
                  >
                    アップロード
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => handleFileUpload('seal', e)}
                    />
                  </Button>
                )}
              </CardContent>
            </Card>
          </Paper>
        </Grid>

        {/* 営業情報 */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                営業情報・詳細設定
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="営業時間"
                    value={companyInfo.business_hours || ''}
                    onChange={(e) => handleInputChange('business_hours', e.target.value)}
                    disabled={!isEditing}
                    placeholder="8:00-17:00"
                    InputProps={{
                      startAdornment: <ScheduleIcon sx={{ mr: 1, color: 'action.active' }} />
                    }}
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="定休日"
                    value={companyInfo.closed_days || ''}
                    onChange={(e) => handleInputChange('closed_days', e.target.value)}
                    disabled={!isEditing}
                    placeholder="日曜日、祝日"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="資本金"
                    type="number"
                    value={companyInfo.capital || ''}
                    onChange={(e) => handleInputChange('capital', parseInt(e.target.value))}
                    disabled={!isEditing}
                    InputProps={{
                      endAdornment: '円'
                    }}
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="設立年月日"
                    type="date"
                    value={companyInfo.established_date || ''}
                    onChange={(e) => handleInputChange('established_date', e.target.value)}
                    disabled={!isEditing}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="事業概要"
                    value={companyInfo.business_description || ''}
                    onChange={(e) => handleInputChange('business_description', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                
                {/* 専門分野 */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    専門分野
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {companyInfo.specialties?.map((specialty, index) => (
                      <Chip
                        key={index}
                        label={specialty}
                        onDelete={isEditing ? () => handleSpecialtyRemove(specialty) : undefined}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  {isEditing && (
                    <TextField
                      size="small"
                      placeholder="専門分野を入力してEnter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          handleSpecialtyAdd(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  )}
                </Grid>
                
                {/* サービス対応エリア */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    サービス対応エリア
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {companyInfo.service_areas?.map((area, index) => (
                      <Chip
                        key={index}
                        label={area}
                        color="secondary"
                        variant="outlined"
                        icon={<LocationIcon />}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CompanyInfoSettings;