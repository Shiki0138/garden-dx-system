# Admin Login Setup Guide for Teisou System

This guide explains how to enable real admin login functionality in the Teisou System by disabling demo mode and setting up Supabase authentication.

## Prerequisites

1. A Supabase account and project
2. Access to the Supabase dashboard
3. PostgreSQL database access (via Supabase SQL Editor)

## Step 1: Configure Supabase

### 1.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project or use an existing one
3. Note down your project URL and anon key from:
   - Settings → API → Project URL
   - Settings → API → Project API keys → anon public

### 1.2 Update Environment Variables

1. Copy `.env.example` to `.env` if it doesn't exist:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Supabase credentials:
   ```env
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   REACT_APP_DEMO_MODE=false
   REACT_APP_ENVIRONMENT=production
   ```

3. For local development, update `.env.local` similarly

## Step 2: Create Admin User

### 2.1 Create User in Supabase Auth

1. Go to your Supabase Dashboard
2. Navigate to Authentication → Users
3. Click "Add user"
4. Fill in:
   - Email: `admin@your-company.com`
   - Password: Choose a secure password
   - Auto confirm user: ✓ (checked)
5. Click "Create user"
6. Copy the user UUID (you'll need this)

### 2.2 Run Database Setup

1. Go to SQL Editor in Supabase Dashboard
2. Run the database migrations in order:
   - First run the core schema setup
   - Then run the RBAC security enhancement
   - Finally run the admin user setup

3. Edit and run the admin setup script:
   ```sql
   -- Replace these values:
   -- <ADMIN_USER_ID>: The UUID from step 2.1
   -- <COMPANY_NAME>: Your company name
   -- Run the SQL from database/admin_user_setup.sql
   ```

## Step 3: Verify Authentication Flow

### 3.1 Test Login

1. Start the application:
   ```bash
   npm start
   ```

2. Navigate to `http://localhost:3000`
3. You should be redirected to the login page
4. Login with your admin credentials

### 3.2 Verify Admin Access

After successful login, you should have full access to:
- Estimate creation and management
- Invoice generation
- Project management
- User management (admin only)
- Company settings

## Step 4: Security Checklist

- [ ] Demo mode is disabled (`REACT_APP_DEMO_MODE=false`)
- [ ] Supabase credentials are properly configured
- [ ] Admin user is created in both Supabase Auth and user_profiles table
- [ ] RLS policies are enabled on all tables
- [ ] Environment variables are not committed to git
- [ ] Production environment uses HTTPS

## Troubleshooting

### Login Fails

1. **"Supabaseが設定されていません"** error:
   - Check that environment variables are set correctly
   - Restart the development server after changing .env

2. **"Invalid login credentials"** error:
   - Verify the email and password are correct
   - Check that the user exists in Supabase Auth
   - Ensure the user is confirmed

3. **Blank screen after login**:
   - Check browser console for errors
   - Verify user_profiles record exists for the user
   - Check that company_id is properly set

### Database Issues

1. Run this query to check your setup:
   ```sql
   -- Check companies
   SELECT * FROM companies;
   
   -- Check user profiles
   SELECT * FROM user_profiles;
   
   -- Check if user exists in auth
   SELECT id, email FROM auth.users;
   ```

2. Verify RLS policies are not blocking access:
   ```sql
   -- Temporarily disable RLS for testing (re-enable after!)
   ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
   ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
   ```

## Demo Mode Access

If you need to access demo mode for testing:

1. Set `REACT_APP_DEMO_MODE=true` in `.env`
2. Or append `?demo=true` to the URL: `http://localhost:3000?demo=true`

## Additional Users

To add more admin or regular users:

1. Create user in Supabase Auth
2. Insert user profile with appropriate role:
   - `owner`: Full system access
   - `admin`: Administrative access
   - `manager`: Project and estimate management
   - `employee`: Basic access
   - `viewer`: Read-only access

## Security Best Practices

1. **Never commit `.env` files** to version control
2. Use strong passwords for admin accounts
3. Enable 2FA in Supabase Dashboard
4. Regularly review user access and permissions
5. Monitor login attempts via the audit_logs table
6. Set up proper CORS and security headers in production

## Support

For issues or questions:
1. Check the Supabase logs in the Dashboard
2. Review browser console for frontend errors
3. Check the `demo_setup_log` table for setup issues
4. Verify all environment variables are correctly set

Remember to keep your Supabase credentials secure and never share them publicly!