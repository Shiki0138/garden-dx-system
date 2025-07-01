/**
 * 単価マスター管理コンポーネント
 * バージョンアップ: カテゴリ階層・検索・編集・インポート/エクスポート・造園事業者向けUI
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Alert,
  Snackbar,
  Fab,
  Menu,
  ListItemIcon,
  ListItemText,
  TreeView,
  TreeItem,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  CircularProgress
} from '@mui/material';

import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Category as CategoryIcon,
  LocalFlorist as PlantIcon,
  Landscape as LandscapeIcon,
  Terrain as StoneIcon,
  WaterDrop as WaterIcon,
  Build as FacilityIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';

import { styled } from '@mui/material/styles';

// 造園業界向けカラーテーマ
const theme = {
  primary: '#4CAF50',
  secondary: '#8BC34A',
  accent: '#FF9800',
  background: '#F1F8E9',
  surface: '#FFFFFF',
  text: '#2E7D32'
};

// スタイル付きコンポーネント
const StyledPaper = styled(Paper)(({ theme }) => ({
  background: 'linear-gradient(135deg, #F1F8E9 0%, #E8F5E8 100%)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(76, 175, 80, 0.1)',
  border: '1px solid rgba(76, 175, 80, 0.2)',
}));

const CategoryCard = styled(Card)(({ theme, color }) => ({
  background: `linear-gradient(135deg, ${color || '#4CAF50'} 0%, ${color || '#4CAF50'}CC 100%)`,
  color: 'white',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
  }
}));

const PriceCard = styled(Card)(({ theme }) => ({
  borderLeft: `4px solid #4CAF50`,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 8px 25px rgba(76, 175, 80, 0.15)',
    transform: 'translateX(2px)',
  }
}));

// アイコンマッピング
const getCategoryIcon = (iconName) => {
  const iconMap = {
    'local_florist': PlantIcon,
    'landscape': LandscapeIcon,
    'terrain': StoneIcon,
    'water_drop': WaterIcon,
    'build': FacilityIcon,
    'park': PlantIcon,
    'nature': PlantIcon,
    'grass': PlantIcon,
    'default': CategoryIcon
  };
  return iconMap[iconName] || iconMap['default'];
};

export default function PriceMasterManagement() {
  // ===== State Management =====
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ページネーション
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // フィルター
  const [filters, setFilters] = useState({
    priceRange: { min: '', max: '' },
    qualityGrade: '',
    supplier: '',
    calculationMethod: ''
  });

  // 価格計算機
  const [calculator, setCalculator] = useState({
    purchasePrice: 0,
    markupRate: 1.3,
    adjustmentAmount: 0,
    calculationMethod: 'markup',
    result: null
  });

  // ===== Effects =====
  useEffect(() => {
    loadCategories();
    loadPriceItems();
  }, []);

  useEffect(() => {
    loadPriceItems();
  }, [page, rowsPerPage, searchText, selectedCategory, filters]);

  // ===== API Functions =====
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/price-master/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      showSnackbar('カテゴリ読み込みエラー', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPriceItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page + 1,
        per_page: rowsPerPage,
        search_text: searchText,
        ...(selectedCategory && { category_id: selectedCategory.category_id }),
        ...(filters.priceRange.min && { 'price_range[min]': filters.priceRange.min }),
        ...(filters.priceRange.max && { 'price_range[max]': filters.priceRange.max }),
        ...(filters.qualityGrade && { quality_grade: filters.qualityGrade }),
        ...(filters.supplier && { supplier_name: filters.supplier })
      });

      const response = await fetch(`/api/price-master/items?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPriceItems(data.items);
        setTotalCount(data.total_count);
      }
    } catch (error) {
      showSnackbar('データ読み込みエラー', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = async () => {
    try {
      const response = await fetch('/api/price-master/calculate-price', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calculator)
      });
      
      if (response.ok) {
        const result = await response.json();
        setCalculator(prev => ({ ...prev, result }));
      }
    } catch (error) {
      showSnackbar('価格計算エラー', 'error');
    }
  };

  const exportData = async (format = 'excel') => {
    try {
      const response = await fetch(`/api/price-master/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `単価マスター_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showSnackbar('エクスポート完了', 'success');
      }
    } catch (error) {
      showSnackbar('エクスポートエラー', 'error');
    }
  };

  // ===== Helper Functions =====
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setPage(0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

  const getQualityGradeColor = (grade) => {
    const gradeColors = {
      'S': '#FFD700',
      'A': '#4CAF50',
      'B': '#FF9800',
      'C': '#F44336'
    };
    return gradeColors[grade] || '#9E9E9E';
  };

  // ===== Render Functions =====
  const renderCategoryTree = () => (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <CategoryIcon color="primary" />
            <Typography variant="h6" color="primary">
              カテゴリ
            </Typography>
          </Box>
        }
        action={
          <IconButton onClick={() => setSelectedCategory(null)} size="small">
            <RefreshIcon />
          </IconButton>
        }
      />
      <CardContent>
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          defaultExpanded={categories.map(cat => cat.category_id.toString())}
        >
          {categories.map((category) => renderCategoryNode(category))}
        </TreeView>
      </CardContent>
    </Card>
  );

  const renderCategoryNode = (category) => {
    const IconComponent = getCategoryIcon(category.icon_name);
    
    return (
      <TreeItem
        key={category.category_id}
        nodeId={category.category_id.toString()}
        label={
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            py={1}
            sx={{
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.1)' }
            }}
            onClick={() => handleCategorySelect(category)}
          >
            <IconComponent
              sx={{ color: category.color_code, fontSize: '1.2rem' }}
            />
            <Typography variant="body2" fontWeight={500}>
              {category.category_name}
            </Typography>
            <Chip
              label={category.category_code}
              size="small"
              sx={{
                bgcolor: category.color_code,
                color: 'white',
                fontSize: '0.7rem',
                height: '20px'
              }}
            />
          </Box>
        }
      >
        {category.children?.map((child) => renderCategoryNode(child))}
      </TreeItem>
    );
  };

  const renderSearchAndFilters = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="項目名・コード・仕入先で検索..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: searchText && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setSearchText('')} size="small">
                      <RefreshIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '25px',
                  bgcolor: 'rgba(76, 175, 80, 0.05)'
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setFilterOpen(true)}
                sx={{ borderRadius: '20px' }}
              >
                詳細フィルター
              </Button>
              <Button
                variant="outlined"
                startIcon={<CalculateIcon />}
                onClick={() => setCalculatorOpen(true)}
                sx={{ borderRadius: '20px' }}
              >
                価格計算機
              </Button>
            </Box>
          </Grid>
        </Grid>

        {selectedCategory && (
          <Box mt={2}>
            <Chip
              label={`${selectedCategory.category_name} で絞り込み中`}
              color="primary"
              onDelete={() => setSelectedCategory(null)}
              sx={{ borderRadius: '15px' }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderPriceItemsTable = () => (
    <StyledPaper>
      <Box p={2} display="flex" justifyContent="between" alignItems="center">
        <Typography variant="h6" color="primary" fontWeight={600}>
          単価マスター一覧
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEditDialogOpen(true)}
            sx={{
              borderRadius: '20px',
              background: 'linear-gradient(45deg, #4CAF50, #66BB6A)'
            }}
          >
            新規追加
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportDialogOpen(true)}
            sx={{ borderRadius: '20px' }}
          >
            インポート
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => exportData('excel')}
            sx={{ borderRadius: '20px' }}
          >
            エクスポート
          </Button>
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
              <TableCell><strong>項目コード</strong></TableCell>
              <TableCell><strong>項目名</strong></TableCell>
              <TableCell><strong>カテゴリ</strong></TableCell>
              <TableCell><strong>単位</strong></TableCell>
              <TableCell align="right"><strong>仕入額</strong></TableCell>
              <TableCell align="right"><strong>掛け率</strong></TableCell>
              <TableCell align="right"><strong>調整額</strong></TableCell>
              <TableCell align="right"><strong>最終価格</strong></TableCell>
              <TableCell><strong>品質</strong></TableCell>
              <TableCell><strong>操作</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <CircularProgress color="primary" />
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    データを読み込み中...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : priceItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="textSecondary">
                    該当するデータがありません
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              priceItems.map((item) => (
                <TableRow key={item.item_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {item.item_code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.item_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.category}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(76, 175, 80, 0.1)',
                        color: '#2E7D32'
                      }}
                    />
                  </TableCell>
                  <TableCell>{item.standard_unit}</TableCell>
                  <TableCell align="right">
                    {formatPrice(item.purchase_price)}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`×${item.markup_rate.toFixed(2)}`}
                      size="small"
                      color="secondary"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {item.adjustment_amount !== 0 && (
                      <Typography
                        variant="body2"
                        color={item.adjustment_amount > 0 ? 'success.main' : 'error.main'}
                      >
                        {item.adjustment_amount > 0 ? '+' : ''}{formatPrice(item.adjustment_amount)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600} color="primary">
                      {formatPrice(item.final_price)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.quality_grade}
                      size="small"
                      sx={{
                        bgcolor: getQualityGradeColor(item.quality_grade),
                        color: 'white'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="編集">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedItem(item);
                            setEditDialogOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="履歴">
                        <IconButton size="small">
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[25, 50, 100]}
        labelRowsPerPage="表示件数:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
        sx={{
          borderTop: '1px solid rgba(76, 175, 80, 0.2)',
          bgcolor: 'rgba(76, 175, 80, 0.05)'
        }}
      />
    </StyledPaper>
  );

  const renderPriceCalculator = () => (
    <Dialog
      open={calculatorOpen}
      onClose={() => setCalculatorOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CalculateIcon color="primary" />
          <Typography variant="h6">価格計算機</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="仕入額"
              type="number"
              value={calculator.purchasePrice}
              onChange={(e) => setCalculator(prev => ({
                ...prev,
                purchasePrice: parseFloat(e.target.value) || 0
              }))}
              InputProps={{
                endAdornment: <InputAdornment position="end">円</InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="掛け率"
              type="number"
              value={calculator.markupRate}
              onChange={(e) => setCalculator(prev => ({
                ...prev,
                markupRate: parseFloat(e.target.value) || 1.3
              }))}
              inputProps={{ step: 0.1, min: 1.0 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="調整額"
              type="number"
              value={calculator.adjustmentAmount}
              onChange={(e) => setCalculator(prev => ({
                ...prev,
                adjustmentAmount: parseFloat(e.target.value) || 0
              }))}
              InputProps={{
                endAdornment: <InputAdornment position="end">円</InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>計算方法</InputLabel>
              <Select
                value={calculator.calculationMethod}
                label="計算方法"
                onChange={(e) => setCalculator(prev => ({
                  ...prev,
                  calculationMethod: e.target.value
                }))}
              >
                <MenuItem value="markup">掛け率計算</MenuItem>
                <MenuItem value="fixed">固定価格</MenuItem>
                <MenuItem value="cost_plus">原価積み上げ</MenuItem>
                <MenuItem value="market_based">市場価格ベース</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              onClick={calculatePrice}
              sx={{
                py: 1.5,
                borderRadius: '20px',
                background: 'linear-gradient(45deg, #4CAF50, #66BB6A)'
              }}
            >
              価格計算実行
            </Button>
          </Grid>
          
          {calculator.result && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    計算結果
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        基本価格
                      </Typography>
                      <Typography variant="h6">
                        {formatPrice(calculator.result.calculation_details.base_price)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        季節係数
                      </Typography>
                      <Typography variant="h6">
                        ×{calculator.result.seasonal_factor.toFixed(3)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="textSecondary">
                        最終価格
                      </Typography>
                      <Typography variant="h4" color="primary" fontWeight={600}>
                        {formatPrice(calculator.result.final_price)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCalculatorOpen(false)}>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ===== Main Render =====
  return (
    <Box sx={{ p: 3, bgcolor: '#F1F8E9', minHeight: '100vh' }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={600} color="primary" gutterBottom>
          🌿 単価マスター管理
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          造園工事の単価管理・価格計算・カテゴリ階層管理
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          {renderCategoryTree()}
        </Grid>
        <Grid item xs={12} md={9}>
          {renderSearchAndFilters()}
          {renderPriceItemsTable()}
        </Grid>
      </Grid>

      {renderPriceCalculator()}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}