/**
 * Garden Landscaping Main Menu - トップページメニュー
 * 造園事業者向けメインメニューシステム（5項目）
 * 
 * Created by: worker2 (Version Up - Menu System)
 * Date: 2025-07-01
 */

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Paper,
  Container,
  Breadcrumbs,
  Link,
  Chip,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha,
  Stack,
  Fab
} from '@mui/material';

import {
  RequestQuote as EstimateIcon,
  PriceChange as PriceMasterIcon,
  History as ProjectHistoryIcon,
  Settings as SettingsIcon,
  Timeline as ProcessIcon,
  Nature as PlantIcon,
  Calculate as CalculatorIcon,
  Folder as FolderIcon,
  AccountBox as AccountIcon,
  Schedule as ScheduleIcon,
  NavigateNext as NextIcon
} from '@mui/icons-material';

// メニュー項目の定義
interface MenuItemConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  route: string;
  description: string;
  features: string[];
  isNew?: boolean;
  comingSoon?: boolean;
  count?: number;
}

const LANDSCAPING_MENU_ITEMS: MenuItemConfig[] = [
  {
    id: 'estimate',
    title: '見積書作成',
    subtitle: 'ウィザード形式で簡単作成',
    icon: EstimateIcon,
    color: '#4CAF50',
    route: '/estimate',
    description: '造園工事の見積書を4ステップで簡単作成',
    features: [
      '4ステップウィザード',
      'リアルタイム金額計算',
      '造園業界標準フォーマット',
      'PDF出力・印刷',
      '仕入額・掛け率・調整額対応'
    ],
    isNew: true
  },
  {
    id: 'price-master',
    title: '単価マスター',
    subtitle: '植栽・外構・工事単価管理',
    icon: PriceMasterIcon,
    color: '#FF9800',
    route: '/price-master',
    description: '造園工事の単価データベース管理',
    features: [
      'カテゴリ階層管理',
      '検索・フィルター機能',
      'インポート/エクスポート',
      '価格変動履歴',
      '業界標準単価連携'
    ]
  },
  {
    id: 'project-history',
    title: '案件履歴',
    subtitle: 'プロジェクト・受注管理',
    icon: ProjectHistoryIcon,
    color: '#2196F3',
    route: '/project-history',
    description: '過去の案件・プロジェクト履歴を管理',
    features: [
      '案件検索・フィルター',
      'ステータス管理',
      '顧客情報連携',
      '売上分析',
      '進捗管理'
    ],
    count: 24
  },
  {
    id: 'settings',
    title: '設定',
    subtitle: '事業者情報・システム設定',
    icon: SettingsIcon,
    color: '#9C27B0',
    route: '/settings',
    description: '事業者基本情報とシステム設定',
    features: [
      '会社情報管理',
      'ユーザー・権限管理',
      'ロゴ・印章設定',
      'システム設定',
      'データバックアップ'
    ]
  },
  {
    id: 'process-management',
    title: '工程管理',
    subtitle: '工程表作成・進捗管理',
    icon: ProcessIcon,
    color: '#607D8B',
    route: '/process-management',
    description: '造園工事の工程表作成・進捗管理',
    features: [
      '自動工程表生成',
      '視覚的ガントチャート',
      '工程テンプレート',
      '進捗トラッキング',
      '現場写真記録'
    ],
    isNew: true
  }
];

interface LandscapingMainMenuProps {
  onMenuSelect: (menuId: string, route: string) => void;
  currentUser?: {
    name: string;
    role: string;
    company: string;
  };
}

const LandscapingMainMenu: React.FC<LandscapingMainMenuProps> = ({
  onMenuSelect,
  currentUser = {
    name: '山田太郎',
    role: '代表取締役',
    company: '緑風造園株式会社'
  }
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery('(max-width:375px)');
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  const handleMenuClick = (menuItem: MenuItemConfig) => {
    if (menuItem.comingSoon) return;
    
    setSelectedMenu(menuItem.id);
    onMenuSelect(menuItem.id, menuItem.route);
  };

  return (
    <Container maxWidth="xl" sx={{ py: isMobile ? 2 : 4 }}>
      {/* ヘッダー部分 */}
      <Paper
        elevation={2}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
          color: 'white',
          p: isMobile ? 2 : 4,
          mb: isMobile ? 2 : 4,
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 背景装飾 */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            opacity: 0.1,
            borderRadius: '50%',
            bgcolor: 'white'
          }}
        />
        <PlantIcon
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            fontSize: 60,
            opacity: 0.2
          }}
        />
        
        <Grid container spacing={isMobile ? 2 : 3} alignItems="center">
          <Grid item xs={12} md={8}>
            {!isMobile && (
              <Box sx={{ mb: 2 }}>
                <Breadcrumbs
                  separator={<NextIcon fontSize="small" sx={{ color: 'white' }} />}
                  sx={{ color: 'white', mb: 1 }}
                >
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.8 }}>
                    ホーム
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    メインメニュー
                  </Typography>
                </Breadcrumbs>
              </Box>
            )}
            
            <Typography 
              variant={isMobile ? (isSmallMobile ? 'h5' : 'h4') : 'h3'} 
              fontWeight="bold" 
              gutterBottom
            >
              Garden 造園業務管理システム
            </Typography>
            <Typography 
              variant={isMobile ? 'body1' : 'h6'} 
              sx={{ opacity: 0.9, mb: isMobile ? 1 : 2 }}
            >
              {currentUser.company}{isMobile ? '' : ` - ${currentUser.name}様`}
            </Typography>
            {!isSmallMobile && (
              <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ opacity: 0.8 }}>
                見積作成から工程管理まで、造園事業のすべてを一元管理
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                bgcolor: alpha('white', 0.2),
                borderRadius: 2,
                p: 2,
                backdropFilter: 'blur(10px)'
              }}
            >
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                今日の予定
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                3
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                件の案件
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* メニューグリッド */}
      <Grid container spacing={isMobile ? 2 : 3}>
        {LANDSCAPING_MENU_ITEMS.map((menuItem) => (
          <Grid item xs={12} sm={6} lg={isMobile ? 12 : 4} key={menuItem.id}>
            <Card
              elevation={selectedMenu === menuItem.id ? 8 : 2}
              sx={{
                height: isMobile ? 'auto' : '100%',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: selectedMenu === menuItem.id ? 'translateY(-4px)' : 'none',
                border: selectedMenu === menuItem.id ? `2px solid ${menuItem.color}` : 'none',
                '&:hover': {
                  elevation: 6,
                  transform: isMobile ? 'none' : 'translateY(-2px)',
                  '& .menu-icon': {
                    transform: isMobile ? 'none' : 'scale(1.1)',
                    color: menuItem.color
                  }
                },
                opacity: menuItem.comingSoon ? 0.6 : 1,
                cursor: menuItem.comingSoon ? 'not-allowed' : 'pointer'
              }}
            >
              <CardActionArea
                onClick={() => handleMenuClick(menuItem)}
                disabled={menuItem.comingSoon}
                sx={{ height: '100%', p: 0 }}
              >
                <CardContent sx={{ 
                  p: isMobile ? 2 : 3, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: isMobile ? 'row' : 'column',
                  alignItems: isMobile ? 'center' : 'stretch'
                }}>
                  {/* アイコンとタイトル */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: isMobile ? 'center' : 'flex-start', 
                    mb: isMobile ? 0 : 2,
                    width: '100%'
                  }}>
                    <Box
                      sx={{
                        p: isMobile ? 1 : 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(menuItem.color, 0.1),
                        mr: 2,
                        minWidth: 'fit-content'
                      }}
                    >
                      <menuItem.icon
                        className="menu-icon"
                        sx={{
                          fontSize: isMobile ? 28 : 32,
                          color: menuItem.color,
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: isMobile ? 0 : 0.5,
                        flexWrap: 'wrap'
                      }}>
                        <Typography 
                          variant={isMobile ? 'body1' : 'h6'} 
                          fontWeight="bold" 
                          sx={{ mr: 1 }}
                        >
                          {menuItem.title}
                        </Typography>
                        {menuItem.isNew && (
                          <Chip 
                            label="NEW" 
                            size="small" 
                            color="error" 
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                        {menuItem.comingSoon && (
                          <Chip 
                            label="準備中" 
                            size="small" 
                            color="default" 
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                        {menuItem.count && (
                          <Badge 
                            badgeContent={menuItem.count} 
                            color="primary"
                            sx={{ ml: 1 }}
                          >
                            <Box />
                          </Badge>
                        )}
                      </Box>
                      {!isMobile && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          {menuItem.subtitle}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* 説明とチップ（モバイルでは省略） */}
                  {!isMobile && (
                    <>
                      {/* 説明 */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ mb: 2, flex: 1 }}
                      >
                        {menuItem.description}
                      </Typography>

                      {/* 機能一覧 */}
                      <Box>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          fontWeight="medium"
                          sx={{ mb: 1, display: 'block' }}
                        >
                          主要機能:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {menuItem.features.slice(0, 3).map((feature, index) => (
                        <Chip
                          key={index}
                          label={feature}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 24,
                            borderColor: alpha(menuItem.color, 0.3),
                            color: menuItem.color
                          }}
                        />
                      ))}
                      {menuItem.features.length > 3 && (
                        <Tooltip
                          title={
                            <Box>
                              {menuItem.features.slice(3).map((feature, index) => (
                                <Typography key={index} variant="caption" display="block">
                                  • {feature}
                                </Typography>
                              ))}
                            </Box>
                          }
                        >
                          <Chip
                            label={`+${menuItem.features.length - 3}`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.7rem',
                              height: 24,
                              borderColor: alpha(theme.palette.text.secondary, 0.3)
                            }}
                          />
                        </Tooltip>
                      )}
                        </Box>
                      </Box>
                    </>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* フッター情報 */}
      {!isMobile && (
        <Paper
          elevation={1}
          sx={{
            mt: 4,
            p: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            borderRadius: 2
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalculatorIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" fontWeight="medium">
                  今月の見積作成
                </Typography>
              </Box>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                12件
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FolderIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="body2" fontWeight="medium">
                  進行中の案件
                </Typography>
              </Box>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                8件
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScheduleIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="body2" fontWeight="medium">
                  今週の予定
                </Typography>
              </Box>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                15件
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default LandscapingMainMenu;