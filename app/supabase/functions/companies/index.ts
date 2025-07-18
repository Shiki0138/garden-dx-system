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
      console.log('🎭 Demo mode detected for companies endpoint')
      
      // デモモード制限チェック
      const restriction = checkDemoRestrictions(req.method, 'companies')
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
      const demoResponse = createDemoResponse('companies', req.method)
      
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
        if (resource === 'current') {
          // 現在のユーザーの会社情報取得
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('company_id')
            .eq('id', user.id)
            .single()

          if (profileError || !profile?.company_id) {
            return createStandardErrorResponse('NOT_FOUND', 'User company not found')
          }

          const { data: company, error } = await supabase
            .from('companies')
            .select(`
              *,
              user_profiles (
                id,
                full_name,
                email,
                role,
                is_active
              )
            `)
            .eq('id', profile.company_id)
            .single()

          if (error) {
            return createStandardErrorResponse('NOT_FOUND', 'Company not found')
          }

          return new Response(JSON.stringify(company), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else if (resource === 'stats') {
          // 会社統計情報
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('company_id')
            .eq('id', user.id)
            .single()

          if (profileError || !profile?.company_id) {
            return createStandardErrorResponse('NOT_FOUND', 'User company not found')
          }

          // 各種統計データを並行取得
          const [estimatesResult, projectsResult, usersResult] = await Promise.all([
            supabase
              .from('estimates')
              .select('id, total_amount, status')
              .eq('company_id', profile.company_id),
            supabase
              .from('projects')
              .select('id, status, progress')
              .eq('company_id', profile.company_id),
            supabase
              .from('user_profiles')
              .select('id, is_active')
              .eq('company_id', profile.company_id)
          ])

          const estimates = estimatesResult.data || []
          const projects = projectsResult.data || []
          const users = usersResult.data || []

          const stats = {
            estimates: {
              total: estimates.length,
              draft: estimates.filter(e => e.status === 'draft').length,
              sent: estimates.filter(e => e.status === 'sent').length,
              approved: estimates.filter(e => e.status === 'approved').length,
              total_amount: estimates.reduce((sum, e) => sum + (e.total_amount || 0), 0)
            },
            projects: {
              total: projects.length,
              planning: projects.filter(p => p.status === 'planning').length,
              in_progress: projects.filter(p => p.status === 'in_progress').length,
              completed: projects.filter(p => p.status === 'completed').length,
              average_progress: projects.reduce((sum, p) => sum + (p.progress || 0), 0) / (projects.length || 1)
            },
            users: {
              total: users.length,
              active: users.filter(u => u.is_active).length
            }
          }

          return new Response(JSON.stringify(stats), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else {
          // 会社一覧取得（管理者のみ）
          const { data: companies, error } = await supabase
            .from('companies')
            .select(`
              id,
              name,
              code,
              created_at,
              is_active
            `)
            .order('created_at', { ascending: false })

          if (error) {
            return createStandardErrorResponse('DATABASE_ERROR', error.message)
          }

          return new Response(JSON.stringify({ companies }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

      case 'PUT':
        if (resource === 'current') {
          // 会社情報更新
          const updateData: {
            name?: string;
            address?: string;
            phone?: string;
            email?: string;
            website?: string;
            settings?: Record<string, unknown>;
          } = await req.json()
          
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .single()

          if (profileError || !profile?.company_id) {
            return createStandardErrorResponse('NOT_FOUND', 'User company not found')
          }

          // 管理者権限チェック
          if (profile.role !== 'admin') {
            return createStandardErrorResponse('FORBIDDEN', 'Admin role required')
          }

          const { data: updatedCompany, error: updateError } = await supabase
            .from('companies')
            .update({
              name: updateData.name,
              address: updateData.address,
              phone: updateData.phone,
              email: updateData.email,
              website: updateData.website,
              settings: updateData.settings,
              updated_at: new Date().toISOString()
            })
            .eq('id', profile.company_id)
            .select()
            .single()

          if (updateError) {
            return createStandardErrorResponse('DATABASE_ERROR', updateError.message)
          }

          return new Response(JSON.stringify(updatedCompany), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else {
          return createStandardErrorResponse('VALIDATION_ERROR', 'Invalid resource for PUT')
        }

      case 'POST':
        if (resource === 'users') {
          // 新しいユーザーを会社に招待
          const { email, role, full_name }: {
            email: string;
            role: string;
            full_name: string;
          } = await req.json()
          
          if (!email || !role || !full_name) {
            return createStandardErrorResponse('VALIDATION_ERROR', 'Email, role, and full name are required')
          }

          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .single()

          if (profileError || !profile?.company_id) {
            return createStandardErrorResponse('NOT_FOUND', 'User company not found')
          }

          // 管理者権限チェック
          if (profile.role !== 'admin') {
            return createStandardErrorResponse('FORBIDDEN', 'Admin role required')
          }

          // ユーザー招待（実際の実装では招待メール送信）
          const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
            data: {
              full_name,
              role,
              company_id: profile.company_id
            },
            redirectTo: `${Deno.env.get('FRONTEND_URL')}/accept-invitation`
          })

          if (authError) {
            return createStandardErrorResponse('VALIDATION_ERROR', authError.message)
          }

          return new Response(JSON.stringify({
            message: 'User invitation sent',
            user: authData.user
          }), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return createStandardErrorResponse('VALIDATION_ERROR', 'Invalid resource for POST')

      default:
        return createStandardErrorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`)
    }

  } catch (error) {
    console.error('Companies function error:', error)
    return createStandardErrorResponse('INTERNAL_SERVER_ERROR', error.message)
  }
})