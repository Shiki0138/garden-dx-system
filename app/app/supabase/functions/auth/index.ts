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
      console.log('🎭 Demo mode detected for auth endpoint')
      
      // デモモード制限チェック（認証関連は特別扱い）
      const url = new URL(req.url)
      const pathSegments = url.pathname.split('/')
      const action = pathSegments[pathSegments.length - 1]
      
      // デモモードでは登録・パスワード変更等を制限
      const restrictedActions = ['register', 'change-password', 'delete-account']
      if (restrictedActions.includes(action)) {
        return new Response(
          JSON.stringify({ 
            error: 'デモモードでは登録・パスワード変更はできません。',
            demo: true 
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      // デモデータレスポンス生成
      const demoResponse = createDemoResponse('auth', req.method)
      
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

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const action = pathSegments[pathSegments.length - 1]

    switch (req.method) {
      case 'POST':
        if (action === 'login') {
          // ログイン
          const { email, password }: {
            email: string;
            password: string;
          } = await req.json()
          
          if (!email || !password) {
            return createStandardErrorResponse('VALIDATION_ERROR', 'Email and password are required')
          }

          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
          })

          if (authError) {
            return createStandardErrorResponse('UNAUTHORIZED', authError.message)
          }

          // ユーザー情報取得
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select(`
              *,
              companies (
                id,
                name,
                code,
                settings
              )
            `)
            .eq('id', authData.user.id)
            .single()

          return new Response(JSON.stringify({
            user: authData.user,
            session: authData.session,
            profile: profile
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else if (action === 'register') {
          // 新規登録
          const { email, password, full_name, company_name, company_code }: {
            email: string;
            password: string;
            full_name: string;
            company_name?: string;
            company_code?: string;
          } = await req.json()
          
          if (!email || !password || !full_name) {
            return createStandardErrorResponse('VALIDATION_ERROR', 'Email, password, and full name are required')
          }

          // ユーザー作成
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name,
                role: 'admin'
              }
            }
          })

          if (authError) {
            return createStandardErrorResponse('VALIDATION_ERROR', authError.message)
          }

          // 会社作成（新規登録の場合）
          if (company_name && authData.user) {
            const { data: company, error: companyError } = await supabase
              .from('companies')
              .insert({
                name: company_name,
                code: company_code || `COMP-${Date.now().toString().slice(-6)}`,
                created_by: authData.user.id
              })
              .select()
              .single()

            if (!companyError) {
              // ユーザープロファイル作成
              await supabase
                .from('user_profiles')
                .insert({
                  id: authData.user.id,
                  email: email,
                  full_name: full_name,
                  role: 'admin',
                  company_id: company.id
                })
            }
          }

          return new Response(JSON.stringify({
            user: authData.user,
            session: authData.session,
            message: 'Registration successful. Please check your email for verification.'
          }), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else if (action === 'logout') {
          // ログアウト
          const authHeader = req.headers.get('Authorization')
          if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '')
            await supabase.auth.signOut(token)
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else if (action === 'refresh') {
          // トークンリフレッシュ
          const { refresh_token }: { refresh_token: string } = await req.json()
          
          if (!refresh_token) {
            return createStandardErrorResponse('VALIDATION_ERROR', 'Refresh token is required')
          }

          const { data: authData, error: authError } = await supabase.auth.refreshSession({
            refresh_token
          })

          if (authError) {
            return createStandardErrorResponse('UNAUTHORIZED', authError.message)
          }

          return new Response(JSON.stringify(authData), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else if (action === 'reset-password') {
          // パスワードリセット
          const { email }: { email: string } = await req.json()
          
          if (!email) {
            return createStandardErrorResponse('VALIDATION_ERROR', 'Email is required')
          }

          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${Deno.env.get('FRONTEND_URL')}/reset-password`
          })

          if (error) {
            return createStandardErrorResponse('VALIDATION_ERROR', error.message)
          }

          return new Response(JSON.stringify({
            message: 'Password reset email sent'
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return createStandardErrorResponse('VALIDATION_ERROR', 'Invalid action')

      case 'GET':
        if (action === 'me') {
          // 現在のユーザー情報取得
          const authHeader = req.headers.get('Authorization')
          if (!authHeader?.startsWith('Bearer ')) {
            return createStandardErrorResponse('UNAUTHORIZED', 'Missing authorization header')
          }

          const token = authHeader.replace('Bearer ', '')
          
          const { data: { user }, error: authError } = await supabase.auth.getUser(token)
          if (authError || !user) {
            return createStandardErrorResponse('UNAUTHORIZED', 'Invalid token')
          }

          // プロファイル情報取得
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select(`
              *,
              companies (
                id,
                name,
                code,
                settings
              )
            `)
            .eq('id', user.id)
            .single()

          return new Response(JSON.stringify({
            user,
            profile
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return createStandardErrorResponse('VALIDATION_ERROR', 'Invalid action')

      case 'PUT':
        if (action === 'change-password') {
          // パスワード変更
          const authHeader = req.headers.get('Authorization')
          if (!authHeader?.startsWith('Bearer ')) {
            return createStandardErrorResponse('UNAUTHORIZED', 'Missing authorization header')
          }

          const { current_password, new_password }: {
            current_password: string;
            new_password: string;
          } = await req.json()
          
          if (!current_password || !new_password) {
            return createStandardErrorResponse('VALIDATION_ERROR', 'Current and new passwords are required')
          }

          const token = authHeader.replace('Bearer ', '')
          
          const { error } = await supabase.auth.updateUser({
            password: new_password
          })

          if (error) {
            return createStandardErrorResponse('VALIDATION_ERROR', error.message)
          }

          return new Response(JSON.stringify({
            message: 'Password updated successfully'
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return createStandardErrorResponse('VALIDATION_ERROR', 'Invalid action')

      default:
        return createStandardErrorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`)
    }

  } catch (error) {
    console.error('Auth function error:', error)
    return createStandardErrorResponse('INTERNAL_SERVER_ERROR', error.message)
  }
})