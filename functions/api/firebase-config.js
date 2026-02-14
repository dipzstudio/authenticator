/**
 * Cloudflare Pages Function - Firebase Config Provider
 * Returns Firebase configuration from environment variables
 */

export async function onRequestGet(context) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Firebase config from environment variables
    const firebaseConfig = {
      apiKey: context.env.FIREBASE_API_KEY,
      authDomain: context.env.FIREBASE_AUTH_DOMAIN,
      projectId: context.env.FIREBASE_PROJECT_ID,
      storageBucket: context.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: context.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: context.env.FIREBASE_APP_ID,
	  measurementId: context.env.FIREBASE_MEASUREMENT_ID
    };

    // Validate that config exists
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Firebase configuration not found' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        config: firebaseConfig 
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        } 
      }
    );

  } catch (error) {
    console.error('Error getting Firebase config:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
