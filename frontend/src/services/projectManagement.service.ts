/**
 * Garden Project Management System - Project Management Service
 * プロジェクト管理サービス層（ビジネスロジック分離）
 * 
 * Created by: worker2 (Modularization Phase)
 * Date: 2025-06-30
 * Purpose: コード分割とビジネスロジックの中央集約化
 */

import { ApiResponse, PaginatedResponse } from '../types/api.types';
import { 
  Project, 
  ProjectTask, 
  ProjectStatistics, 
  ProjectFilter,
  TaskFilter,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  TaskCreateRequest,
  TaskUpdateRequest,
  BudgetTracking,
  ChangeOrder
} from '../types/project.types';

// API Base URLs
const API_BASE = '/api';
const PROJECT_API = `${API_BASE}/projects`;
const TASK_API = `${API_BASE}/tasks`;
const INTEGRATION_API = `${API_BASE}/integration`;

// HTTP Client Configuration
class HTTPClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    const userRole = localStorage.getItem('user_role');
    
    return {
      ...this.defaultHeaders,
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(userRole && { 'X-User-Role': userRole })
    };
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await fetch(`${this.baseURL}${url}${queryString}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(url: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async put<T>(url: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async delete<T>(url: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// Service Factory
class ProjectManagementServiceFactory {
  private static instance: ProjectManagementService;
  private static httpClient: HTTPClient;

  static getInstance(): ProjectManagementService {
    if (!this.instance) {
      this.httpClient = new HTTPClient();
      this.instance = new ProjectManagementService(this.httpClient);
    }
    return this.instance;
  }
}

// Main Project Management Service
export class ProjectManagementService {
  private http: HTTPClient;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(httpClient: HTTPClient) {
    this.http = httpClient;
    this.cache = new Map();
  }

  // Cache Management
  private getCacheKey(method: string, params: any): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private invalidateCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Project CRUD Operations
  async getProjects(filter?: ProjectFilter): Promise<PaginatedResponse<Project>> {
    const cacheKey = this.getCacheKey('getProjects', filter);
    const cached = this.getFromCache<PaginatedResponse<Project>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.http.get<PaginatedResponse<Project>>(PROJECT_API, filter);
    this.setCache(cacheKey, result);
    return result;
  }

  async getProject(projectId: number): Promise<ApiResponse<Project>> {
    const cacheKey = this.getCacheKey('getProject', { projectId });
    const cached = this.getFromCache<ApiResponse<Project>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.http.get<ApiResponse<Project>>(`${PROJECT_API}/${projectId}`);
    this.setCache(cacheKey, result);
    return result;
  }

  async createProject(data: ProjectCreateRequest): Promise<ApiResponse<Project>> {
    const result = await this.http.post<ApiResponse<Project>>(PROJECT_API, data);
    this.invalidateCache('getProjects');
    return result;
  }

  async updateProject(projectId: number, data: ProjectUpdateRequest): Promise<ApiResponse<Project>> {
    const result = await this.http.put<ApiResponse<Project>>(`${PROJECT_API}/${projectId}`, data);
    this.invalidateCache('getProject');
    this.invalidateCache('getProjects');
    return result;
  }

  async deleteProject(projectId: number): Promise<ApiResponse<void>> {
    const result = await this.http.delete<ApiResponse<void>>(`${PROJECT_API}/${projectId}`);
    this.invalidateCache('getProject');
    this.invalidateCache('getProjects');
    return result;
  }

  // Task Management
  async getProjectTasks(projectId: number, filter?: TaskFilter): Promise<PaginatedResponse<ProjectTask>> {
    const cacheKey = this.getCacheKey('getProjectTasks', { projectId, ...filter });
    const cached = this.getFromCache<PaginatedResponse<ProjectTask>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.http.get<PaginatedResponse<ProjectTask>>(`${PROJECT_API}/${projectId}/tasks`, filter);
    this.setCache(cacheKey, result);
    return result;
  }

  async getTask(taskId: number): Promise<ApiResponse<ProjectTask>> {
    const cacheKey = this.getCacheKey('getTask', { taskId });
    const cached = this.getFromCache<ApiResponse<ProjectTask>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.http.get<ApiResponse<ProjectTask>>(`${TASK_API}/${taskId}`);
    this.setCache(cacheKey, result);
    return result;
  }

  async createTask(projectId: number, data: TaskCreateRequest): Promise<ApiResponse<ProjectTask>> {
    const result = await this.http.post<ApiResponse<ProjectTask>>(`${PROJECT_API}/${projectId}/tasks`, data);
    this.invalidateCache('getProjectTasks');
    return result;
  }

  async updateTask(taskId: number, data: TaskUpdateRequest): Promise<ApiResponse<ProjectTask>> {
    const result = await this.http.put<ApiResponse<ProjectTask>>(`${TASK_API}/${taskId}`, data);
    this.invalidateCache('getTask');
    this.invalidateCache('getProjectTasks');
    return result;
  }

  async deleteTask(taskId: number): Promise<ApiResponse<void>> {
    const result = await this.http.delete<ApiResponse<void>>(`${TASK_API}/${taskId}`);
    this.invalidateCache('getTask');
    this.invalidateCache('getProjectTasks');
    return result;
  }

  // Progress Management
  async updateTaskProgress(taskId: number, progressData: {
    progress_percentage: number;
    status?: string;
    comment?: string;
    photos?: string[];
    location?: { latitude: number; longitude: number; address?: string };
  }): Promise<ApiResponse<ProjectTask>> {
    const result = await this.http.put<ApiResponse<ProjectTask>>(`${TASK_API}/${taskId}/progress`, progressData);
    this.invalidateCache('getTask');
    this.invalidateCache('getProjectTasks');
    return result;
  }

  // Budget Management
  async getBudgetTracking(projectId: number): Promise<ApiResponse<BudgetTracking[]>> {
    const cacheKey = this.getCacheKey('getBudgetTracking', { projectId });
    const cached = this.getFromCache<ApiResponse<BudgetTracking[]>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.http.get<ApiResponse<BudgetTracking[]>>(`${PROJECT_API}/${projectId}/budget`);
    this.setCache(cacheKey, result);
    return result;
  }

  async updateBudget(projectId: number, budgetData: {
    task_id?: number;
    actual_cost: number;
    comment?: string;
  }): Promise<ApiResponse<BudgetTracking>> {
    const result = await this.http.post<ApiResponse<BudgetTracking>>(`${PROJECT_API}/${projectId}/budget`, budgetData);
    this.invalidateCache('getBudgetTracking');
    return result;
  }

  // Change Orders
  async getChangeOrders(projectId: number): Promise<ApiResponse<ChangeOrder[]>> {
    const cacheKey = this.getCacheKey('getChangeOrders', { projectId });
    const cached = this.getFromCache<ApiResponse<ChangeOrder[]>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.http.get<ApiResponse<ChangeOrder[]>>(`${PROJECT_API}/${projectId}/change-orders`);
    this.setCache(cacheKey, result);
    return result;
  }

  async createChangeOrder(projectId: number, changeOrderData: {
    description: string;
    estimated_cost: number;
    reason: string;
  }): Promise<ApiResponse<ChangeOrder>> {
    const result = await this.http.post<ApiResponse<ChangeOrder>>(`${PROJECT_API}/${projectId}/change-orders`, changeOrderData);
    this.invalidateCache('getChangeOrders');
    return result;
  }

  // Statistics and Analytics
  async getProjectStatistics(projectId?: number): Promise<ApiResponse<ProjectStatistics>> {
    const cacheKey = this.getCacheKey('getProjectStatistics', { projectId });
    const cached = this.getFromCache<ApiResponse<ProjectStatistics>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const url = projectId ? `${PROJECT_API}/${projectId}/statistics` : `${PROJECT_API}/statistics`;
    const result = await this.http.get<ApiResponse<ProjectStatistics>>(url);
    this.setCache(cacheKey, result, 2 * 60 * 1000); // 2 minutes cache for statistics
    return result;
  }

  async getDashboardMetrics(companyId: number, userId?: number): Promise<ApiResponse<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    delayedProjects: number;
    totalRevenue: number;
    totalBudget: number;
    profitRate: number;
    taskCompletionRate: number;
  }>> {
    const cacheKey = this.getCacheKey('getDashboardMetrics', { companyId, userId });
    const cached = this.getFromCache<ApiResponse<any>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const params = { company_id: companyId, ...(userId && { user_id: userId }) };
    const result = await this.http.get<ApiResponse<any>>(`${PROJECT_API}/dashboard-metrics`, params);
    this.setCache(cacheKey, result, 30 * 1000); // 30 seconds cache for dashboard
    return result;
  }

  // Integration Services
  async createProjectFromEstimate(estimateId: number, projectData: {
    project_name?: string;
    start_date?: string;
    end_date?: string;
    notes?: string;
  }): Promise<ApiResponse<{
    project_id: number;
    project_name: string;
    total_budget: number;
    estimated_revenue: number;
    estimated_profit: number;
    estimated_profit_rate: number;
    created_tasks: any[];
    message: string;
  }>> {
    const result = await this.http.post<ApiResponse<any>>(`${INTEGRATION_API}/estimate-to-project`, {
      estimate_id: estimateId,
      ...projectData
    });
    this.invalidateCache('getProjects');
    return result;
  }

  async createInvoiceFromProject(projectId: number, invoiceData: {
    invoice_date?: string;
    payment_due_date?: string;
    notes?: string;
    include_change_orders?: boolean;
  }): Promise<ApiResponse<{
    invoice_id: number;
    invoice_number: string;
    invoice_amount: number;
    project_name: string;
    customer_info: any;
    pdf_url?: string;
    message: string;
  }>> {
    return this.http.post<ApiResponse<any>>(`${INTEGRATION_API}/project-to-invoice`, {
      project_id: projectId,
      ...invoiceData
    });
  }

  // Utility Methods
  async runIntegrationTests(): Promise<ApiResponse<{
    test_suite: string;
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    test_duration: number;
    test_results: any[];
    overall_status: string;
  }>> {
    return this.http.get<ApiResponse<any>>(`${INTEGRATION_API}/test-integration`);
  }

  async getSystemStatus(): Promise<ApiResponse<{
    integration_status: string;
    timestamp: string;
    statistics: any;
    ready_for_integration: boolean;
    estimated_completion: string;
  }>> {
    return this.http.get<ApiResponse<any>>(`${INTEGRATION_API}/system-status`);
  }

  // Health Check
  async getHealthCheck(): Promise<ApiResponse<{
    status: string;
    timestamp: string;
    services: Record<string, any>;
    database_status: string;
    performance_metrics: any;
  }>> {
    return this.http.get<ApiResponse<any>>(`${INTEGRATION_API}/health`);
  }

  // Cache Management Public Methods
  clearCache(): void {
    this.invalidateCache();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const projectManagementService = ProjectManagementServiceFactory.getInstance();

// Export individual service methods for easier importing
export const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskProgress,
  getBudgetTracking,
  updateBudget,
  getChangeOrders,
  createChangeOrder,
  getProjectStatistics,
  getDashboardMetrics,
  createProjectFromEstimate,
  createInvoiceFromProject,
  runIntegrationTests,
  getSystemStatus,
  getHealthCheck,
  clearCache,
  getCacheStats
} = projectManagementService;

export default projectManagementService;