/**
 * Garden DX Project - Optimized API Hooks
 * API呼び出し最適化（バッチング・キャッシュ・リトライ機能）
 * 
 * Created: 2025-07-02
 * Features:
 * - Request batching for multiple API calls
 * - Intelligent caching with TTL
 * - Automatic retry with exponential backoff
 * - Request deduplication
 * - Performance monitoring
 * - React Query integration
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

// Types
interface APIRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

interface BatchedResponse {
  id: string;
  data?: any;
  error?: string;
  status: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  batchEfficiency: number;
}

// Request batcher for optimizing multiple API calls
class APIBatcher {
  private queue: APIRequest[] = [];
  private batchSize: number = 10;
  private batchTimeout: number = 50; // 50ms
  private timeoutId: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  constructor(batchSize: number = 10, batchTimeout: number = 50) {
    this.batchSize = batchSize;
    this.batchTimeout = batchTimeout;
  }

  public addRequest(request: APIRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      // Add resolve/reject to the request
      (request as any).resolve = resolve;
      (request as any).reject = reject;

      // Sort by priority (critical > high > medium > low)
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      
      let insertIndex = this.queue.length;
      for (let i = 0; i < this.queue.length; i++) {
        if (priorityOrder[request.priority] > priorityOrder[this.queue[i].priority]) {
          insertIndex = i;
          break;
        }
      }
      
      this.queue.splice(insertIndex, 0, request);
      this.scheduleBatch();
    });
  }

  private scheduleBatch(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Process immediately if batch is full or has critical priority requests
    const hasCritical = this.queue.some(req => req.priority === 'critical');
    const shouldProcessImmediately = this.queue.length >= this.batchSize || hasCritical;

    if (shouldProcessImmediately) {
      this.processBatch();
    } else {
      this.timeoutId = setTimeout(() => this.processBatch(), this.batchTimeout);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      // Group requests by endpoint for potential optimization
      const groupedRequests = this.groupRequestsByEndpoint(batch);
      
      // Process each group
      for (const [endpoint, requests] of groupedRequests) {
        await this.processRequestGroup(endpoint, requests);
      }
    } catch (error) {
      // Handle batch processing errors
      batch.forEach(request => {
        (request as any).reject(error);
      });
    } finally {
      this.isProcessing = false;
      
      // Schedule next batch if queue is not empty
      if (this.queue.length > 0) {
        this.scheduleBatch();
      }
    }
  }

  private groupRequestsByEndpoint(requests: APIRequest[]): Map<string, APIRequest[]> {
    const groups = new Map<string, APIRequest[]>();
    
    requests.forEach(request => {
      const baseEndpoint = request.endpoint.split('?')[0]; // Remove query params
      if (!groups.has(baseEndpoint)) {
        groups.set(baseEndpoint, []);
      }
      groups.get(baseEndpoint)!.push(request);
    });
    
    return groups;
  }

  private async processRequestGroup(endpoint: string, requests: APIRequest[]): Promise<void> {
    // Check if we can batch these requests
    const canBatch = requests.every(req => req.method === 'GET') && requests.length > 1;
    
    if (canBatch) {
      await this.processBatchedGET(requests);
    } else {
      // Process individual requests
      await Promise.allSettled(requests.map(req => this.processIndividualRequest(req)));
    }
  }

  private async processBatchedGET(requests: APIRequest[]): Promise<void> {
    try {
      // Create a batched request
      const ids = requests.map(req => req.id);
      const endpoints = requests.map(req => req.endpoint);
      
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ endpoints, method: 'GET' }),
      });

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.status}`);
      }

      const batchResponse: BatchedResponse[] = await response.json();
      
      // Resolve individual promises
      requests.forEach((request, index) => {
        const result = batchResponse.find(r => r.id === request.id) || batchResponse[index];
        
        if (result && !result.error) {
          (request as any).resolve(result.data);
        } else {
          (request as any).reject(new Error(result?.error || 'Batch request failed'));
        }
      });

    } catch (error) {
      // Fallback to individual requests
      await Promise.allSettled(requests.map(req => this.processIndividualRequest(req)));
    }
  }

  private async processIndividualRequest(request: APIRequest): Promise<void> {
    try {
      const response = await fetch(request.endpoint, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          ...request.headers,
        },
        body: request.data ? JSON.stringify(request.data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      (request as any).resolve(data);

    } catch (error) {
      (request as any).reject(error);
    }
  }
}

// Intelligent cache with TTL and LRU eviction
class IntelligentCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private maxSize: number = 1000;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(maxSize: number = 1000, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  public get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }
    
    // Update access order and hit count
    entry.hits++;
    this.updateAccessOrder(key);
    
    return entry.data;
  }

  public set(key: string, data: any, ttl: number = this.defaultTTL): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });
    
    this.updateAccessOrder(key);
  }

  public invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  public getStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    averageHits: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    
    return {
      size: this.cache.size,
      hitRate: entries.length > 0 ? totalHits / entries.length : 0,
      totalHits,
      averageHits: entries.length > 0 ? totalHits / entries.length : 0,
    };
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift()!;
      this.cache.delete(oldestKey);
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

// Request deduplication manager
class DeduplicationManager {
  private pendingRequests = new Map<string, Promise<any>>();

  public async execute<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Execute request and store promise
    const promise = requestFn()
      .finally(() => {
        // Remove from pending requests when complete
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  public clear(): void {
    this.pendingRequests.clear();
  }
}

// Retry mechanism with exponential backoff
class RetryManager {
  public async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    config: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
    }
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('4')) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === config.maxAttempts) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
    
    throw lastError!;
  }
}

// Performance metrics tracker
class MetricsTracker {
  private metrics: APIMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    batchEfficiency: 0,
  };
  
  private responseTimes: number[] = [];
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private batchedRequests: number = 0;
  private individualRequests: number = 0;

  public recordRequest(responseTime: number, success: boolean, fromCache: boolean, batched: boolean): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
    
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    
    if (fromCache) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    
    this.metrics.cacheHitRate = 
      this.cacheHits / (this.cacheHits + this.cacheMisses) * 100;
    
    if (batched) {
      this.batchedRequests++;
    } else {
      this.individualRequests++;
    }
    
    this.metrics.batchEfficiency = 
      this.batchedRequests / (this.batchedRequests + this.individualRequests) * 100;
  }

  public getMetrics(): APIMetrics {
    return { ...this.metrics };
  }

  public reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      batchEfficiency: 0,
    };
    this.responseTimes = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.batchedRequests = 0;
    this.individualRequests = 0;
  }
}

// Global instances
const apiBatcher = new APIBatcher();
const intelligentCache = new IntelligentCache();
const deduplicationManager = new DeduplicationManager();
const retryManager = new RetryManager();
const metricsTracker = new MetricsTracker();

// Main optimized API hook
export const useOptimizedAPI = () => {
  const queryClient = useQueryClient();
  const requestIdRef = useRef(0);

  // Generate unique request ID
  const generateRequestId = useCallback(() => {
    return `req_${Date.now()}_${++requestIdRef.current}`;
  }, []);

  // Optimized GET request with caching and batching
  const get = useCallback(async (
    endpoint: string,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      ttl?: number;
      enableCache?: boolean;
      enableBatching?: boolean;
      retryConfig?: RetryConfig;
    } = {}
  ): Promise<any> => {
    const {
      priority = 'medium',
      ttl = 5 * 60 * 1000,
      enableCache = true,
      enableBatching = true,
      retryConfig,
    } = options;

    const startTime = performance.now();
    const cacheKey = `GET:${endpoint}`;

    try {
      // Check cache first
      if (enableCache) {
        const cached = intelligentCache.get(cacheKey);
        if (cached) {
          metricsTracker.recordRequest(
            performance.now() - startTime,
            true,
            true,
            false
          );
          return cached;
        }
      }

      // Deduplicate requests
      return await deduplicationManager.execute(cacheKey, async () => {
        const requestFn = async () => {
          if (enableBatching) {
            // Use batching system
            return await apiBatcher.addRequest({
              id: generateRequestId(),
              endpoint,
              method: 'GET',
              priority,
              timestamp: Date.now(),
            });
          } else {
            // Direct request
            const response = await fetch(endpoint, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              },
            });
            
            if (!response.ok) {
              throw new Error(`Request failed: ${response.status}`);
            }
            
            return await response.json();
          }
        };

        // Execute with retry if configured
        const data = retryConfig
          ? await retryManager.executeWithRetry(requestFn, retryConfig)
          : await requestFn();

        // Cache the result
        if (enableCache) {
          intelligentCache.set(cacheKey, data, ttl);
        }

        metricsTracker.recordRequest(
          performance.now() - startTime,
          true,
          false,
          enableBatching
        );

        return data;
      });

    } catch (error) {
      metricsTracker.recordRequest(
        performance.now() - startTime,
        false,
        false,
        enableBatching
      );
      throw error;
    }
  }, [generateRequestId]);

  // Optimized mutation with retry
  const mutate = useCallback(async (
    endpoint: string,
    data: any,
    options: {
      method?: 'POST' | 'PUT' | 'DELETE';
      invalidatePatterns?: string[];
      retryConfig?: RetryConfig;
    } = {}
  ): Promise<any> => {
    const { method = 'POST', invalidatePatterns = [], retryConfig } = options;
    const startTime = performance.now();

    try {
      const requestFn = async () => {
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        return await response.json();
      };

      const result = retryConfig
        ? await retryManager.executeWithRetry(requestFn, retryConfig)
        : await requestFn();

      // Invalidate cache patterns
      invalidatePatterns.forEach(pattern => {
        intelligentCache.invalidate(pattern);
        queryClient.invalidateQueries({ queryKey: [pattern] });
      });

      metricsTracker.recordRequest(
        performance.now() - startTime,
        true,
        false,
        false
      );

      return result;

    } catch (error) {
      metricsTracker.recordRequest(
        performance.now() - startTime,
        false,
        false,
        false
      );
      throw error;
    }
  }, [queryClient]);

  // React Query integration with optimizations
  const useOptimizedQuery = useCallback(<T>(
    queryKey: string[],
    endpoint: string,
    options: UseQueryOptions<T> & {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      enableBatching?: boolean;
      cacheTTL?: number;
    } = {}
  ) => {
    const { priority, enableBatching, cacheTTL, ...queryOptions } = options;

    return useQuery<T>({
      queryKey,
      queryFn: () => get(endpoint, { priority, enableBatching, ttl: cacheTTL }),
      staleTime: cacheTTL || 5 * 60 * 1000,
      ...queryOptions,
    });
  }, [get]);

  // Bulk operations with progress tracking
  const bulkMutate = useCallback(async (
    requests: Array<{
      endpoint: string;
      data: any;
      method?: 'POST' | 'PUT' | 'DELETE';
    }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<any[]> => {
    const results: any[] = [];
    const total = requests.length;

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      try {
        const result = await mutate(request.endpoint, request.data, {
          method: request.method,
        });
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return results;
  }, [mutate]);

  // Cache management
  const cacheManager = useMemo(() => ({
    invalidate: (pattern: string) => {
      intelligentCache.invalidate(pattern);
      queryClient.invalidateQueries({ queryKey: [pattern] });
    },
    clear: () => {
      intelligentCache.clear();
      queryClient.clear();
    },
    getStats: () => intelligentCache.getStats(),
  }), [queryClient]);

  // Performance metrics
  const getMetrics = useCallback(() => {
    return {
      api: metricsTracker.getMetrics(),
      cache: intelligentCache.getStats(),
    };
  }, []);

  return {
    get,
    mutate,
    useOptimizedQuery,
    bulkMutate,
    cacheManager,
    getMetrics,
  };
};

export default useOptimizedAPI;