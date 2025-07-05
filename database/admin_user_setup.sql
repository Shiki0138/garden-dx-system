-- ============================================================
-- Garden DX - Admin User Setup Script
-- Purpose: Create initial admin users for production environment
-- Created: 2025-07-03
-- ============================================================

-- IMPORTANT: This script should be run AFTER a user has been created in Supabase Auth
-- 1. First create user in Supabase Dashboard or via Supabase Auth API
-- 2. Then run this script to set up the user profile and permissions

-- ============================================================
-- Setup Instructions:
-- ============================================================
-- 1. Create admin user in Supabase Dashboard:
--    - Go to Authentication > Users
--    - Click "Add user"
--    - Email: admin@your-company.com
--    - Password: [secure password]
--    - Auto confirm user: Yes

-- 2. Replace the following variables with your actual values:
--    - <ADMIN_USER_ID>: The UUID of the user created in Supabase Auth
--    - <COMPANY_NAME>: Your company name
--    - <ADMIN_EMAIL>: Admin email address

-- ============================================================
-- Create Production Company
-- ============================================================

-- First, create the company
INSERT INTO companies (
    company_id,
    company_name,
    company_code,
    postal_code,
    address,
    phone,
    email,
    subscription_plan,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(), -- Auto-generate company ID
    '<COMPANY_NAME>', -- Replace with your company name
    'PROD_001', -- Company code
    '100-0001', -- Replace with your postal code
    '東京都千代田区...', -- Replace with your address
    '03-0000-0000', -- Replace with your phone
    'info@your-company.com', -- Replace with company email
    'premium', -- subscription plan: 'basic', 'standard', 'premium'
    TRUE,
    NOW(),
    NOW()
) RETURNING company_id;

-- Store the company_id for reference (you'll need this)
-- Copy the returned company_id for the next step

-- ============================================================
-- Create Admin User Profile
-- ============================================================

-- Create user profile for the admin
-- IMPORTANT: Replace <ADMIN_USER_ID> with the actual UUID from Supabase Auth
-- and <COMPANY_ID> with the company_id from the previous step

INSERT INTO user_profiles (
    user_id,
    company_id,
    role,
    full_name,
    position,
    phone,
    is_active,
    permissions,
    created_at,
    updated_at
) VALUES (
    '<ADMIN_USER_ID>'::UUID, -- Replace with actual Supabase Auth user ID
    '<COMPANY_ID>'::UUID, -- Replace with company_id from above
    'owner', -- Role: 'owner' has full access
    '管理者', -- Replace with admin's full name
    'システム管理者', -- Position/title
    '090-0000-0000', -- Replace with phone number
    TRUE,
    '{
        "view_estimates": true,
        "create_estimates": true,
        "edit_estimates": true,
        "delete_estimates": true,
        "view_invoices": true,
        "create_invoices": true,
        "edit_invoices": true,
        "delete_invoices": true,
        "view_projects": true,
        "manage_projects": true,
        "view_financial": true,
        "manage_users": true,
        "manage_settings": true,
        "manage_company": true,
        "view_reports": true,
        "export_data": true
    }'::JSONB, -- Full admin permissions
    NOW(),
    NOW()
);

-- ============================================================
-- Verify Setup
-- ============================================================

-- Check if the setup was successful
SELECT 
    c.company_name,
    c.company_code,
    up.full_name,
    up.role,
    up.position,
    up.is_active,
    up.permissions
FROM companies c
JOIN user_profiles up ON c.company_id = up.company_id
WHERE c.company_code = 'PROD_001';

-- ============================================================
-- Additional Admin Users (Optional)
-- ============================================================

-- To add more admin users:
-- 1. Create user in Supabase Auth
-- 2. Insert user profile with same company_id

/*
INSERT INTO user_profiles (
    user_id,
    company_id,
    role,
    full_name,
    position,
    phone,
    is_active,
    permissions,
    created_at,
    updated_at
) VALUES (
    '<ADDITIONAL_ADMIN_USER_ID>'::UUID,
    '<COMPANY_ID>'::UUID, -- Same company_id as above
    'admin', -- or 'manager' for limited admin
    '副管理者',
    'マネージャー',
    '090-0000-0001',
    TRUE,
    '{
        "view_estimates": true,
        "create_estimates": true,
        "edit_estimates": true,
        "view_invoices": true,
        "create_invoices": true,
        "view_projects": true,
        "manage_projects": true,
        "view_financial": true,
        "manage_users": true,
        "view_reports": true
    }'::JSONB, -- Manager-level permissions
    NOW(),
    NOW()
);
*/

-- ============================================================
-- Role Definitions Reference
-- ============================================================

-- Available roles in the system:
-- 'owner': Full system access, can manage company settings
-- 'admin': Administrative access, can manage users and settings
-- 'manager': Can manage projects, estimates, and invoices
-- 'employee': Basic access to create and view own work
-- 'viewer': Read-only access

-- ============================================================
-- Troubleshooting
-- ============================================================

-- If login fails after running this script:
-- 1. Verify the user exists in Supabase Auth (Dashboard > Authentication > Users)
-- 2. Check that user_id matches exactly
-- 3. Ensure the user's email is confirmed
-- 4. Check RLS policies are properly configured

-- To check existing users:
-- SELECT * FROM auth.users; -- Run in Supabase SQL Editor

-- To check user profiles:
-- SELECT * FROM user_profiles;