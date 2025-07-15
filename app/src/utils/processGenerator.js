// 見積書から工程表を自動生成するユーティリティ

// 造園業界標準工程パターン
const LANDSCAPING_PROCESS_PATTERNS = {
  // 基本工程カテゴリ
  categories: {
    survey: {
      name: '調査・測量',
      duration: 1,
      order: 1,
      keywords: ['調査', '測量', '現場確認', '土壌', '地質'],
      color: '#3b82f6'
    },
    design: {
      name: '設計・計画',
      duration: 3,
      order: 2,
      keywords: ['設計', '図面', '計画', 'デザイン', 'プラン'],
      color: '#8b5cf6'
    },
    procurement: {
      name: '材料調達',
      duration: 2,
      order: 3,
      keywords: ['材料', '調達', '発注', '仕入', '資材'],
      color: '#f59e0b'
    },
    preparation: {
      name: '準備工事',
      duration: 2,
      order: 4,
      keywords: ['準備', '仮設', '養生', '搬入', '機材'],
      color: '#6b7280'
    },
    demolition: {
      name: '解体・撤去',
      duration: 3,
      order: 5,
      keywords: ['解体', '撤去', '除去', '取り壊し', '廃棄'],
      color: '#ef4444'
    },
    earthwork: {
      name: '土工事',
      duration: 4,
      order: 6,
      keywords: ['土工', '掘削', '盛土', '整地', '造成', '土'],
      color: '#92400e'
    },
    foundation: {
      name: '基礎工事',
      duration: 5,
      order: 7,
      keywords: ['基礎', 'コンクリート', '打設', '型枠', '鉄筋'],
      color: '#374151'
    },
    drainage: {
      name: '排水工事',
      duration: 3,
      order: 8,
      keywords: ['排水', '給排水', '配管', '下水', '雨水'],
      color: '#0ea5e9'
    },
    electrical: {
      name: '電気工事',
      duration: 2,
      order: 9,
      keywords: ['電気', '配線', '照明', 'コンセント', '分電盤'],
      color: '#eab308'
    },
    structures: {
      name: '構造物工事',
      duration: 6,
      order: 10,
      keywords: ['構造', '石材', '塀', '擁壁', '階段', 'ブロック'],
      color: '#64748b'
    },
    paving: {
      name: '舗装工事',
      duration: 4,
      order: 11,
      keywords: ['舗装', 'アスファルト', 'コンクリート', '敷石', 'タイル'],
      color: '#475569'
    },
    waterfeatures: {
      name: '水景工事',
      duration: 5,
      order: 12,
      keywords: ['池', '噴水', '水景', '滝', '流れ', '水'],
      color: '#06b6d4'
    },
    planting: {
      name: '植栽工事',
      duration: 4,
      order: 13,
      keywords: ['植栽', '樹木', '高木', '中木', '低木', '植物'],
      color: '#10b981'
    },
    lawn: {
      name: '芝・草花',
      duration: 3,
      order: 14,
      keywords: ['芝', '芝生', '草花', '花壇', '種子', '苗'],
      color: '#22c55e'
    },
    finishing: {
      name: '仕上げ工事',
      duration: 2,
      order: 15,
      keywords: ['仕上げ', '最終', '調整', '清掃', '完成'],
      color: '#a3a3a3'
    },
    maintenance: {
      name: 'メンテナンス',
      duration: 1,
      order: 16,
      keywords: ['メンテナンス', '維持', '管理', '点検', '保守'],
      color: '#84cc16'
    }
  },

  // 規模別工期係数
  scaleFactors: {
    small: 0.8,    // 50万円以下
    medium: 1.0,   // 50万円〜200万円
    large: 1.3,    // 200万円〜500万円
    xlarge: 1.6    // 500万円以上
  },

  // 季節係数
  seasonFactors: {
    spring: 1.0,   // 3-5月
    summer: 1.2,   // 6-8月（暑さによる効率低下）
    autumn: 1.0,   // 9-11月
    winter: 1.4    // 12-2月（天候による影響）
  },

  // 並行作業可能な工程
  parallelProcesses: [
    ['drainage', 'electrical'],
    ['structures', 'waterfeatures'],
    ['planting', 'lawn']
  ]
};

// 見積項目から工程カテゴリを判定
export const categorizeEstimateItem = (item) => {
  const itemName = item.name.toLowerCase();
  const itemDescription = (item.description || '').toLowerCase();
  const searchText = `${itemName} ${itemDescription}`;

  // 各カテゴリのキーワードマッチング
  for (const [categoryKey, category] of Object.entries(LANDSCAPING_PROCESS_PATTERNS.categories)) {
    const matchScore = category.keywords.reduce((score, keyword) => {
      if (searchText.includes(keyword)) {
        return score + 1;
      }
      return score;
    }, 0);

    if (matchScore > 0) {
      return {
        category: categoryKey,
        confidence: matchScore / category.keywords.length,
        ...category
      };
    }
  }

  // デフォルトカテゴリ
  return {
    category: 'finishing',
    confidence: 0.1,
    ...LANDSCAPING_PROCESS_PATTERNS.categories.finishing
  };
};

// 工程期間を計算
export const calculateProcessDuration = (item, projectScale, season) => {
  const category = categorizeEstimateItem(item);
  
  // 基本工期
  let baseDuration = category.duration;
  
  // 金額に基づく工期調整
  const itemAmount = item.amount || 0;
  const amountFactor = Math.max(0.5, Math.min(3.0, itemAmount / 100000)); // 10万円を基準
  
  // 規模係数
  const scaleFactor = LANDSCAPING_PROCESS_PATTERNS.scaleFactors[projectScale] || 1.0;
  
  // 季節係数
  const seasonFactor = LANDSCAPING_PROCESS_PATTERNS.seasonFactors[season] || 1.0;
  
  // 最終工期計算
  const finalDuration = Math.max(1, Math.round(baseDuration * amountFactor * scaleFactor * seasonFactor));
  
  return {
    duration: finalDuration,
    baseDuration,
    amountFactor,
    scaleFactor,
    seasonFactor,
    category
  };
};

// プロジェクト規模を判定
export const determineProjectScale = (totalAmount) => {
  if (totalAmount <= 500000) return 'small';
  if (totalAmount <= 2000000) return 'medium';
  if (totalAmount <= 5000000) return 'large';
  return 'xlarge';
};

// 季節を判定
export const determineSeason = (startDate) => {
  const month = new Date(startDate).getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

// 工程の依存関係を設定
export const setProcessDependencies = (processes) => {
  const sortedProcesses = processes.sort((a, b) => a.order - b.order);
  
  return sortedProcesses.map((process, index) => {
    const dependencies = [];
    
    // 基本的な順序依存関係
    if (index > 0) {
      const previousProcess = sortedProcesses[index - 1];
      dependencies.push(previousProcess.id);
    }
    
    // 特定の依存関係
    if (process.category === 'planting' || process.category === 'lawn') {
      // 植栽は土工事と構造物工事の後
      const earthwork = processes.find(p => p.category === 'earthwork');
      const structures = processes.find(p => p.category === 'structures');
      if (earthwork && !dependencies.includes(earthwork.id)) {
        dependencies.push(earthwork.id);
      }
      if (structures && !dependencies.includes(structures.id)) {
        dependencies.push(structures.id);
      }
    }
    
    if (process.category === 'finishing') {
      // 仕上げは植栽工事の後
      const planting = processes.find(p => p.category === 'planting');
      if (planting && !dependencies.includes(planting.id)) {
        dependencies.push(planting.id);
      }
    }
    
    return {
      ...process,
      dependencies
    };
  });
};

// 並行作業を考慮したスケジュール最適化
export const optimizeSchedule = (processes, projectStartDate) => {
  const startDate = new Date(projectStartDate);
  const processMap = new Map(processes.map(p => [p.id, p]));
  const completedProcesses = new Set();
  const scheduledProcesses = [];
  
  // 開始可能な工程を見つける
  const findReadyProcesses = () => {
    return processes.filter(process => {
      if (completedProcesses.has(process.id)) return false;
      
      return process.dependencies.every(depId => 
        completedProcesses.has(depId)
      );
    });
  };
  
  // 並行実行可能な工程を見つける
  const findParallelProcesses = (readyProcesses) => {
    const parallelGroups = [];
    
    LANDSCAPING_PROCESS_PATTERNS.parallelProcesses.forEach(parallelGroup => {
      const availableProcesses = readyProcesses.filter(p => 
        parallelGroup.includes(p.category)
      );
      
      if (availableProcesses.length > 1) {
        parallelGroups.push(availableProcesses);
      }
    });
    
    return parallelGroups;
  };
  
  let currentDate = new Date(startDate);
  
  while (scheduledProcesses.length < processes.length) {
    const readyProcesses = findReadyProcesses();
    const parallelGroups = findParallelProcesses(readyProcesses);
    
    if (parallelGroups.length > 0) {
      // 並行実行可能な工程を処理
      const parallelGroup = parallelGroups[0];
      const maxDuration = Math.max(...parallelGroup.map(p => p.duration));
      
      parallelGroup.forEach(process => {
        const processStartDate = new Date(currentDate);
        const processEndDate = new Date(currentDate);
        processEndDate.setDate(processEndDate.getDate() + process.duration);
        
        scheduledProcesses.push({
          ...process,
          startDate: processStartDate,
          endDate: processEndDate,
          isParallel: true
        });
        
        completedProcesses.add(process.id);
      });
      
      currentDate.setDate(currentDate.getDate() + maxDuration);
    } else if (readyProcesses.length > 0) {
      // 順次実行
      const process = readyProcesses.sort((a, b) => a.order - b.order)[0];
      const processStartDate = new Date(currentDate);
      const processEndDate = new Date(currentDate);
      processEndDate.setDate(processEndDate.getDate() + process.duration);
      
      scheduledProcesses.push({
        ...process,
        startDate: processStartDate,
        endDate: processEndDate,
        isParallel: false
      });
      
      completedProcesses.add(process.id);
      currentDate = new Date(processEndDate);
    } else {
      // デッドロックを避けるため、依存関係を無視して次の工程を開始
      const remainingProcesses = processes.filter(p => !completedProcesses.has(p.id));
      if (remainingProcesses.length > 0) {
        const process = remainingProcesses.sort((a, b) => a.order - b.order)[0];
        const processStartDate = new Date(currentDate);
        const processEndDate = new Date(currentDate);
        processEndDate.setDate(processEndDate.getDate() + process.duration);
        
        scheduledProcesses.push({
          ...process,
          startDate: processStartDate,
          endDate: processEndDate,
          isParallel: false,
          hasConflict: true
        });
        
        completedProcesses.add(process.id);
        currentDate = new Date(processEndDate);
      } else {
        break;
      }
    }
  }
  
  return scheduledProcesses;
};

// メイン関数：見積書から工程表を生成
export const generateProcessSchedule = (estimateData, options = {}) => {
  const {
    projectStartDate = new Date(),
    includeWeekends = false,
    bufferDays = 0
  } = options;
  
  const totalAmount = estimateData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const projectScale = determineProjectScale(totalAmount);
  const season = determineSeason(projectStartDate);
  
  // 見積項目を工程に変換
  const processes = estimateData.items.map((item, index) => {
    const categoryInfo = categorizeEstimateItem(item);
    const durationInfo = calculateProcessDuration(item, projectScale, season);
    
    return {
      id: `process_${index + 1}`,
      name: item.name,
      description: item.description || '',
      category: categoryInfo.category,
      duration: durationInfo.duration,
      order: categoryInfo.order,
      estimateItemId: item.id,
      amount: item.amount || 0,
      confidence: categoryInfo.confidence,
      color: categoryInfo.color,
      progress: 0,
      status: 'pending',
      dependencies: []
    };
  });
  
  // 工程の統合（同一カテゴリをまとめる）
  const consolidatedProcesses = consolidateProcesses(processes);
  
  // 依存関係を設定
  const processesWithDependencies = setProcessDependencies(consolidatedProcesses);
  
  // スケジュール最適化
  const scheduledProcesses = optimizeSchedule(processesWithDependencies, projectStartDate);
  
  // 工程表メタデータ
  const metadata = {
    projectScale,
    season,
    totalAmount,
    totalDuration: scheduledProcesses.reduce((sum, p) => sum + p.duration, 0),
    estimatedEndDate: scheduledProcesses.length > 0 
      ? scheduledProcesses[scheduledProcesses.length - 1].endDate 
      : projectStartDate,
    parallelProcessCount: scheduledProcesses.filter(p => p.isParallel).length,
    criticalPath: findCriticalPath(scheduledProcesses),
    generatedAt: new Date()
  };
  
  return {
    processes: scheduledProcesses,
    metadata,
    summary: generateProcessSummary(scheduledProcesses, metadata)
  };
};

// 同一カテゴリの工程を統合
const consolidateProcesses = (processes) => {
  const categoryMap = new Map();
  
  processes.forEach(process => {
    const key = process.category;
    
    if (categoryMap.has(key)) {
      const existing = categoryMap.get(key);
      existing.duration += process.duration;
      existing.amount += process.amount;
      existing.description += `、${process.description}`;
      existing.estimateItemIds.push(process.estimateItemId);
    } else {
      categoryMap.set(key, {
        ...process,
        estimateItemIds: [process.estimateItemId]
      });
    }
  });
  
  return Array.from(categoryMap.values());
};

// クリティカルパスを見つける
const findCriticalPath = (processes) => {
  // 簡単な実装：最長経路を求める
  const processMap = new Map(processes.map(p => [p.id, p]));
  const visited = new Set();
  const paths = [];
  
  const findLongestPath = (process, currentPath, currentDuration) => {
    if (visited.has(process.id)) return;
    
    visited.add(process.id);
    currentPath.push(process.id);
    currentDuration += process.duration;
    
    const dependents = processes.filter(p => p.dependencies.includes(process.id));
    
    if (dependents.length === 0) {
      paths.push({
        path: [...currentPath],
        duration: currentDuration
      });
    } else {
      dependents.forEach(dependent => {
        findLongestPath(dependent, [...currentPath], currentDuration);
      });
    }
    
    visited.delete(process.id);
  };
  
  // 開始工程から探索
  const startProcesses = processes.filter(p => p.dependencies.length === 0);
  startProcesses.forEach(process => {
    findLongestPath(process, [], 0);
  });
  
  // 最長経路を返す
  const longestPath = paths.reduce((max, path) => 
    path.duration > max.duration ? path : max
  , { path: [], duration: 0 });
  
  return longestPath.path;
};

// 工程表サマリー生成
const generateProcessSummary = (processes, metadata) => {
  const categoryCount = new Set(processes.map(p => p.category)).size;
  const parallelProcessCount = processes.filter(p => p.isParallel).length;
  const conflictCount = processes.filter(p => p.hasConflict).length;
  
  return {
    totalProcesses: processes.length,
    categoryCount,
    parallelProcessCount,
    conflictCount,
    averageDuration: processes.reduce((sum, p) => sum + p.duration, 0) / processes.length,
    recommendations: generateRecommendations(processes, metadata)
  };
};

// 改善提案を生成
const generateRecommendations = (processes, metadata) => {
  const recommendations = [];
  
  // 長期間の工程を警告
  const longProcesses = processes.filter(p => p.duration > 7);
  if (longProcesses.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `${longProcesses.length}個の工程が1週間以上の期間です。細分化を検討してください。`,
      processes: longProcesses.map(p => p.id)
    });
  }
  
  // 並行作業の提案
  const sequentialProcesses = processes.filter(p => !p.isParallel);
  if (sequentialProcesses.length > 5) {
    recommendations.push({
      type: 'suggestion',
      message: '並行作業を増やすことで工期短縮が可能です。',
      processes: sequentialProcesses.slice(0, 3).map(p => p.id)
    });
  }
  
  // 季節に応じた提案
  if (metadata.season === 'winter') {
    recommendations.push({
      type: 'info',
      message: '冬季は天候の影響で工期が延びる可能性があります。余裕を持った計画を立ててください。'
    });
  }
  
  return recommendations;
};

// 工程表データをエクスポート
export const exportProcessData = (processData, format = 'json') => {
  switch (format) {
    case 'json':
      return JSON.stringify(processData, null, 2);
    
    case 'csv':
      const headers = ['工程名', '開始日', '終了日', '期間', 'カテゴリ', '金額', '進捗'];
      const rows = processData.processes.map(p => [
        p.name,
        p.startDate.toISOString().split('T')[0],
        p.endDate.toISOString().split('T')[0],
        p.duration,
        p.category,
        p.amount,
        p.progress
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    
    default:
      return processData;
  }
};

export default {
  generateProcessSchedule,
  categorizeEstimateItem,
  calculateProcessDuration,
  optimizeSchedule,
  exportProcessData
};