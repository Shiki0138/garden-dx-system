import { apiRequest } from './api';

// 工程管理API
export const processService = {
  // 工程一覧取得
  async getProcesses(projectId) {
    return await apiRequest(`/projects/${projectId}/processes`, {
      method: 'GET'
    });
  },

  // 見積書から工程表を自動生成
  async generateProcessesFromEstimate(estimateId) {
    return await apiRequest(`/estimates/${estimateId}/generate-processes`, {
      method: 'POST'
    });
  },

  // 工程作成
  async createProcess(projectId, processData) {
    return await apiRequest(`/projects/${projectId}/processes`, {
      method: 'POST',
      body: JSON.stringify(processData)
    });
  },

  // 工程更新
  async updateProcess(processId, processData) {
    return await apiRequest(`/processes/${processId}`, {
      method: 'PUT',
      body: JSON.stringify(processData)
    });
  },

  // 工程削除
  async deleteProcess(processId) {
    return await apiRequest(`/processes/${processId}`, {
      method: 'DELETE'
    });
  },

  // 工程進捗更新
  async updateProcessProgress(processId, progress) {
    return await apiRequest(`/processes/${processId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress })
    });
  },

  // 工程日程更新
  async updateProcessSchedule(processId, startDate, endDate) {
    return await apiRequest(`/processes/${processId}/schedule`, {
      method: 'PUT',
      body: JSON.stringify({ startDate, endDate })
    });
  },

  // 工程表PDF生成
  async generateProcessPDF(projectId, format = 'gantt') {
    return await apiRequest(`/projects/${projectId}/processes/pdf`, {
      method: 'POST',
      body: JSON.stringify({ format })
    });
  },

  // 工程テンプレート取得
  async getProcessTemplates() {
    return await apiRequest('/process-templates', {
      method: 'GET'
    });
  },

  // 工程依存関係設定
  async setProcessDependencies(processId, dependencies) {
    return await apiRequest(`/processes/${processId}/dependencies`, {
      method: 'PUT',
      body: JSON.stringify({ dependencies })
    });
  }
};

// 造園業界標準工程データ
export const standardProcesses = {
  // 外構工事
  exterior: [
    {
      name: '現場調査・測量',
      duration: 1,
      category: 'preparation',
      defaultProgress: 0,
      description: '現場の状況確認と正確な測量',
      dependencies: []
    },
    {
      name: '設計・図面作成',
      duration: 3,
      category: 'design',
      defaultProgress: 0,
      description: '詳細設計図面の作成',
      dependencies: ['現場調査・測量']
    },
    {
      name: '材料発注',
      duration: 2,
      category: 'procurement',
      defaultProgress: 0,
      description: '必要資材の発注・手配',
      dependencies: ['設計・図面作成']
    },
    {
      name: '基礎工事',
      duration: 5,
      category: 'foundation',
      defaultProgress: 0,
      description: '基礎の掘削・コンクリート打設',
      dependencies: ['材料発注']
    },
    {
      name: '給排水工事',
      duration: 3,
      category: 'plumbing',
      defaultProgress: 0,
      description: '配管・排水設備の設置',
      dependencies: ['基礎工事']
    },
    {
      name: '電気工事',
      duration: 2,
      category: 'electrical',
      defaultProgress: 0,
      description: '照明・コンセント設置',
      dependencies: ['基礎工事']
    },
    {
      name: '舗装工事',
      duration: 4,
      category: 'paving',
      defaultProgress: 0,
      description: 'アスファルト・コンクリート舗装',
      dependencies: ['給排水工事', '電気工事']
    },
    {
      name: '植栽工事',
      duration: 3,
      category: 'planting',
      defaultProgress: 0,
      description: '樹木・草花の植栽',
      dependencies: ['舗装工事']
    },
    {
      name: '仕上げ・清掃',
      duration: 2,
      category: 'finishing',
      defaultProgress: 0,
      description: '最終仕上げ・現場清掃',
      dependencies: ['植栽工事']
    }
  ],

  // 庭園工事
  garden: [
    {
      name: '現場調査・土壌検査',
      duration: 1,
      category: 'preparation',
      defaultProgress: 0,
      description: '土壌の状態と排水性の確認',
      dependencies: []
    },
    {
      name: '設計・レイアウト',
      duration: 4,
      category: 'design',
      defaultProgress: 0,
      description: '庭園デザイン・植栽計画',
      dependencies: ['現場調査・土壌検査']
    },
    {
      name: '既存撤去・整地',
      duration: 3,
      category: 'demolition',
      defaultProgress: 0,
      description: '不要な植栽・構造物の撤去',
      dependencies: ['設計・レイアウト']
    },
    {
      name: '土工事・造成',
      duration: 5,
      category: 'earthwork',
      defaultProgress: 0,
      description: '土の入れ替え・レベル調整',
      dependencies: ['既存撤去・整地']
    },
    {
      name: '石材・構造物設置',
      duration: 6,
      category: 'structures',
      defaultProgress: 0,
      description: '石組み・塀・池などの設置',
      dependencies: ['土工事・造成']
    },
    {
      name: '給排水・照明設備',
      duration: 3,
      category: 'utilities',
      defaultProgress: 0,
      description: '灌水設備・照明の設置',
      dependencies: ['石材・構造物設置']
    },
    {
      name: '植栽工事',
      duration: 4,
      category: 'planting',
      defaultProgress: 0,
      description: '高木・中木・低木の植栽',
      dependencies: ['給排水・照明設備']
    },
    {
      name: '芝・草花植栽',
      duration: 3,
      category: 'lawn',
      defaultProgress: 0,
      description: '芝生・季節の草花植栽',
      dependencies: ['植栽工事']
    },
    {
      name: '仕上げ・養生',
      duration: 2,
      category: 'finishing',
      defaultProgress: 0,
      description: '最終調整・植栽の養生',
      dependencies: ['芝・草花植栽']
    }
  ],

  // 剪定・メンテナンス
  maintenance: [
    {
      name: '現場確認・見積',
      duration: 1,
      category: 'preparation',
      defaultProgress: 0,
      description: '樹木の状態確認と作業計画',
      dependencies: []
    },
    {
      name: '道具・機材準備',
      duration: 1,
      category: 'preparation',
      defaultProgress: 0,
      description: '剪定道具・処分袋の準備',
      dependencies: ['現場確認・見積']
    },
    {
      name: '高木剪定',
      duration: 3,
      category: 'pruning',
      defaultProgress: 0,
      description: '高木の剪定・枝下ろし',
      dependencies: ['道具・機材準備']
    },
    {
      name: '中木・低木剪定',
      duration: 2,
      category: 'pruning',
      defaultProgress: 0,
      description: '中木・低木の形状調整',
      dependencies: ['高木剪定']
    },
    {
      name: '除草・清掃',
      duration: 2,
      category: 'cleaning',
      defaultProgress: 0,
      description: '雑草除去・落ち葉清掃',
      dependencies: ['中木・低木剪定']
    },
    {
      name: '廃材処分',
      duration: 1,
      category: 'disposal',
      defaultProgress: 0,
      description: '剪定枝・雑草の処分',
      dependencies: ['除草・清掃']
    }
  ]
};

// 工程自動生成ロジック
export const generateProcessesFromEstimate = (estimateItems) => {
  const processes = [];
  let currentStartDate = new Date();
  
  // 見積項目から工程を推定
  estimateItems.forEach(item => {
    let processCategory = 'general';
    
    // 項目名から工程カテゴリを推定
    if (item.name.includes('調査') || item.name.includes('測量')) {
      processCategory = 'preparation';
    } else if (item.name.includes('設計') || item.name.includes('図面')) {
      processCategory = 'design';
    } else if (item.name.includes('基礎') || item.name.includes('掘削')) {
      processCategory = 'foundation';
    } else if (item.name.includes('給排水') || item.name.includes('配管')) {
      processCategory = 'plumbing';
    } else if (item.name.includes('電気') || item.name.includes('照明')) {
      processCategory = 'electrical';
    } else if (item.name.includes('舗装') || item.name.includes('アスファルト')) {
      processCategory = 'paving';
    } else if (item.name.includes('植栽') || item.name.includes('樹木')) {
      processCategory = 'planting';
    } else if (item.name.includes('石') || item.name.includes('構造')) {
      processCategory = 'structures';
    } else if (item.name.includes('芝') || item.name.includes('草花')) {
      processCategory = 'lawn';
    } else if (item.name.includes('剪定') || item.name.includes('メンテナンス')) {
      processCategory = 'pruning';
    } else if (item.name.includes('清掃') || item.name.includes('仕上げ')) {
      processCategory = 'finishing';
    }
    
    // 工程期間を推定（項目金額に基づく）
    const estimatedDuration = Math.max(1, Math.ceil(item.amount / 100000)); // 10万円あたり1日
    
    const process = {
      name: item.name,
      duration: estimatedDuration,
      category: processCategory,
      startDate: new Date(currentStartDate),
      endDate: new Date(currentStartDate.getTime() + estimatedDuration * 24 * 60 * 60 * 1000),
      progress: 0,
      estimateItemId: item.id,
      description: item.description || '',
      dependencies: []
    };
    
    processes.push(process);
    currentStartDate = new Date(process.endDate);
  });
  
  return processes;
};

// 工程依存関係の自動設定
export const setAutomaticDependencies = (processes) => {
  const categoryOrder = [
    'preparation',
    'design',
    'procurement',
    'demolition',
    'earthwork',
    'foundation',
    'plumbing',
    'electrical',
    'structures',
    'paving',
    'planting',
    'lawn',
    'pruning',
    'finishing',
    'cleaning',
    'disposal'
  ];
  
  return processes.map(process => {
    const dependencies = [];
    const currentCategoryIndex = categoryOrder.indexOf(process.category);
    
    // 前の工程カテゴリを依存関係として設定
    if (currentCategoryIndex > 0) {
      const previousCategories = categoryOrder.slice(0, currentCategoryIndex);
      processes.forEach(otherProcess => {
        if (previousCategories.includes(otherProcess.category)) {
          dependencies.push(otherProcess.name);
        }
      });
    }
    
    return {
      ...process,
      dependencies
    };
  });
};

// 工程スケジュール最適化（CPM: Critical Path Method）
export const optimizeSchedule = (processes) => {
  // 最早開始時刻の計算
  const calculateEarlyStart = (processes) => {
    const processMap = new Map(processes.map(p => [p.name, p]));
    
    const calculateES = (process) => {
      if (process.earlyStart !== undefined) return process.earlyStart;
      
      if (process.dependencies.length === 0) {
        process.earlyStart = 0;
      } else {
        const dependencyFinishTimes = process.dependencies.map(depName => {
          const depProcess = processMap.get(depName);
          if (depProcess) {
            const depES = calculateES(depProcess);
            return depES + depProcess.duration;
          }
          return 0;
        });
        process.earlyStart = Math.max(...dependencyFinishTimes);
      }
      
      return process.earlyStart;
    };
    
    processes.forEach(calculateES);
    return processes;
  };
  
  // 最遅開始時刻の計算
  const calculateLateStart = (processes) => {
    const processMap = new Map(processes.map(p => [p.name, p]));
    const projectDuration = Math.max(...processes.map(p => p.earlyStart + p.duration));
    
    const calculateLS = (process) => {
      if (process.lateStart !== undefined) return process.lateStart;
      
      // この工程に依存する工程を検索
      const dependents = processes.filter(p => 
        p.dependencies.includes(process.name)
      );
      
      if (dependents.length === 0) {
        process.lateStart = projectDuration - process.duration;
      } else {
        const dependentStartTimes = dependents.map(depProcess => {
          const depLS = calculateLS(depProcess);
          return depLS;
        });
        process.lateStart = Math.min(...dependentStartTimes) - process.duration;
      }
      
      return process.lateStart;
    };
    
    processes.forEach(calculateLS);
    return processes;
  };
  
  // フロートの計算
  const calculateFloat = (processes) => {
    return processes.map(process => ({
      ...process,
      totalFloat: process.lateStart - process.earlyStart,
      isCritical: process.lateStart === process.earlyStart
    }));
  };
  
  let optimizedProcesses = calculateEarlyStart([...processes]);
  optimizedProcesses = calculateLateStart(optimizedProcesses);
  optimizedProcesses = calculateFloat(optimizedProcesses);
  
  return optimizedProcesses;
};

// 進捗レポート生成
export const generateProgressReport = (processes) => {
  const totalProcesses = processes.length;
  const completedProcesses = processes.filter(p => p.progress === 100).length;
  const inProgressProcesses = processes.filter(p => p.progress > 0 && p.progress < 100).length;
  const overdueProcesses = processes.filter(p => 
    new Date(p.endDate) < new Date() && p.progress < 100
  ).length;
  
  const overallProgress = totalProcesses > 0 
    ? Math.round(processes.reduce((sum, p) => sum + p.progress, 0) / totalProcesses)
    : 0;
  
  return {
    totalProcesses,
    completedProcesses,
    inProgressProcesses,
    overdueProcesses,
    overallProgress,
    onSchedule: overdueProcesses === 0,
    completionRate: totalProcesses > 0 ? (completedProcesses / totalProcesses) * 100 : 0
  };
};

export default processService;