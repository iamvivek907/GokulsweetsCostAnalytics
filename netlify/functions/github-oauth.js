// GitHub OAuth Token Exchange - Netlify Serverless Function
// This function exchanges a GitHub OAuth authorization code for an access token
// 
// SETUP INSTRUCTIONS:
// 1. Create a GitHub OAuth App at https://github.com/settings/developers
// 2. Set the Authorization callback URL to your deployed app URL + /callback
// 3. Configure environment variables in Netlify:
//    - GH_CLIENT_ID: Your GitHub OAuth App Client ID
//    - GH_CLIENT_SECRET: Your GitHub OAuth App Client Secret (KEEP PRIVATE!)
// 4. Deploy to Netlify or another serverless platform
//
// SECURITY WARNINGS:
// - NEVER expose GH_CLIENT_SECRET in client-side code
// - This function must run server-side only
// - Implement rate limiting in production
// - Add CORS restrictions for your domain
// - Validate the authorization code before exchange
// - Consider adding state parameter validation to prevent CSRF attacks

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Parse request body
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body' })
    };
  }

  const { code } = requestBody;

  // Validate authorization code
  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Authorization code is required' })
    };
  }

  // Get environment variables (configured in Netlify)
  const clientId = process.env.GH_CLIENT_ID;
  const clientSecret = process.env.GH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('GitHub OAuth credentials not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  try {
    // Exchange code for access token with GitHub
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      })
    });

    const data = await response.json();

    // Check for errors from GitHub
    if (data.error) {
      console.error('GitHub OAuth error:', data.error_description || data.error);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'OAuth exchange failed',
          details: data.error_description || data.error
        })
      };
    }

    // Return the access token to the client
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Add CORS headers if needed (replace * with your domain in production)
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope
      })
    };

  } catch (error) {
    console.error('Error exchanging OAuth code:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error during OAuth exchange' })
    };
  }
};

/*
 * EXAMPLE CLIENT-SIDE USAGE:
 * 
 * // After user authorizes the app and you receive the code
 * async function exchangeCodeForToken(code) {
 *   const response = await fetch('/.netlify/functions/github-oauth', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ code })
 *   });
 *   const data = await response.json();
 *   return data.access_token;
 * }
 * 
 * PRODUCTION HARDENING CHECKLIST:
 * - [ ] Implement rate limiting
 * - [ ] Add request validation
 * - [ ] Implement state parameter CSRF protection
 * - [ ] Restrict CORS to specific domains
 * - [ ] Add logging and monitoring
 * - [ ] Implement token expiration handling
 * - [ ] Add error tracking (e.g., Sentry)
 * - [ ] Review GitHub OAuth best practices
 */
