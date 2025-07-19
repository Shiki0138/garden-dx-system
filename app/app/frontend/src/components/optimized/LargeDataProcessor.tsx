/**
 * Garden DX Project - Large Data Processing Component
 * 大量データ処理の効率化コンポーネント
 * 
 * Created: 2025-07-02
 * Features:
 * - Virtual scrolling for large datasets
 * - Progressive data loading
 * - Memory-efficient rendering
 * - Chunked processing with web workers
 * - Real-time progress tracking
 * - CSV/Excel export optimization
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef,
  memo
} from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Checkbox,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid
} from '@mui/material';
import {
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  DataUsage as DataIcon
} from '@mui/icons-material';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Types
interface DataItem {
  id: string;
  [key: string]: any;
}

interface ProcessingMetrics {
  totalRecords: number;
  processedRecords: number;
  processingRate: number; // records per second
  estimatedTimeRemaining: number; // seconds
  memoryUsage: number; // MB
  errorCount: number;
}

interface FilterConfig {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
  value: string;
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface LargeDataProcessorProps {
  dataSource: string | (() => Promise<DataItem[]>);
  columns: Array<{
    key: string;
    label: string;
    width?: number;
    sortable?: boolean;
    filterable?: boolean;
    renderer?: (value: any, row: DataItem) => React.ReactNode;
  }>;
  pageSize?: number;
  enableVirtualScrolling?: boolean;
  enableExport?: boolean;
  enableSelection?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  onRowClick?: (row: DataItem) => void;
  maxRecordsInMemory?: number;
  chunkSize?: number;
}

// Web Worker for data processing
const createDataWorker = () => {
  const workerScript = `
    let processingData = [];
    let currentChunk = 0;
    let chunkSize = 1000;

    self.onmessage = function(e) {
      const { type, data, filters, sort, searchTerm } = e.data;

      switch (type) {
        case 'INIT':
          processingData = data;
          chunkSize = e.data.chunkSize || 1000;
          currentChunk = 0;
          self.postMessage({ type: 'INITIALIZED', totalRecords: processingData.length });
          break;

        case 'PROCESS_CHUNK':
          processChunk(filters, sort, searchTerm);
          break;

        case 'EXPORT_DATA':
          exportData(e.data.format, filters, sort, searchTerm);
          break;
      }
    };

    function processChunk(filters = [], sort = null, searchTerm = '') {
      const startIndex = currentChunk * chunkSize;
      const endIndex = Math.min(startIndex + chunkSize, processingData.length);
      const chunk = processingData.slice(startIndex, endIndex);

      let processed = chunk;

      // Apply search filter
      if (searchTerm) {
        processed = processed.filter(row => 
          Object.values(row).some(value => 
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }

      // Apply column filters
      processed = processed.filter(row => {
        return filters.every(filter => {
          const value = String(row[filter.column] || '').toLowerCase();
          const filterValue = filter.value.toLowerCase();

          switch (filter.operator) {
            case 'equals': return value === filterValue;
            case 'contains': return value.includes(filterValue);
            case 'startsWith': return value.startsWith(filterValue);
            case 'endsWith': return value.endsWith(filterValue);
            case 'greaterThan': return parseFloat(value) > parseFloat(filterValue);
            case 'lessThan': return parseFloat(value) < parseFloat(filterValue);
            default: return true;
          }
        });
      });

      // Apply sorting
      if (sort) {
        processed.sort((a, b) => {
          const aVal = a[sort.column];
          const bVal = b[sort.column];
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          
          if (sort.direction === 'asc') {
            return aStr.localeCompare(bStr);
          } else {
            return bStr.localeCompare(aStr);
          }
        });
      }

      self.postMessage({
        type: 'CHUNK_PROCESSED',
        data: processed,
        chunkIndex: currentChunk,
        startIndex,
        endIndex,
        hasMore: endIndex < processingData.length
      });

      currentChunk++;
    }

    function exportData(format, filters = [], sort = null, searchTerm = '') {
      let exportData = [...processingData];

      // Apply all filters
      if (searchTerm) {
        exportData = exportData.filter(row => 
          Object.values(row).some(value => 
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }

      exportData = exportData.filter(row => {
        return filters.every(filter => {
          const value = String(row[filter.column] || '').toLowerCase();
          const filterValue = filter.value.toLowerCase();

          switch (filter.operator) {
            case 'equals': return value === filterValue;
            case 'contains': return value.includes(filterValue);
            case 'startsWith': return value.startsWith(filterValue);
            case 'endsWith': return value.endsWith(filterValue);
            case 'greaterThan': return parseFloat(value) > parseFloat(filterValue);
            case 'lessThan': return parseFloat(value) < parseFloat(filterValue);
            default: return true;
          }
        });
      });

      if (sort) {
        exportData.sort((a, b) => {
          const aVal = a[sort.column];
          const bVal = b[sort.column];
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          
          if (sort.direction === 'asc') {
            return aStr.localeCompare(bStr);
          } else {
            return bStr.localeCompare(aStr);
          }
        });
      }

      self.postMessage({
        type: 'EXPORT_READY',
        data: exportData,
        format
      });
    }
  `;

  const blob = new Blob([workerScript], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

// Memory-efficient row renderer for virtual scrolling
const VirtualTableRow = memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: DataItem[];
    columns: any[];
    selectedIds: Set<string>;
    onRowSelect: (id: string, selected: boolean) => void;
    onRowClick?: (row: DataItem) => void;
    enableSelection: boolean;
  };
}>(({ index, style, data }) => {
  const { items, columns, selectedIds, onRowSelect, onRowClick, enableSelection } = data;
  const row = items[index];

  if (!row) {
    return (
      <div style={style}>
        <Box p={2} display="flex" justifyContent="center">
          <CircularProgress size={20} />
        </Box>
      </div>
    );
  }

  const isSelected = selectedIds.has(row.id);

  return (
    <div style={style}>
      <TableRow
        hover
        selected={isSelected}
        onClick={() => onRowClick?.(row)}
        sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
      >
        {enableSelection && (
          <TableCell padding="checkbox">
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onRowSelect(row.id, e.target.checked);
              }}
            />
          </TableCell>
        )}
        {columns.map((column) => (
          <TableCell key={column.key} sx={{ width: column.width }}>
            {column.renderer ? column.renderer(row[column.key], row) : row[column.key]}
          </TableCell>
        ))}
      </TableRow>
    </div>
  );
});

VirtualTableRow.displayName = 'VirtualTableRow';

// Main component
export const LargeDataProcessor: React.FC<LargeDataProcessorProps> = ({
  dataSource,
  columns,
  pageSize = 50,
  enableVirtualScrolling = true,
  enableExport = true,
  enableSelection = false,
  onSelectionChange,
  onRowClick,
  maxRecordsInMemory = 10000,
  chunkSize = 1000,
}) => {
  // State management
  const [data, setData] = useState<DataItem[]>([]);
  const [filteredData, setFilteredData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Performance metrics
  const [metrics, setMetrics] = useState<ProcessingMetrics>({
    totalRecords: 0,
    processedRecords: 0,
    processingRate: 0,
    estimatedTimeRemaining: 0,
    memoryUsage: 0,
    errorCount: 0,
  });

  // Refs
  const workerRef = useRef<Worker | null>(null);
  const processingStartTime = useRef<number>(0);
  const listRef = useRef<any>(null);

  // Memory usage tracker
  const measureMemoryUsage = useCallback((): number => {
    if ('memory' in performance && (performance as any).memory) {
      return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }, []);

  // Initialize web worker
  useEffect(() => {
    workerRef.current = createDataWorker();
    
    workerRef.current.onmessage = (e) => {
      const { type, data: workerData, hasMore, totalRecords } = e.data;

      switch (type) {
        case 'INITIALIZED':
          setMetrics(prev => ({ ...prev, totalRecords }));
          setLoading(false);
          break;

        case 'CHUNK_PROCESSED':
          if (e.data.chunkIndex === 0) {
            setFilteredData(workerData);
          } else {
            setFilteredData(prev => [...prev, ...workerData]);
          }
          
          setMetrics(prev => {
            const processed = prev.processedRecords + workerData.length;
            const elapsed = (Date.now() - processingStartTime.current) / 1000;
            const rate = processed / elapsed;
            const remaining = (prev.totalRecords - processed) / rate;
            
            return {
              ...prev,
              processedRecords: processed,
              processingRate: rate,
              estimatedTimeRemaining: remaining,
              memoryUsage: measureMemoryUsage(),
            };
          });

          if (hasMore) {
            // Continue processing next chunk
            setTimeout(() => {
              workerRef.current?.postMessage({ type: 'PROCESS_CHUNK', filters, sort, searchTerm });
            }, 10); // Small delay to prevent blocking
          } else {
            setIsProcessing(false);
          }
          break;

        case 'EXPORT_READY':
          handleExportData(workerData, e.data.format);
          setIsExporting(false);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [filters, sort, searchTerm, measureMemoryUsage]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [dataSource]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let rawData: DataItem[];

      if (typeof dataSource === 'string') {
        // Fetch from API endpoint
        const response = await fetch(dataSource);
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status}`);
        }
        rawData = await response.json();
      } else {
        // Use provided function
        rawData = await dataSource();
      }

      setData(rawData);
      
      // Initialize worker with data
      if (workerRef.current) {
        processingStartTime.current = Date.now();
        setIsProcessing(true);
        workerRef.current.postMessage({
          type: 'INIT',
          data: rawData,
          chunkSize,
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  }, [dataSource, chunkSize]);

  // Apply filters and sorting
  const applyFilters = useCallback(() => {
    if (!workerRef.current) return;

    setIsProcessing(true);
    processingStartTime.current = Date.now();
    setFilteredData([]);
    setMetrics(prev => ({ ...prev, processedRecords: 0 }));

    workerRef.current.postMessage({
      type: 'PROCESS_CHUNK',
      filters,
      sort,
      searchTerm,
    });
  }, [filters, sort, searchTerm]);

  // Handle row selection
  const handleRowSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      
      onSelectionChange?.(Array.from(newSet));
      return newSet;
    });
  }, [onSelectionChange]);

  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const allIds = new Set(filteredData.map(item => item.id));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  }, [filteredData, onSelectionChange]);

  // Handle column sorting
  const handleSort = useCallback((column: string) => {
    setSort(prev => {
      if (prev?.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  }, []);

  // Handle data export
  const handleExport = useCallback((format: 'csv' | 'excel') => {
    if (!workerRef.current) return;

    setIsExporting(true);
    workerRef.current.postMessage({
      type: 'EXPORT_DATA',
      format,
      filters,
      sort,
      searchTerm,
    });
  }, [filters, sort, searchTerm]);

  const handleExportData = useCallback((exportData: DataItem[], format: string) => {
    const headers = columns.map(col => col.label).join(',');
    const rows = exportData.map(row => 
      columns.map(col => {
        const value = row[col.key];
        // Escape CSV values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [columns]);

  // Virtual scrolling data for react-window
  const virtualScrollData = useMemo(() => ({
    items: filteredData,
    columns,
    selectedIds,
    onRowSelect: handleRowSelect,
    onRowClick,
    enableSelection,
  }), [filteredData, columns, selectedIds, handleRowSelect, onRowClick, enableSelection]);

  // Render table header
  const renderTableHeader = () => (
    <TableHead>
      <TableRow>
        {enableSelection && (
          <TableCell padding="checkbox">
            <Checkbox
              indeterminate={selectedIds.size > 0 && selectedIds.size < filteredData.length}
              checked={filteredData.length > 0 && selectedIds.size === filteredData.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
          </TableCell>
        )}
        {columns.map((column) => (
          <TableCell
            key={column.key}
            sx={{ 
              width: column.width,
              cursor: column.sortable ? 'pointer' : 'default',
              fontWeight: 'bold',
            }}
            onClick={() => column.sortable && handleSort(column.key)}
          >
            <Box display="flex" alignItems="center">
              {column.label}
              {column.sortable && sort?.column === column.key && (
                <Typography variant="caption" sx={{ ml: 1 }}>
                  {sort.direction === 'asc' ? '↑' : '↓'}
                </Typography>
              )}
            </Box>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          データを読み込み中...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button onClick={loadData} size="small">
          再試行
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Performance Metrics */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <Box display="flex" alignItems="center">
              <DataIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                {metrics.totalRecords.toLocaleString()} 件
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box display="flex" alignItems="center">
              <SpeedIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                {metrics.processingRate.toFixed(0)} 件/秒
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box display="flex" alignItems="center">
              <MemoryIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                {metrics.memoryUsage} MB
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Chip
              label={`選択: ${selectedIds.size}`}
              color={selectedIds.size > 0 ? 'primary' : 'default'}
              size="small"
            />
          </Grid>
        </Grid>

        {isProcessing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={(metrics.processedRecords / metrics.totalRecords) * 100} 
            />
            <Typography variant="caption" color="text.secondary">
              処理中: {metrics.processedRecords} / {metrics.totalRecords} 
              (残り約 {Math.round(metrics.estimatedTimeRemaining)}秒)
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={applyFilters}
              disabled={isProcessing}
              startIcon={<FilterIcon />}
            >
              フィルタ適用
            </Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={loadData}
              disabled={loading || isProcessing}
              startIcon={<RefreshIcon />}
            >
              更新
            </Button>
          </Grid>
          {enableExport && (
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => handleExport('csv')}
                disabled={isExporting || filteredData.length === 0}
                startIcon={<ExportIcon />}
              >
                CSV出力
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Data Table */}
      <Paper sx={{ height: 600 }}>
        <TableContainer>
          <Table stickyHeader>
            {renderTableHeader()}
            <TableBody>
              {enableVirtualScrolling ? (
                <AutoSizer>
                  {({ height, width }) => (
                    <List
                      ref={listRef}
                      height={height - 50} // Account for header
                      width={width}
                      itemCount={filteredData.length}
                      itemSize={52} // Row height
                      itemData={virtualScrollData}
                    >
                      {VirtualTableRow}
                    </List>
                  )}
                </AutoSizer>
              ) : (
                // Fallback to regular table for smaller datasets
                filteredData.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    selected={selectedIds.has(row.id)}
                    onClick={() => onRowClick?.(row)}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {enableSelection && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRowSelect(row.id, e.target.checked);
                          }}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.key} sx={{ width: column.width }}>
                        {column.renderer ? column.renderer(row[column.key], row) : row[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default LargeDataProcessor;