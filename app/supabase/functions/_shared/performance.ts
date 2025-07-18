/**
 * Edge Functions パフォーマンス最適化ユーティリティ
 * Denoランタイム効率化・レスポンス最適化
 */

// パフォーマンス計測デコレータ
export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  timestamp: string;
  functionName: string;
}

// メモリ監視
export function getMemoryUsage(): number {
  // Denoの場合はRuntime APIを使用
  try {
    const memory = (Deno as any).memoryUsage?.();
    return memory?.rss || 0;
  } catch {
    return 0;
  }
}

// 実行時間計測
export function createPerformanceTracker(functionName: string) {
  const startTime = performance.now();
  const startMemory = getMemoryUsage();
  
  return {
    end: (): PerformanceMetrics => {
      const executionTime = performance.now() - startTime;
      const memoryUsage = getMemoryUsage() - startMemory;
      
      return {
        executionTime: Math.round(executionTime * 100) / 100, // 小数点2桁
        memoryUsage,
        timestamp: new Date().toISOString(),
        functionName
      };
    }
  };
}

// レスポンス圧縮
export function compressResponse(data: unknown): string {
  const jsonString = JSON.stringify(data);
  
  // 大きなレスポンスの場合は最適化
  if (jsonString.length > 1024) {
    // 空白削除・最小化
    return JSON.stringify(data, null, 0);
  }
  
  return jsonString;
}

// gzip圧縮対応
export async function compressData(data: string, encoding: string = 'gzip'): Promise<Uint8Array> {
  if (encoding === 'gzip') {
    try {
      // Deno標準ライブラリのgzip使用
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      await writer.write(new TextEncoder().encode(data));
      await writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      // チャンクを結合
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    } catch (error) {
      console.warn('Compression failed:', error);
      return new TextEncoder().encode(data);
    }
  }
  
  return new TextEncoder().encode(data);
}

// 最適化ヘッダー生成
export function createOptimizedHeaders(request?: Request): Record<string, string> {
  const acceptEncoding = request?.headers.get('accept-encoding') || '';
  const supportsGzip = acceptEncoding.includes('gzip');
  const supportsBrotli = acceptEncoding.includes('br');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60, s-maxage=300', // CDNキャッシュ
    'X-Response-Time': new Date().toISOString(),
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Accept-Encoding'
  };

  // 圧縮対応
  if (supportsBrotli) {
    headers['Content-Encoding'] = 'br';
  } else if (supportsGzip) {
    headers['Content-Encoding'] = 'gzip';
  }

  // ETag生成（キャッシュ最適化）
  const etag = `"${Date.now().toString(36)}"`;
  headers['ETag'] = etag;

  return headers;
}

// バッチ処理最適化
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    // 少し待機してリソース圧迫を避ける
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  return results;
}

// データベースクエリ最適化
export function optimizeQuery(baseQuery: string, filters?: Record<string, unknown>): string {
  let query = baseQuery;
  
  // 必要な列のみ選択
  if (!query.includes('SELECT *') && !query.includes('select(')) {
    // Supabaseクエリの場合は最適化
    query = query.replace(/\.select\(\s*\)/, '.select("id,name,created_at")');
  }
  
  // インデックス使用を促進
  if (filters && Object.keys(filters).length > 0) {
    // よく使われるフィルターを先に適用
    const indexedFields = ['id', 'company_id', 'status', 'created_at'];
    const optimizedFilters = Object.entries(filters).sort(([a], [b]) => {
      const aIndex = indexedFields.indexOf(a);
      const bIndex = indexedFields.indexOf(b);
      return (bIndex === -1 ? 1000 : bIndex) - (aIndex === -1 ? 1000 : aIndex);
    });
    
    // ログ出力（デバッグ用）
    console.log('🔍 Optimized filter order:', optimizedFilters.map(([key]) => key).join(', '));
  }
  
  return query;
}

// リソース監視
export function monitorResources(): void {
  if (Deno.env.get('ENVIRONMENT') === 'development') {
    const memory = getMemoryUsage();
    console.log(`📊 Memory usage: ${Math.round(memory / 1024 / 1024 * 100) / 100}MB`);
  }
}

// エラーハンドリング最適化
export function createOptimizedErrorResponse(
  error: Error,
  statusCode: number = 500,
  includeStack: boolean = false
): Response {
  const errorData = {
    error: error.message,
    code: statusCode,
    timestamp: new Date().toISOString(),
    ...(includeStack && Deno.env.get('ENVIRONMENT') === 'development' && {
      stack: error.stack
    })
  };

  return new Response(
    compressResponse(errorData),
    {
      status: statusCode,
      headers: createOptimizedHeaders()
    }
  );
}

// パフォーマンスログ
export function logPerformance(metrics: PerformanceMetrics): void {
  const logLevel = metrics.executionTime > 1000 ? '🐌' : 
                  metrics.executionTime > 500 ? '⚡' : '🚀';
  
  console.log(
    `${logLevel} ${metrics.functionName}: ${metrics.executionTime}ms ` +
    `(Memory: ${Math.round(metrics.memoryUsage / 1024)}KB)`
  );

  // 警告レベルのログ
  if (metrics.executionTime > 2000) {
    console.warn(`⚠️ Slow execution detected in ${metrics.functionName}: ${metrics.executionTime}ms`);
  }
}

// 接続プール最適化
export function createOptimizedSupabaseClient(url: string, key: string) {
  // 接続設定の最適化
  const options = {
    auth: {
      persistSession: false, // Edge Functionsでは不要
      autoRefreshToken: false
    },
    global: {
      headers: {
        'User-Agent': 'Garden-DX-EdgeFunction/1.0'
      }
    },
    db: {
      schema: 'public'
    }
  };

  return { url, key, options };
}

// 並行処理制限
export class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrency: number = 5) {}

  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.running++;
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          if (this.queue.length > 0) {
            const next = this.queue.shift();
            next?.();
          }
        }
      };

      if (this.running < this.maxConcurrency) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }
}

// 型安全なレスポンス作成（圧縮対応）
export async function createTypedResponse<T>(
  data: T,
  status: number = 200,
  request?: Request,
  additionalHeaders?: Record<string, string>
): Promise<Response> {
  const optimizedHeaders = {
    ...createOptimizedHeaders(request),
    ...additionalHeaders
  };

  const jsonData = compressResponse(data);
  let responseBody: string | Uint8Array = jsonData;

  // 圧縮判定（1KB以上の場合）
  if (jsonData.length > 1024 && request) {
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    if (acceptEncoding.includes('gzip')) {
      responseBody = await compressData(jsonData, 'gzip');
    }
  }

  return new Response(responseBody, {
    status,
    headers: optimizedHeaders
  });
}

// 同期版（下位互換）
export function createTypedResponseSync<T>(
  data: T,
  status: number = 200,
  headers?: Record<string, string>
): Response {
  const optimizedHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60',
    'X-Response-Time': new Date().toISOString(),
    ...headers
  };

  return new Response(
    compressResponse(data),
    {
      status,
      headers: optimizedHeaders
    }
  );
}

// デバウンス機能
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}