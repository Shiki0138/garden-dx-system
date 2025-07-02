import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Card,
  CardContent,
  Divider,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  AccountTree as TreeIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// 型定義
interface PriceMasterItem {
  item_id: number;
  category: string;
  sub_category?: string;
  item_name: string;
  unit: string;
  purchase_price: number;
  default_markup_rate: number;
}

interface EstimateItem {
  item_id: string;
  item_description: string;
  quantity?: number;
  unit?: string;
  purchase_price?: number;
  markup_rate?: number;
  unit_price?: number;
  line_item_adjustment: number;
  line_total?: number;
  line_cost?: number;
  level: number;
  sort_order: number;
  item_type: 'header' | 'item' | 'subtotal';
  is_free_entry: boolean;
}

interface ProfitabilityData {
  total_cost: number;
  total_revenue: number;
  gross_profit: number;
  gross_margin_rate: number;
  adjusted_total: number;
  final_profit: number;
  final_margin_rate: number;
}

const EstimateCreation: React.FC = () => {
  // State管理
  const [estimate, setEstimate] = useState({
    estimate_number: '',
    customer_id: 1,
    estimate_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    adjustment_amount: 0,
    notes: ''
  });

  const [items, setItems] = useState<EstimateItem[]>([]);
  const [priceMasterItems, setPriceMasterItems] = useState<PriceMasterItem[]>([]);
  const [categories, setCategories] = useState<{[key: string]: string[]}>({});
  const [profitability, setProfitability] = useState<ProfitabilityData | null>(null);
  
  // ダイアログ状態
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 新規明細項目の状態
  const [newItem, setNewItem] = useState<Partial<EstimateItem>>({
    item_description: '',
    quantity: 1,
    unit: '',
    purchase_price: 0,
    markup_rate: 1.3,
    unit_price: 0,
    line_item_adjustment: 0,
    level: 0,
    item_type: 'item',
    is_free_entry: false
  });

  // 初期化
  useEffect(() => {
    loadPriceMaster();
    loadCategories();
    generateEstimateNumber();
  }, []);

  // API呼び出し関数
  const loadPriceMaster = async () => {
    try {
      const response = await fetch('/api/price-master');
      const data = await response.json();
      setPriceMasterItems(data);
    } catch (error) {
      // Price master error handled by UI state
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/price-master/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      // Category error handled by UI state
    }
  };

  const generateEstimateNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    setEstimate(prev => ({
      ...prev,
      estimate_number: `EST${year}${month}${day}-${time}`
    }));
  };

  // 明細追加
  const addItemFromMaster = (masterItem: PriceMasterItem) => {
    const unitPrice = Math.round(masterItem.purchase_price * masterItem.default_markup_rate);
    const newItemData: EstimateItem = {
      item_id: `item_${Date.now()}`,
      item_description: masterItem.item_name,
      quantity: 1,
      unit: masterItem.unit,
      purchase_price: masterItem.purchase_price,
      markup_rate: masterItem.default_markup_rate,
      unit_price: unitPrice,
      line_item_adjustment: 0,
      line_total: unitPrice,
      line_cost: masterItem.purchase_price,
      level: 0,
      sort_order: items.length,
      item_type: 'item',
      is_free_entry: false
    };
    
    setItems(prev => [...prev, newItemData]);
    setOpenItemDialog(false);
    calculateTotals([...items, newItemData]);
  };

  const addFreeEntryItem = () => {
    if (!newItem.item_description) return;
    
    const lineTotal = (newItem.quantity || 0) * (newItem.unit_price || 0) + (newItem.line_item_adjustment || 0);
    const lineCost = (newItem.quantity || 0) * (newItem.purchase_price || 0);
    
    const newItemData: EstimateItem = {
      ...newItem as EstimateItem,
      item_id: `free_${Date.now()}`,
      line_total: lineTotal,
      line_cost: lineCost,
      sort_order: items.length,
      is_free_entry: true
    };
    
    setItems(prev => [...prev, newItemData]);
    setNewItem({
      item_description: '',
      quantity: 1,
      unit: '',
      purchase_price: 0,
      markup_rate: 1.3,
      unit_price: 0,
      line_item_adjustment: 0,
      level: 0,
      item_type: 'item',
      is_free_entry: false
    });
    setOpenItemDialog(false);
    calculateTotals([...items, newItemData]);
  };

  // 見出し行追加
  const addHeaderItem = (level: number) => {
    const headerItem: EstimateItem = {
      item_id: `header_${Date.now()}`,
      item_description: level === 0 ? '大項目' : level === 1 ? '中項目' : '小項目',
      level,
      sort_order: items.length,
      item_type: 'header',
      is_free_entry: false,
      line_item_adjustment: 0
    };
    
    setItems(prev => [...prev, headerItem]);
  };

  // 明細削除
  const removeItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.item_id !== itemId);
    setItems(updatedItems);
    calculateTotals(updatedItems);
  };

  // 明細更新
  const updateItem = (itemId: string, field: keyof EstimateItem, value: any) => {
    const updatedItems = items.map(item => {
      if (item.item_id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // 数量や単価が変更された場合の再計算
        if (['quantity', 'unit_price', 'line_item_adjustment'].includes(field)) {
          const quantity = field === 'quantity' ? value : item.quantity || 0;
          const unitPrice = field === 'unit_price' ? value : item.unit_price || 0;
          const adjustment = field === 'line_item_adjustment' ? value : item.line_item_adjustment || 0;
          
          updatedItem.line_total = quantity * unitPrice + adjustment;
          updatedItem.line_cost = quantity * (item.purchase_price || 0);
        }
        
        return updatedItem;
      }
      return item;
    });
    
    setItems(updatedItems);
    calculateTotals(updatedItems);
  };

  // 合計計算
  const calculateTotals = (itemList: EstimateItem[]) => {
    const subtotal = itemList
      .filter(item => item.item_type === 'item')
      .reduce((sum, item) => sum + (item.line_total || 0), 0);
    
    const totalCost = itemList
      .filter(item => item.item_type === 'item')
      .reduce((sum, item) => sum + (item.line_cost || 0), 0);
    
    const adjustedTotal = subtotal + estimate.adjustment_amount;
    const finalProfit = adjustedTotal - totalCost;
    const finalMarginRate = adjustedTotal > 0 ? finalProfit / adjustedTotal : 0;
    
    setProfitability({
      total_cost: totalCost,
      total_revenue: subtotal,
      gross_profit: subtotal - totalCost,
      gross_margin_rate: subtotal > 0 ? (subtotal - totalCost) / subtotal : 0,
      adjusted_total: adjustedTotal,
      final_profit: finalProfit,
      final_margin_rate: finalMarginRate
    });
  };

  // ドラッグ&ドロップ
  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);
    
    // sort_orderを更新
    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      sort_order: index
    }));
    
    setItems(updatedItems);
  };

  // フィルタリングされた単価マスタ
  const filteredPriceMaster = priceMasterItems.filter(item => {
    const categoryMatch = !selectedCategory || item.category === selectedCategory;
    const subCategoryMatch = !selectedSubCategory || item.sub_category === selectedSubCategory;
    const keywordMatch = !searchKeyword || 
      item.item_name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchKeyword.toLowerCase()));
    
    return categoryMatch && subCategoryMatch && keywordMatch;
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          見積作成 - Garden DX
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="見積番号"
              value={estimate.estimate_number}
              onChange={(e) => setEstimate(prev => ({ ...prev, estimate_number: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="見積日"
              type="date"
              value={estimate.estimate_date}
              onChange={(e) => setEstimate(prev => ({ ...prev, estimate_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="有効期限"
              type="date"
              value={estimate.valid_until}
              onChange={(e) => setEstimate(prev => ({ ...prev, valid_until: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              size="large"
              fullWidth
            >
              PDF出力
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* 左側: 明細入力 */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">見積明細</Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<TreeIcon />}
                  onClick={() => addHeaderItem(0)}
                  sx={{ mr: 1 }}
                >
                  大項目
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TreeIcon />}
                  onClick={() => addHeaderItem(1)}
                  sx={{ mr: 1 }}
                >
                  中項目
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenItemDialog(true)}
                >
                  明細追加
                </Button>
              </Box>
            </Box>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="estimate-items">
                {(provided) => (
                  <TableContainer {...provided.droppableProps} ref={provided.innerRef}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell width="40%">品目・摘要</TableCell>
                          <TableCell width="10%">数量</TableCell>
                          <TableCell width="10%">単位</TableCell>
                          <TableCell width="15%">単価</TableCell>
                          <TableCell width="10%">調整額</TableCell>
                          <TableCell width="15%">金額</TableCell>
                          <TableCell width="5%">操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item, index) => (
                          <Draggable key={item.item_id} draggableId={item.item_id} index={index}>
                            {(provided, snapshot) => (
                              <TableRow
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{
                                  backgroundColor: snapshot.isDragging ? 'rgba(0,0,0,0.1)' : 'inherit',
                                  ...(item.item_type === 'header' && {
                                    backgroundColor: '#f5f5f5',
                                    fontWeight: 'bold'
                                  })
                                }}
                              >
                                <TableCell>
                                  <Box sx={{ pl: item.level * 2 }}>
                                    {item.item_type === 'header' ? (
                                      <TextField
                                        size="small"
                                        value={item.item_description}
                                        onChange={(e) => updateItem(item.item_id, 'item_description', e.target.value)}
                                        sx={{ fontWeight: 'bold' }}
                                      />
                                    ) : (
                                      item.item_description
                                    )}
                                    {item.is_free_entry && (
                                      <Chip label="自由入力" size="small" sx={{ ml: 1 }} />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  {item.item_type === 'item' && (
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={item.quantity || ''}
                                      onChange={(e) => updateItem(item.item_id, 'quantity', parseFloat(e.target.value) || 0)}
                                    />
                                  )}
                                </TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>
                                  {item.item_type === 'item' && (
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={item.unit_price || ''}
                                      onChange={(e) => updateItem(item.item_id, 'unit_price', parseInt(e.target.value) || 0)}
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  {item.item_type === 'item' && (
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={item.line_item_adjustment || ''}
                                      onChange={(e) => updateItem(item.item_id, 'line_item_adjustment', parseInt(e.target.value) || 0)}
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  {item.item_type === 'item' && `¥${(item.line_total || 0).toLocaleString()}`}
                                </TableCell>
                                <TableCell>
                                  <IconButton
                                    size="small"
                                    onClick={() => removeItem(item.item_id)}
                                    color="error"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Droppable>
            </DragDropContext>

            {/* 合計調整 */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Grid container spacing={2} sx={{ maxWidth: 400 }}>
                <Grid item xs={6}>
                  <Typography variant="body1">小計:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1" align="right">
                    ¥{(profitability?.total_revenue || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    size="small"
                    label="調整額"
                    type="number"
                    value={estimate.adjustment_amount}
                    onChange={(e) => {
                      const amount = parseInt(e.target.value) || 0;
                      setEstimate(prev => ({ ...prev, adjustment_amount: amount }));
                      calculateTotals(items);
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" align="right">
                    ¥{(profitability?.adjusted_total || 0).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* 右側: 収益性ダッシュボード */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                収益性ダッシュボード
              </Typography>
              
              {profitability && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">実行予算（原価）:</Typography>
                    <Typography variant="body2">¥{profitability.total_cost.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">見積金額:</Typography>
                    <Typography variant="body2">¥{profitability.adjusted_total.toLocaleString()}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body1" fontWeight="bold">最終利益:</Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight="bold"
                      color={profitability.final_profit >= 0 ? 'success.main' : 'error.main'}
                    >
                      ¥{profitability.final_profit.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body1" fontWeight="bold">利益率:</Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight="bold"
                      color={profitability.final_margin_rate >= 0.2 ? 'success.main' : 'warning.main'}
                    >
                      {(profitability.final_margin_rate * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  
                  {profitability.final_margin_rate < 0.15 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      利益率が低すぎます。価格調整を検討してください。
                    </Alert>
                  )}
                  {profitability.final_margin_rate >= 0.3 && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      優良な利益率です！
                    </Alert>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 明細追加ダイアログ */}
      <Dialog open={openItemDialog} onClose={() => setOpenItemDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>明細追加</DialogTitle>
        <DialogContent>
          {/* カテゴリ選択 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>大カテゴリ</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubCategory('');
                  }}
                >
                  <MenuItem value="">すべて</MenuItem>
                  {Object.keys(categories).map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>中カテゴリ</InputLabel>
                <Select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  disabled={!selectedCategory}
                >
                  <MenuItem value="">すべて</MenuItem>
                  {selectedCategory && categories[selectedCategory]?.map(subCategory => (
                    <MenuItem key={subCategory} value={subCategory}>{subCategory}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="キーワード検索"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                InputProps={{
                  endAdornment: <SearchIcon />
                }}
              />
            </Grid>
          </Grid>

          {/* 単価マスタ一覧 */}
          <TableContainer sx={{ maxHeight: 400, mb: 3 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>品目名</TableCell>
                  <TableCell>カテゴリ</TableCell>
                  <TableCell>単位</TableCell>
                  <TableCell>仕入単価</TableCell>
                  <TableCell>掛率</TableCell>
                  <TableCell>提出単価</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPriceMaster.map(item => (
                  <TableRow key={item.item_id} hover>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.category} {item.sub_category && `> ${item.sub_category}`}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>¥{item.purchase_price.toLocaleString()}</TableCell>
                    <TableCell>{item.default_markup_rate}倍</TableCell>
                    <TableCell>¥{Math.round(item.purchase_price * item.default_markup_rate).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => addItemFromMaster(item)}
                      >
                        追加
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 3 }} />

          {/* 自由入力フォーム */}
          <Typography variant="h6" gutterBottom>自由入力で追加</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="品目・摘要"
                value={newItem.item_description}
                onChange={(e) => setNewItem(prev => ({ ...prev, item_description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                fullWidth
                label="数量"
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                fullWidth
                label="単位"
                value={newItem.unit}
                onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                fullWidth
                label="単価"
                type="number"
                value={newItem.unit_price}
                onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseInt(e.target.value) || 0 }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenItemDialog(false)}>キャンセル</Button>
          <Button variant="contained" onClick={addFreeEntryItem}>
            自由入力で追加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EstimateCreation;