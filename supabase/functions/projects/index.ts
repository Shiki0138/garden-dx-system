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
      console.log('🎭 Demo mode detected for projects endpoint')
      
      // デモモード制限チェック
      const restriction = checkDemoRestrictions(req.method, 'projects')
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
      const projectId = pathSegments[pathSegments.length - 1]
      
      // デモデータレスポンス生成
      const demoResponse = createDemoResponse('projects', req.method, {
        id: projectId !== 'projects' ? projectId : null
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
    const projectId = pathSegments[pathSegments.length - 1]

    switch (req.method) {
      case 'GET':
        if (projectId && projectId !== 'projects') {
          // 個別プロジェクト取得
          const { data: project, error } = await supabase
            .from('projects')
            .select(`
              *,
              project_tasks (
                id,
                name,
                description,
                status,
                progress,
                start_date,
                end_date,
                assigned_to,
                dependencies,
                created_at,
                updated_at
              ),
              estimates (
                id,
                estimate_number,
                customer_name,
                total_amount,
                status
              )
            `)
            .eq('id', projectId)
            .eq('company_id', user.user_metadata?.company_id)
            .single()

          if (error) {
            return createStandardErrorResponse('NOT_FOUND', 'Project not found')
          }

          return new Response(JSON.stringify(project), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } else {
          // プロジェクト一覧取得
          const status = url.searchParams.get('status')
          const limit = parseInt(url.searchParams.get('limit') || '20')
          const offset = parseInt(url.searchParams.get('offset') || '0')

          let query = supabase
            .from('projects')
            .select(`
              id,
              name,
              code,
              description,
              status,
              progress,
              start_date,
              end_date,
              customer_name,
              site_address,
              budget,
              created_at,
              updated_at
            `)
            .eq('company_id', user.user_metadata?.company_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

          if (status) {
            query = query.eq('status', status)
          }

          const { data: projects, error } = await query

          if (error) {
            return createStandardErrorResponse('DATABASE_ERROR', error.message)
          }

          return new Response(JSON.stringify({ projects }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

      case 'POST':
        // 新規プロジェクト作成
        const createData: {
          name?: string;
          code?: string;
          description?: string;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          site_address?: string;
          budget?: number;
          start_date?: string;
          end_date?: string;
        } = await req.json()
        
        // 必須フィールド検証
        if (!createData.name || !createData.customer_name) {
          return createStandardErrorResponse('VALIDATION_ERROR', 'Project name and customer name are required')
        }

        // プロジェクトコード生成
        const projectCode = createData.code || `PRJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

        const { data: newProject, error: createError } = await supabase
          .from('projects')
          .insert({
            name: createData.name,
            code: projectCode,
            description: createData.description,
            customer_name: createData.customer_name,
            customer_email: createData.customer_email,
            customer_phone: createData.customer_phone,
            site_address: createData.site_address,
            budget: createData.budget,
            start_date: createData.start_date,
            end_date: createData.end_date,
            status: 'planning',
            progress: 0,
            company_id: user.user_metadata?.company_id,
            created_by: user.id
          })
          .select()
          .single()

        if (createError) {
          return createStandardErrorResponse('DATABASE_ERROR', createError.message)
        }

        return new Response(JSON.stringify(newProject), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'PUT':
        // プロジェクト更新
        if (!projectId || projectId === 'projects') {
          return createStandardErrorResponse('VALIDATION_ERROR', 'Project ID is required')
        }

        const updateData = await req.json()
        
        const { data: updatedProject, error: updateError } = await supabase
          .from('projects')
          .update({
            name: updateData.name,
            description: updateData.description,
            customer_name: updateData.customer_name,
            customer_email: updateData.customer_email,
            customer_phone: updateData.customer_phone,
            site_address: updateData.site_address,
            budget: updateData.budget,
            start_date: updateData.start_date,
            end_date: updateData.end_date,
            status: updateData.status,
            progress: updateData.progress,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .eq('company_id', user.user_metadata?.company_id)
          .select()
          .single()

        if (updateError) {
          return createStandardErrorResponse('DATABASE_ERROR', updateError.message)
        }

        return new Response(JSON.stringify(updatedProject), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'DELETE':
        // プロジェクト削除
        if (!projectId || projectId === 'projects') {
          return createStandardErrorResponse('VALIDATION_ERROR', 'Project ID is required')
        }

        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)
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
    console.error('Projects function error:', error)
    return createStandardErrorResponse('INTERNAL_SERVER_ERROR', error.message)
  }
})