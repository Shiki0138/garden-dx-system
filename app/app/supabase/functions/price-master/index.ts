import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'
import { validateEnvironmentVariables } from '../_shared/env.ts'
import { createStandardErrorResponse } from '../_shared/errors.ts'
import { detectDemoMode, createDemoResponse, checkDemoRestrictions, addDemoWatermark } from '../_shared/demo.ts'

serve(async (req) => {
  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数検証
    validateEnvironmentVariables()

    // デモモード検出
    const demoConfig = detectDemoMode(req)
    
    // デモモードの場合
    if (demoConfig.isDemo) {
      console.log('🎭 Demo mode detected for price-master endpoint')
      
      // デモモード制限チェック
      const restriction = checkDemoRestrictions(req.method, 'price-master')
      if (!restriction.allowed) {
        return new Response(
          JSON.stringify({ 
            error: restriction.message,
            demo: true 
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      // デモデータレスポンス生成
      const demoResponse = createDemoResponse('price-master', req.method)
      
      // ウォーターマーク追加
      const watermarkedResponse = addDemoWatermark(demoResponse)
      
      return new Response(JSON.stringify(watermarkedResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 通常モード: Supabase クライアント初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authorization ヘッダーからトークン取得
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Missing or invalid authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Invalid token')
    }

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const resource = pathSegments[pathSegments.length - 1]

    switch (req.method) {
      case 'GET':
        if (resource === 'categories') {
          // カテゴリ一覧取得
          const { data: categories, error } = await supabase
            .from('price_categories')
            .select(`
              *,
              price_items (
                id,
                name,
                code,
                unit,
                unit_price,
                purchase_price,
                markup_rate,
                adjustment_amount,
                is_active
              )
            `)
            .eq('company_id', user.user_metadata?.company_id)
            .order('sort_order')

          if (error) {
            return createStandardErrorResponse('DATABASE_ERROR', error.message)
          }

          return new Response(JSON.stringify({ categories }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else if (resource === 'items') {
          // 単価項目一覧取得
          const searchQuery = url.searchParams.get('search')
          const categoryId = url.searchParams.get('category_id')
          
          let query = supabase
            .from('price_items')
            .select(`
              *,
              price_categories (
                name,
                code
              )
            `)
            .eq('company_id', user.user_metadata?.company_id)
            .eq('is_active', true)

          if (searchQuery) {
            query = query.or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`)
          }

          if (categoryId) {
            query = query.eq('category_id', categoryId)
          }

          const { data: items, error } = await query.order('name')

          if (error) {
            return createStandardErrorResponse('DATABASE_ERROR', error.message)
          }

          return new Response(JSON.stringify({ items }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else if (resource === 'calculate') {
          // 価格計算
          const purchasePrice = parseFloat(url.searchParams.get('purchase_price') || '0')
          const markupRate = parseFloat(url.searchParams.get('markup_rate') || '1.3')
          const adjustmentAmount = parseFloat(url.searchParams.get('adjustment_amount') || '0')
          
          if (purchasePrice <= 0) {
            return createStandardErrorResponse('VALIDATION_ERROR', 'Purchase price must be greater than 0')
          }

          const calculatedPrice = Math.round(purchasePrice * markupRate + adjustmentAmount)
          const profit = calculatedPrice - purchasePrice
          const profitRate = (profit / purchasePrice) * 100

          return new Response(JSON.stringify({
            purchase_price: purchasePrice,
            markup_rate: markupRate,
            adjustment_amount: adjustmentAmount,
            calculated_price: calculatedPrice,
            profit: profit,
            profit_rate: profitRate
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else {
          // 単体単価項目取得
          const { data: item, error } = await supabase
            .from('price_items')
            .select(`
              *,
              price_categories (
                name,
                code
              )
            `)
            .eq('id', resource)
            .eq('company_id', user.user_metadata?.company_id)
            .single()

          if (error) {
            return createStandardErrorResponse('NOT_FOUND', 'Price item not found')
          }

          return new Response(JSON.stringify(item), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

      case 'POST':
        if (resource === 'items') {
          // 単価項目作成
          const createData: {
            name?: string;
            code?: string;
            unit?: string;
            unit_price?: number;
            purchase_price?: number;
            markup_rate?: number;
            adjustment_amount?: number;
            category_id?: string;
            description?: string;
          } = await req.json()
          
          // 必須フィールド検証
          if (!createData.name || !createData.unit || !createData.unit_price) {
            return createStandardErrorResponse('VALIDATION_ERROR', 'Name, unit, and unit_price are required')
          }

          // コード自動生成（指定されていない場合）
          if (!createData.code) {
            const timestamp = Date.now().toString().slice(-6)
            createData.code = `ITEM-${timestamp}`
          }

          const { data: newItem, error: createError } = await supabase
            .from('price_items')
            .insert({
              ...createData,
              company_id: user.user_metadata?.company_id,
              created_by: user.id
            })
            .select()
            .single()

          if (createError) {
            return createStandardErrorResponse('DATABASE_ERROR', createError.message)
          }

          return new Response(JSON.stringify(newItem), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else if (resource === 'categories') {
          // カテゴリ作成
          const createData: {
            name?: string;
            code?: string;
            description?: string;
            parent_id?: string;
            sort_order?: number;
          } = await req.json()
          
          if (!createData.name) {
            return createStandardErrorResponse('VALIDATION_ERROR', 'Category name is required')
          }

          const { data: newCategory, error: createError } = await supabase
            .from('price_categories')
            .insert({
              ...createData,
              company_id: user.user_metadata?.company_id,
              created_by: user.id
            })
            .select()
            .single()

          if (createError) {
            return createStandardErrorResponse('DATABASE_ERROR', createError.message)
          }

          return new Response(JSON.stringify(newCategory), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return createStandardErrorResponse('VALIDATION_ERROR', 'Invalid resource for POST')

      case 'PUT':
        // 単価項目更新
        const updateData: {
          name?: string;
          code?: string;
          unit?: string;
          unit_price?: number;
          purchase_price?: number;
          markup_rate?: number;
          adjustment_amount?: number;
          category_id?: string;
          description?: string;
          is_active?: boolean;
        } = await req.json()
        
        const { data: updatedItem, error: updateError } = await supabase
          .from('price_items')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', resource)
          .eq('company_id', user.user_metadata?.company_id)
          .select()
          .single()

        if (updateError) {
          return createStandardErrorResponse('DATABASE_ERROR', updateError.message)
        }

        return new Response(JSON.stringify(updatedItem), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'DELETE':
        // 単価項目削除（論理削除）
        const { error: deleteError } = await supabase
          .from('price_items')
          .update({ is_active: false })
          .eq('id', resource)
          .eq('company_id', user.user_metadata?.company_id)

        if (deleteError) {
          return createStandardErrorResponse('DATABASE_ERROR', deleteError.message)
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      default:
        return createStandardErrorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`)
    }

  } catch (error) {
    console.error('Price-master function error:', error)
    return createStandardErrorResponse('INTERNAL_SERVER_ERROR', error.message)
  }
})