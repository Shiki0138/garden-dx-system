/**
 * Garden Project Management System - Gantt Chart Component
 * 史上最強の造園業向けガントチャートコンポーネント
 * 
 * Created by: worker2
 * Date: 2025-06-30
 * Features:
 * - リアルタイム進捗表示
 * - タスク依存関係可視化
 * - ドラッグ&ドロップ編集
 * - 遅延アラート
 * - 予算連動表示
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { 
  Box, 
  Paper, 
  Typography, 
  Toolbar, 
  IconButton, 
  Tooltip,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  Today, 
  Warning, 
  CheckCircle, 
  Schedule,
  Edit,
  Add
} from '@mui/icons-material';

// Types
interface Task {
  task_id: number;
  project_id: number;
  task_name: string;
  task_description?: string;
  task_type: 'work' | 'milestone' | 'approval' | 'inspection';
  start_date: string;
  end_date: string;
  planned_start_date?: string;
  planned_end_date?: string;
  progress_percentage: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'suspended';
  assigned_to?: string;
  dependencies?: number[];
  budget_amount: number;
  actual_cost: number;
  level: number;
  parent_task_id?: number;
  is_milestone: boolean;
  delay_days?: number;
}

interface GanttChartProps {
  tasks: Task[];
  projectId: number;
  onTaskUpdate?: (taskId: number, updates: Partial<Task>) => void;
  onTaskCreate?: (task: Omit<Task, 'task_id'>) => void;
  readonly?: boolean;
  height?: number;
}

// Constants
const CHART_MARGINS = { top: 40, right: 20, bottom: 30, left: 200 };
const ROW_HEIGHT = 40;
const TASK_HEIGHT = 24;
const MILESTONE_SIZE = 12;

// Color schemes
const STATUS_COLORS = {
  not_started: '#e0e0e0',
  in_progress: '#2196f3',
  completed: '#4caf50',
  delayed: '#f44336',
  suspended: '#ff9800'
};

const TASK_TYPE_COLORS = {
  work: '#1976d2',
  milestone: '#9c27b0',
  approval: '#ff9800',
  inspection: '#795548'
};

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  projectId,
  onTaskUpdate,
  onTaskCreate,
  readonly = false,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewStartDate, setViewStartDate] = useState<Date>(new Date());
  const [viewEndDate, setViewEndDate] = useState<Date>(new Date());

  // Calculate chart dimensions
  const chartWidth = 1000;
  const chartHeight = tasks.length * ROW_HEIGHT;
  const plotWidth = chartWidth - CHART_MARGINS.left - CHART_MARGINS.right;
  const plotHeight = chartHeight - CHART_MARGINS.top - CHART_MARGINS.bottom;

  // Calculate date range
  const dateRange = useMemo(() => {
    if (tasks.length === 0) return { start: new Date(), end: new Date() };
    
    const dates = tasks.flatMap(task => [
      new Date(task.start_date),
      new Date(task.end_date),
      task.planned_start_date ? new Date(task.planned_start_date) : null,
      task.planned_end_date ? new Date(task.planned_end_date) : null
    ]).filter(Boolean) as Date[];
    
    const start = d3.min(dates) || new Date();
    const end = d3.max(dates) || new Date();
    
    // Add padding
    const padding = (end.getTime() - start.getTime()) * 0.1;
    return {
      start: new Date(start.getTime() - padding),
      end: new Date(end.getTime() + padding)
    };
  }, [tasks]);

  // Time scale
  const timeScale = useMemo(() => {
    return d3.scaleTime()
      .domain([viewStartDate, viewEndDate])
      .range([0, plotWidth]);
  }, [viewStartDate, viewEndDate, plotWidth]);

  // Initialize view dates
  useEffect(() => {
    setViewStartDate(dateRange.start);
    setViewEndDate(dateRange.end);
  }, [dateRange]);

  // Render chart
  useEffect(() => {
    if (!svgRef.current || tasks.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${CHART_MARGINS.left}, ${CHART_MARGINS.top})`);

    // Time axis
    const timeAxis = d3.axisTop(timeScale)
      .tickFormat(d3.timeFormat('%m/%d'))
      .ticks(d3.timeWeek.every(1));

    g.append('g')
      .attr('class', 'time-axis')
      .call(timeAxis);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(timeScale.ticks(d3.timeDay.every(1)))
      .enter()
      .append('line')
      .attr('x1', d => timeScale(d))
      .attr('x2', d => timeScale(d))
      .attr('y1', 0)
      .attr('y2', plotHeight)
      .attr('stroke', '#f0f0f0')
      .attr('stroke-width', 1);

    // Weekend highlighting
    const weekends = timeScale.ticks(d3.timeWeek.every(1));
    g.append('g')
      .attr('class', 'weekends')
      .selectAll('rect')
      .data(weekends)
      .enter()
      .append('rect')
      .attr('x', d => timeScale(d))
      .attr('y', 0)
      .attr('width', d => {
        const nextWeek = d3.timeWeek.offset(d, 1);
        return timeScale(nextWeek) - timeScale(d);
      })
      .attr('height', plotHeight)
      .attr('fill', '#f8f8f8')
      .attr('opacity', 0.5);

    // Task rows
    const taskGroups = g.selectAll('.task-row')
      .data(tasks)
      .enter()
      .append('g')
      .attr('class', 'task-row')
      .attr('transform', (d, i) => `translate(0, ${i * ROW_HEIGHT})`);

    // Task names (left side)
    const taskNames = svg.append('g')
      .attr('class', 'task-names')
      .attr('transform', `translate(0, ${CHART_MARGINS.top})`);

    taskNames.selectAll('.task-name')
      .data(tasks)
      .enter()
      .append('g')
      .attr('class', 'task-name')
      .attr('transform', (d, i) => `translate(0, ${i * ROW_HEIGHT})`)
      .each(function(d) {
        const group = d3.select(this);
        
        // Background
        group.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', CHART_MARGINS.left)
          .attr('height', ROW_HEIGHT)
          .attr('fill', d.level % 2 === 0 ? '#fafafa' : '#ffffff')
          .attr('stroke', '#e0e0e0');

        // Task name text
        group.append('text')
          .attr('x', 10 + d.level * 20)
          .attr('y', ROW_HEIGHT / 2)
          .attr('dy', '0.35em')
          .attr('font-size', '12px')
          .attr('font-weight', d.level === 0 ? 'bold' : 'normal')
          .text(d.task_name);

        // Status indicator
        group.append('circle')
          .attr('cx', CHART_MARGINS.left - 20)
          .attr('cy', ROW_HEIGHT / 2)
          .attr('r', 4)
          .attr('fill', STATUS_COLORS[d.status]);
      });

    // Task bars
    taskGroups.each(function(d) {
      const group = d3.select(this);
      const startX = timeScale(new Date(d.start_date));
      const endX = timeScale(new Date(d.end_date));
      const barWidth = endX - startX;
      const barY = (ROW_HEIGHT - TASK_HEIGHT) / 2;

      if (d.is_milestone) {
        // Milestone diamond
        group.append('path')
          .attr('d', `M ${startX} ${ROW_HEIGHT/2 - MILESTONE_SIZE/2} 
                     L ${startX + MILESTONE_SIZE/2} ${ROW_HEIGHT/2} 
                     L ${startX} ${ROW_HEIGHT/2 + MILESTONE_SIZE/2} 
                     L ${startX - MILESTONE_SIZE/2} ${ROW_HEIGHT/2} Z`)
          .attr('fill', TASK_TYPE_COLORS[d.task_type])
          .attr('stroke', '#333')
          .attr('stroke-width', 1);
      } else {
        // Planned vs actual bar
        if (d.planned_start_date && d.planned_end_date) {
          const plannedStartX = timeScale(new Date(d.planned_start_date));
          const plannedEndX = timeScale(new Date(d.planned_end_date));
          
          // Planned bar (background)
          group.append('rect')
            .attr('x', plannedStartX)
            .attr('y', barY + 2)
            .attr('width', plannedEndX - plannedStartX)
            .attr('height', TASK_HEIGHT - 4)
            .attr('fill', '#e0e0e0')
            .attr('stroke', '#bdbdbd')
            .attr('stroke-width', 1)
            .attr('rx', 2);
        }

        // Actual task bar
        group.append('rect')
          .attr('x', startX)
          .attr('y', barY)
          .attr('width', barWidth)
          .attr('height', TASK_HEIGHT)
          .attr('fill', STATUS_COLORS[d.status])
          .attr('stroke', '#333')
          .attr('stroke-width', 1)
          .attr('rx', 2)
          .style('cursor', readonly ? 'pointer' : 'move');

        // Progress overlay
        if (d.progress_percentage > 0) {
          group.append('rect')
            .attr('x', startX)
            .attr('y', barY)
            .attr('width', barWidth * (d.progress_percentage / 100))
            .attr('height', TASK_HEIGHT)
            .attr('fill', '#4caf50')
            .attr('opacity', 0.7)
            .attr('rx', 2);
        }

        // Budget indicator
        if (d.budget_amount > 0) {
          const budgetRate = d.actual_cost / d.budget_amount;
          const budgetColor = budgetRate > 1 ? '#f44336' : budgetRate > 0.9 ? '#ff9800' : '#4caf50';
          
          group.append('rect')
            .attr('x', startX)
            .attr('y', barY + TASK_HEIGHT - 3)
            .attr('width', barWidth)
            .attr('height', 3)
            .attr('fill', budgetColor)
            .attr('opacity', 0.8);
        }
      }

      // Click handler
      group.on('click', () => {
        setSelectedTask(d);
        if (!readonly) {
          setEditDialogOpen(true);
        }
      });

      // Tooltip
      group.append('title')
        .text(`${d.task_name}
進捗: ${d.progress_percentage}%
状態: ${d.status}
予算: ¥${d.budget_amount.toLocaleString()}
実績: ¥${d.actual_cost.toLocaleString()}
期間: ${d.start_date} - ${d.end_date}
${d.assigned_to ? `担当: ${d.assigned_to}` : ''}`);
    });

    // Dependencies
    tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        const taskIndex = tasks.findIndex(t => t.task_id === task.task_id);
        const taskY = taskIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

        task.dependencies.forEach(depId => {
          const depTask = tasks.find(t => t.task_id === depId);
          if (depTask) {
            const depIndex = tasks.findIndex(t => t.task_id === depId);
            const depY = depIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
            const depEndX = timeScale(new Date(depTask.end_date));
            const taskStartX = timeScale(new Date(task.start_date));

            // Dependency arrow
            g.append('path')
              .attr('d', `M ${depEndX} ${depY} 
                         L ${taskStartX - 10} ${depY} 
                         L ${taskStartX - 10} ${taskY} 
                         L ${taskStartX} ${taskY}`)
              .attr('stroke', '#666')
              .attr('stroke-width', 1)
              .attr('fill', 'none')
              .attr('marker-end', 'url(#arrowhead)');
          }
        });
      }
    });

    // Arrow marker definition
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 5)
      .attr('refY', 0)
      .attr('markerWidth', 4)
      .attr('markerHeight', 4)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#666');

    // Today line
    const today = new Date();
    if (today >= viewStartDate && today <= viewEndDate) {
      g.append('line')
        .attr('x1', timeScale(today))
        .attr('x2', timeScale(today))
        .attr('y1', 0)
        .attr('y2', plotHeight)
        .attr('stroke', '#f44336')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');
    }

  }, [tasks, timeScale, plotHeight, readonly]);

  // Zoom functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 5));
    const center = (viewEndDate.getTime() + viewStartDate.getTime()) / 2;
    const range = (viewEndDate.getTime() - viewStartDate.getTime()) / 1.5;
    setViewStartDate(new Date(center - range / 2));
    setViewEndDate(new Date(center + range / 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.2));
    const center = (viewEndDate.getTime() + viewStartDate.getTime()) / 2;
    const range = (viewEndDate.getTime() - viewStartDate.getTime()) * 1.5;
    setViewStartDate(new Date(center - range / 2));
    setViewEndDate(new Date(center + range / 2));
  };

  const handleGoToToday = () => {
    const today = new Date();
    const range = viewEndDate.getTime() - viewStartDate.getTime();
    setViewStartDate(new Date(today.getTime() - range / 2));
    setViewEndDate(new Date(today.getTime() + range / 2));
  };

  // Task edit handler
  const handleTaskSave = () => {
    if (selectedTask && onTaskUpdate) {
      onTaskUpdate(selectedTask.task_id, selectedTask);
    }
    setEditDialogOpen(false);
    setSelectedTask(null);
  };

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const delayed = tasks.filter(t => t.status === 'delayed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    
    return { total, completed, delayed, inProgress };
  }, [tasks]);

  return (
    <Paper elevation={2}>
      {/* Toolbar */}
      <Toolbar variant="dense">
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          工程表（ガントチャート）
        </Typography>
        
        {/* Statistics chips */}
        <Chip 
          icon={<CheckCircle />} 
          label={`完了: ${stats.completed}`} 
          color="success" 
          size="small" 
          sx={{ mr: 1 }} 
        />
        <Chip 
          icon={<Schedule />} 
          label={`進行中: ${stats.inProgress}`} 
          color="primary" 
          size="small" 
          sx={{ mr: 1 }} 
        />
        {stats.delayed > 0 && (
          <Chip 
            icon={<Warning />} 
            label={`遅延: ${stats.delayed}`} 
            color="error" 
            size="small" 
            sx={{ mr: 1 }} 
          />
        )}

        {/* Controls */}
        <Tooltip title="拡大">
          <IconButton onClick={handleZoomIn} size="small">
            <ZoomIn />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="縮小">
          <IconButton onClick={handleZoomOut} size="small">
            <ZoomOut />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="今日へ移動">
          <IconButton onClick={handleGoToToday} size="small">
            <Today />
          </IconButton>
        </Tooltip>

        {!readonly && onTaskCreate && (
          <Tooltip title="タスク追加">
            <IconButton onClick={() => setEditDialogOpen(true)} size="small">
              <Add />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>

      {/* Alert for delayed tasks */}
      {stats.delayed > 0 && (
        <Alert severity="warning" sx={{ m: 1 }}>
          {stats.delayed}件のタスクが遅延しています。確認してください。
        </Alert>
      )}

      {/* Chart */}
      <Box sx={{ overflow: 'auto', maxHeight: height }}>
        <svg
          ref={svgRef}
          width={chartWidth}
          height={chartHeight + CHART_MARGINS.top + CHART_MARGINS.bottom}
          style={{ display: 'block' }}
        />
      </Box>

      {/* Task Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTask ? 'タスク編集' : '新規タスク作成'}
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="タスク名"
                value={selectedTask.task_name}
                onChange={(e) => setSelectedTask({
                  ...selectedTask,
                  task_name: e.target.value
                })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="説明"
                multiline
                rows={3}
                value={selectedTask.task_description || ''}
                onChange={(e) => setSelectedTask({
                  ...selectedTask,
                  task_description: e.target.value
                })}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  type="date"
                  label="開始日"
                  value={selectedTask.start_date}
                  onChange={(e) => setSelectedTask({
                    ...selectedTask,
                    start_date: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
                
                <TextField
                  type="date"
                  label="終了日"
                  value={selectedTask.end_date}
                  onChange={(e) => setSelectedTask({
                    ...selectedTask,
                    end_date: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              
              <TextField
                type="number"
                label="進捗率 (%)"
                value={selectedTask.progress_percentage}
                onChange={(e) => setSelectedTask({
                  ...selectedTask,
                  progress_percentage: Number(e.target.value)
                })}
                inputProps={{ min: 0, max: 100 }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="担当者"
                value={selectedTask.assigned_to || ''}
                onChange={(e) => setSelectedTask({
                  ...selectedTask,
                  assigned_to: e.target.value
                })}
                sx={{ mb: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleTaskSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GanttChart;