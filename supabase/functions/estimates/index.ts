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
      console.log('🎭 Demo mode detected for estimates endpoint')
      
      // デモモード制限チェック
      const restriction = checkDemoRestrictions(req.method, 'estimates')
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
      
      // URLパスからIDを取得
      const url = new URL(req.url)
      const pathSegments = url.pathname.split('/')
      const estimateId = pathSegments[pathSegments.length - 1]
      
      // デモデータレスポンス生成
      const demoResponse = createDemoResponse('estimates', req.method, {
        id: estimateId !== 'estimates' ? estimateId : null
      })
      
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
    const estimateId = pathSegments[pathSegments.length - 1]

    switch (req.method) {
      case 'GET':
        if (estimateId && estimateId !== 'estimates') {
          // 個別見積取得
          const { data: estimate, error } = await supabase
            .from('estimates')
            .select(`
              *,
              estimate_items (*),
              companies (
                name,
                settings
              )
            `)
            .eq('id', estimateId)
            .eq('created_by', user.id)
            .single()

          if (error) {
            return createStandardErrorResponse('NOT_FOUND', 'Estimate not found')
          }

          return new Response(JSON.stringify(estimate), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } else {
          // 見積一覧取得
          const { data: estimates, error } = await supabase
            .from('estimates')
            .select(`
              id,
              estimate_number,
              customer_name,
              project_name,
              total_amount,
              status,
              created_at,
              updated_at
            `)
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })

          if (error) {
            return createStandardErrorResponse('DATABASE_ERROR', error.message)
          }

          return new Response(JSON.stringify({ estimates }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

      case 'POST':
        // 新規見積作成
        const createData: {
          customer_name?: string;
          project_name?: string;
          customer_email?: string;
          customer_phone?: string;
          site_address?: string;
          project_description?: string;
          notes?: string;
          company_id?: string;
        } = await req.json()
        
        // 必須フィールド検証
        if (!createData.customer_name || !createData.project_name) {
          return createStandardErrorResponse('VALIDATION_ERROR', 'Customer name and project name are required')
        }

        // 見積番号生成
        const estimateNumber = `EST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

        const { data: newEstimate, error: createError } = await supabase
          .from('estimates')
          .insert({
            estimate_number: estimateNumber,
            customer_name: createData.customer_name,
            project_name: createData.project_name,
            customer_email: createData.customer_email,
            customer_phone: createData.customer_phone,
            site_address: createData.site_address,
            project_description: createData.project_description,
            notes: createData.notes,
            status: 'draft',
            created_by: user.id,
            company_id: createData.company_id || user.user_metadata?.company_id
          })
          .select()
          .single()

        if (createError) {
          return createStandardErrorResponse('DATABASE_ERROR', createError.message)
        }

        return new Response(JSON.stringify(newEstimate), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'PUT':
        // 見積更新
        if (!estimateId || estimateId === 'estimates') {
          return createStandardErrorResponse('VALIDATION_ERROR', 'Estimate ID is required')
        }

        const updateData: {
          customer_name?: string;
          project_name?: string;
          customer_email?: string;
          customer_phone?: string;
          site_address?: string;
          project_description?: string;
          notes?: string;
          status?: string;
          total_amount?: number;
          tax_amount?: number;
        } = await req.json()
        
        const { data: updatedEstimate, error: updateError } = await supabase
          .from('estimates')
          .update({
            customer_name: updateData.customer_name,
            project_name: updateData.project_name,
            customer_email: updateData.customer_email,
            customer_phone: updateData.customer_phone,
            site_address: updateData.site_address,
            project_description: updateData.project_description,
            notes: updateData.notes,
            status: updateData.status,
            total_amount: updateData.total_amount,
            tax_amount: updateData.tax_amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', estimateId)
          .eq('created_by', user.id)
          .select()
          .single()

        if (updateError) {
          return createStandardErrorResponse('DATABASE_ERROR', updateError.message)
        }

        return new Response(JSON.stringify(updatedEstimate), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'DELETE':
        // 見積削除
        if (!estimateId || estimateId === 'estimates') {
          return createStandardErrorResponse('VALIDATION_ERROR', 'Estimate ID is required')
        }

        const { error: deleteError } = await supabase
          .from('estimates')
          .delete()
          .eq('id', estimateId)
          .eq('created_by', user.id)

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
    console.error('Estimates function error:', error)
    return createStandardErrorResponse('INTERNAL_SERVER_ERROR', error.message)
  }
})