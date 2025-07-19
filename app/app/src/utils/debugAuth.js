/**
 * Debug utility for authentication issues
 */

export const debugAuthSetup = () => {
  console.log('=== Authentication Debug Info ===');

  // Check environment variables
  console.log('Environment Variables:');
  console.log('- REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL ? 'Set' : 'Not Set');
  console.log(
    '- REACT_APP_SUPABASE_ANON_KEY:',
    process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Set' : 'Not Set'
  );
  console.log('- REACT_APP_DEMO_MODE:', process.env.REACT_APP_DEMO_MODE);
  console.log('- REACT_APP_ENVIRONMENT:', process.env.REACT_APP_ENVIRONMENT);

  // Check localStorage
  console.log('\nLocalStorage:');
  console.log('- authToken:', localStorage.getItem('authToken') ? 'Present' : 'Not Present');
  console.log(
    '- garden-dx-auth-token:',
    localStorage.getItem('garden-dx-auth-token') ? 'Present' : 'Not Present'
  );

  // Check if Supabase client is initialized
  try {
    const { supabaseClient, isSupabaseConnected } = require('../lib/supabase');
    console.log('\nSupabase Client:');
    console.log('- Client exists:', supabaseClient ? 'Yes' : 'No');
    console.log('- Is connected:', isSupabaseConnected());

    if (supabaseClient && supabaseClient.auth) {
      console.log('- Auth methods available:', Object.keys(supabaseClient.auth).join(', '));
    }
  } catch (error) {
    console.error('Error checking Supabase client:', error);
  }

  console.log('=== End Debug Info ===');
};

// Call this function at startup to debug authentication issues
export const initAuthDebug = () => {
  if (process.env.REACT_APP_ENVIRONMENT === 'development') {
    debugAuthSetup();
  }
};
