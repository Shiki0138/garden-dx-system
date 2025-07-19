/**
 * Garden Process Management Types
 * 工程管理・工程表作成機能の型定義
 * 
 * Created by: worker2 (Version Up - Process Management)
 * Date: 2025-07-01
 */

import { DateString, DateTimeString, Percentage, Priority } from './project.types';

// ==============================
// Process Management Types - 工程管理
// ==============================

export interface ProcessSchedule {
  readonly id: number;
  project_id: number;
  name: string;
  description: string;
  start_date: DateString;
  end_date: DateString;
  tasks: ProcessTask[];
  template_id?: string;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface ProcessTask {
  readonly id: number;
  name: string;
  description: string;
  start_date: DateString;
  end_date: DateString;
  duration: number; // days
  progress: Percentage;
  category: ProcessCategory;
  dependencies: number[];
  assigned_to: string;
  status: ProcessTaskStatus;
  priority: Priority;
}

export interface ProcessTemplate {
  readonly id: string;
  name: string;
  description: string;
  tasks: ProcessTemplateTask[];
}

export interface ProcessTemplateTask {
  name: string;
  duration: number;
  dependencies: number[];
  category: ProcessCategory;
}

// 造園業特化の工程カテゴリ
export type ProcessCategory = 
  | 'survey'          // 現地調査・測量
  | 'design'          // 設計・プラン作成
  | 'procurement'     // 資材調達・発注
  | 'demolition'      // 既存撤去・整地
  | 'foundation'      // 基礎工事・排水
  | 'planting'        // 植栽工事
  | 'decoration'      // 外構・装飾工事
  | 'finishing'       // 仕上げ・清掃
  | 'delivery'        // 検査・引き渡し
  | 'maintenance'     // メンテナンス
  | 'legal'           // 許可申請・承認
  | 'preparation'     // 仮設工事・安全対策
  | 'infrastructure'; // 給排水・電気工事

export type ProcessTaskStatus = 
  | 'planned'         // 計画中
  | 'in_progress'     // 進行中
  | 'completed'       // 完了
  | 'delayed'         // 遅延
  | 'cancelled';      // 中止

// ガントチャート拡張用のデータ型
export interface GanttProcessTask extends ProcessTask {
  startDate: Date;
  endDate: Date;
  color: string;
}

export interface GanttChartData {
  tasks: GanttProcessTask[];
  minDate: Date;
  maxDate: Date;
  totalDays: number;
}

// API Request/Response Types
export interface ProcessScheduleCreateRequest {
  project_id: number;
  name: string;
  description: string;
  start_date: DateString;
  template_id?: string;
  tasks?: Omit<ProcessTask, 'id'>[];
}

export interface ProcessScheduleUpdateRequest {
  name?: string;
  description?: string;
  start_date?: DateString;
  end_date?: DateString;
  tasks?: ProcessTask[];
}

export interface ProcessTaskCreateRequest {
  name: string;
  description: string;
  start_date: DateString;
  end_date: DateString;
  duration: number;
  category: ProcessCategory;
  assigned_to?: string;
  priority?: Priority;
  dependencies?: number[];
}

export interface ProcessTaskUpdateRequest {
  name?: string;
  description?: string;
  start_date?: DateString;
  end_date?: DateString;
  duration?: number;
  progress?: Percentage;
  category?: ProcessCategory;
  assigned_to?: string;
  status?: ProcessTaskStatus;
  priority?: Priority;
  dependencies?: number[];
}

// 進捗レポート用
export interface ProcessProgressReport {
  schedule_id: number;
  project_id: number;
  overall_progress: Percentage;
  completed_tasks: number;
  total_tasks: number;
  delayed_tasks: number;
  critical_path_delay: number;
  estimated_completion: DateString;
  category_progress: {
    category: ProcessCategory;
    progress: Percentage;
    tasks_count: number;
  }[];
  generated_at: DateTimeString;
}

// 造園業界テンプレート定義
export interface LandscapingTemplate {
  id: string;
  name: string;
  description: string;
  target_project_type: 'basic' | 'maintenance' | 'large-project' | 'commercial' | 'residential';
  estimated_duration: number; // days
  tasks: ProcessTemplateTask[];
  dependencies_map: { [taskIndex: number]: number[] };
}

export const LANDSCAPING_CATEGORIES_JP = {
  survey: '現地調査・測量',
  design: '設計・プラン作成',
  procurement: '資材調達・発注',
  demolition: '既存撤去・整地',
  foundation: '基礎工事・排水',
  planting: '植栽工事',
  decoration: '外構・装飾工事',
  finishing: '仕上げ・清掃',
  delivery: '検査・引き渡し',
  maintenance: 'メンテナンス',
  legal: '許可申請・承認',
  preparation: '仮設工事・安全対策',
  infrastructure: '給排水・電気工事'
} as const;

export const PROCESS_STATUS_JP = {
  planned: '計画中',
  in_progress: '進行中',
  completed: '完了',
  delayed: '遅延',
  cancelled: '中止'
} as const;