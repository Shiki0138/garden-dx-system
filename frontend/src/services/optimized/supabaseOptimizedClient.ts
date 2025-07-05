/**
 * Garden DX Project - Optimized Supabase Client
 * Supabase接続プーリング・クエリ最適化・RLSポリシー効率化
 * 
 * Created: 2025-07-02
 * Features:
 * - Connection pooling with Supavisor
 * - Optimized RLS policies for better query performance
 * - Query batching and caching strategies
 * - Large data processing with pagination
 * - Performance monitoring and metrics
 */

import { createClient, SupabaseClient, PostgrestFilterBuilder } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Environment validation with IPv6 support
const validateEnvironmentVariables = () => {
  const errors: string[] = [];
  
  if (!import.meta.env.VITE_SUPABASE_URL) {
    errors.push('VITE_SUPABASE_URL is not set');
  }
  
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    errors.push('VITE_SUPABASE_ANON_KEY is not set');
  }
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }
};

// Optimized Supabase configuration with connection pooling
const createOptimizedSupabaseClient = (): SupabaseClient<Database> => {
  validateEnvironmentVariables();
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Use Supavisor pooler URL for IPv6 support and connection pooling
  const poolerUrl = supabaseUrl.replace('db.', 'pooler.').replace(':5432', ':6543');
  
  return createClient<Database>(poolerUrl, supabaseKey, {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-garden-dx-client': 'optimized-v1.0',
        'x-connection-pool': 'supavisor',
      },
    },
  });
};

// Optimized client instance
export const optimizedSupabase = createOptimizedSupabaseClient();

// Performance metrics tracking
interface QueryMetrics {
  queryType: string;
  executionTime: number;
  recordsAffected: number;
  cacheHit: boolean;
  timestamp: number;
}

class PerformanceTracker {
  private metrics: QueryMetrics[] = [];
  private readonly maxMetrics = 1000;

  public trackQuery(metrics: QueryMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  public getAverageExecutionTime(queryType?: string): number {
    const filteredMetrics = queryType 
      ? this.metrics.filter(m => m.queryType === queryType)
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 0;
    
    const totalTime = filteredMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    return totalTime / filteredMetrics.length;
  }

  public getCacheHitRate(queryType?: string): number {
    const filteredMetrics = queryType 
      ? this.metrics.filter(m => m.queryType === queryType)
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 0;
    
    const cacheHits = filteredMetrics.filter(m => m.cacheHit).length;
    return (cacheHits / filteredMetrics.length) * 100;
  }

  public getMetricsSummary(): {
    totalQueries: number;
    averageExecutionTime: number;
    cacheHitRate: number;
    slowestQueries: QueryMetrics[];
  } {
    const slowestQueries = [...this.metrics]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      totalQueries: this.metrics.length,
      averageExecutionTime: this.getAverageExecutionTime(),
      cacheHitRate: this.getCacheHitRate(),
      slowestQueries,
    };
  }
}

export const performanceTracker = new PerformanceTracker();

// Query cache for frequently accessed data
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  public set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  public get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const queryCache = new QueryCache();

// Optimized RLS helper functions
export const optimizedRLSHelpers = {
  /**
   * Get user's company_id with caching
   */
  async getUserCompanyId(): Promise<string | null> {
    const cacheKey = 'user_company_id';
    const cached = queryCache.get(cacheKey);
    
    if (cached) {
      performanceTracker.trackQuery({
        queryType: 'get_user_company_id',
        executionTime: 0,
        recordsAffected: 1,
        cacheHit: true,
        timestamp: Date.now(),
      });
      return cached;
    }

    const startTime = performance.now();
    
    try {
      const { data, error } = await optimizedSupabase
        .rpc('get_user_company_id');
      
      if (error) throw error;
      
      // Cache for 10 minutes
      queryCache.set(cacheKey, data, 10 * 60 * 1000);
      
      performanceTracker.trackQuery({
        queryType: 'get_user_company_id',
        executionTime: performance.now() - startTime,
        recordsAffected: 1,
        cacheHit: false,
        timestamp: Date.now(),
      });
      
      return data;
    } catch (error) {
      performanceTracker.trackQuery({
        queryType: 'get_user_company_id',
        executionTime: performance.now() - startTime,
        recordsAffected: 0,
        cacheHit: false,
        timestamp: Date.now(),
      });
      // Error handled by caller
      throw error;
    }
  },

  /**
   * Check user permissions with caching
   */
  async hasPermission(permission: string): Promise<boolean> {
    const cacheKey = `user_permission_${permission}`;
    const cached = queryCache.get(cacheKey);
    
    if (cached !== null) {
      performanceTracker.trackQuery({
        queryType: 'has_permission',
        executionTime: 0,
        recordsAffected: 1,
        cacheHit: true,
        timestamp: Date.now(),
      });
      return cached;
    }

    const startTime = performance.now();
    
    try {
      const { data, error } = await optimizedSupabase
        .rpc('has_permission', { permission_name: permission });
      
      if (error) throw error;
      
      // Cache for 5 minutes
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      
      performanceTracker.trackQuery({
        queryType: 'has_permission',
        executionTime: performance.now() - startTime,
        recordsAffected: 1,
        cacheHit: false,
        timestamp: Date.now(),
      });
      
      return data || false;
    } catch (error) {
      performanceTracker.trackQuery({
        queryType: 'has_permission',
        executionTime: performance.now() - startTime,
        recordsAffected: 0,
        cacheHit: false,
        timestamp: Date.now(),
      });
      return false;
    }
  },
};

// Optimized pagination with virtual scrolling support
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  useCache?: boolean;
  cacheTTL?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Optimized paginated data fetching with caching
 */
export const getPaginatedData = async <T>(
  table: string,
  options: PaginationOptions
): Promise<PaginatedResult<T>> => {
  const {
    page,
    pageSize,
    sortBy = 'created_at',
    sortOrder = 'desc',
    filters = {},
    useCache = true,
    cacheTTL = 2 * 60 * 1000, // 2 minutes
  } = options;

  // Generate cache key
  const cacheKey = `paginated_${table}_${JSON.stringify(options)}`;
  
  if (useCache) {
    const cached = queryCache.get(cacheKey);
    if (cached) {
      performanceTracker.trackQuery({
        queryType: `paginated_${table}`,
        executionTime: 0,
        recordsAffected: cached.data.length,
        cacheHit: true,
        timestamp: Date.now(),
      });
      return cached;
    }
  }

  const startTime = performance.now();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // Build optimized query with proper indexing
    let query = optimizedSupabase
      .from(table)
      .select('*', { count: 'exact' });

    // Apply filters efficiently
    Object.entries(filters).forEach(([column, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(column, value);
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.like(column, value);
        } else {
          query = query.eq(column, value);
        }
      }
    });

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / pageSize);
    
    const result: PaginatedResult<T> = {
      data: (data || []) as T[],
      count: count || 0,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    if (useCache) {
      queryCache.set(cacheKey, result, cacheTTL);
    }

    performanceTracker.trackQuery({
      queryType: `paginated_${table}`,
      executionTime: performance.now() - startTime,
      recordsAffected: data?.length || 0,
      cacheHit: false,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    performanceTracker.trackQuery({
      queryType: `paginated_${table}`,
      executionTime: performance.now() - startTime,
      recordsAffected: 0,
      cacheHit: false,
      timestamp: Date.now(),
    });
    throw error;
  }
};

// Batch operations for efficient data processing
export class BatchProcessor {
  private batchSize: number;
  private concurrency: number;

  constructor(batchSize: number = 100, concurrency: number = 3) {
    this.batchSize = batchSize;
    this.concurrency = concurrency;
  }

  /**
   * Process large datasets in optimized batches
   */
  async processBatch<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    const totalBatches = Math.ceil(items.length / this.batchSize);
    
    // Process batches with controlled concurrency
    for (let i = 0; i < totalBatches; i += this.concurrency) {
      const currentBatches = [];
      
      // Create concurrent batch promises
      for (let j = 0; j < this.concurrency && (i + j) < totalBatches; j++) {
        const batchIndex = i + j;
        const start = batchIndex * this.batchSize;
        const end = Math.min(start + this.batchSize, items.length);
        const batch = items.slice(start, end);
        
        currentBatches.push(processor(batch));
      }
      
      // Wait for current batch group to complete
      const batchResults = await Promise.all(currentBatches);
      
      // Flatten and add results
      batchResults.forEach(batchResult => {
        results.push(...batchResult);
      });
      
      // Report progress
      if (onProgress) {
        const processed = Math.min((i + this.concurrency) * this.batchSize, items.length);
        onProgress(processed, items.length);
      }
    }
    
    return results;
  }

  /**
   * Bulk insert with conflict resolution
   */
  async bulkInsert<T>(
    table: string,
    records: T[],
    options: {
      onConflict?: string;
      upsert?: boolean;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<void> {
    const { onConflict, upsert = false, onProgress } = options;
    
    await this.processBatch(
      records,
      async (batch) => {
        let query = optimizedSupabase.from(table).insert(batch);
        
        if (upsert && onConflict) {
          query = query.upsert(batch, { onConflict });
        }
        
        const { error } = await query;
        if (error) throw error;
        
        return batch;
      },
      onProgress
    );
  }

  /**
   * Bulk update with optimized queries
   */
  async bulkUpdate<T extends { id: string }>(
    table: string,
    records: T[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<void> {
    await this.processBatch(
      records,
      async (batch) => {
        // Use RPC for efficient bulk updates
        const { error } = await optimizedSupabase.rpc('bulk_update', {
          table_name: table,
          update_data: batch,
        });
        
        if (error) throw error;
        return batch;
      },
      onProgress
    );
  }
}

export const batchProcessor = new BatchProcessor();

// Real-time subscriptions with optimization
export class OptimizedRealtimeManager {
  private subscriptions = new Map<string, any>();
  private reconnectAttempts = new Map<string, number>();
  private readonly maxReconnectAttempts = 5;

  /**
   * Subscribe to real-time changes with automatic reconnection
   */
  subscribeToTable<T>(
    table: string,
    filters: any = {},
    callback: (payload: any) => void,
    options: {
      events?: ('INSERT' | 'UPDATE' | 'DELETE')[];
      throttleMs?: number;
    } = {}
  ): () => void {
    const { events = ['INSERT', 'UPDATE', 'DELETE'], throttleMs = 100 } = options;
    const subscriptionKey = `${table}_${JSON.stringify(filters)}`;
    
    // Throttle callback to prevent excessive updates
    const throttledCallback = this.throttle(callback, throttleMs);
    
    const subscription = optimizedSupabase
      .channel(`realtime_${subscriptionKey}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: Object.keys(filters).length > 0 ? this.buildFilter(filters) : undefined,
      }, (payload) => {
        if (events.includes(payload.eventType as any)) {
          throttledCallback(payload);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts.set(subscriptionKey, 0);
        } else if (status === 'CHANNEL_ERROR') {
          this.handleReconnection(subscriptionKey, table, filters, callback, options);
        }
      });

    this.subscriptions.set(subscriptionKey, subscription);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionKey);
    };
  }

  private buildFilter(filters: Record<string, any>): string {
    return Object.entries(filters)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join('&');
  }

  private handleReconnection(
    subscriptionKey: string,
    table: string,
    filters: any,
    callback: (payload: any) => void,
    options: any
  ): void {
    const attempts = this.reconnectAttempts.get(subscriptionKey) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      this.reconnectAttempts.set(subscriptionKey, attempts + 1);
      
      // Exponential backoff
      const delay = Math.pow(2, attempts) * 1000;
      
      setTimeout(() => {
        this.unsubscribe(subscriptionKey);
        this.subscribeToTable(table, filters, callback, options);
      }, delay);
    }
  }

  private throttle(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout | null = null;
    let lastExecTime = 0;
    
    return function executedFunction(...args: any[]) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > wait) {
        func.apply(null, args);
        lastExecTime = currentTime;
      } else {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(null, args);
          lastExecTime = Date.now();
        }, wait - (currentTime - lastExecTime));
      }
    };
  }

  unsubscribe(subscriptionKey: string): void {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (subscription) {
      optimizedSupabase.removeChannel(subscription);
      this.subscriptions.delete(subscriptionKey);
      this.reconnectAttempts.delete(subscriptionKey);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((_, key) => {
      this.unsubscribe(key);
    });
  }
}

export const realtimeManager = new OptimizedRealtimeManager();

// Export the optimized client as default
export default optimizedSupabase;