# Deployment Guide - Gokul Sweets Cost Analytics

This guide explains how to deploy the Gokul Sweets Cost Analytics PWA to GitHub Pages or other hosting platforms.

## Quick Start - GitHub Pages Deployment

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select the branch you want to deploy (usually `main` or `master`)
4. Select the root folder `/` as the source
5. Click **Save**
6. Your app will be available at: `https://<username>.github.io/<repository-name>/`

### 2. Optional: Configure Automatic Supabase Sync

If you want to enable automatic cloud sync without requiring users to manually enter credentials:

#### Step A: Set up Supabase

1. Create a free Supabase project at https://supabase.com
2. In the SQL Editor, run this command to create the data table:

```sql
CREATE TABLE gokul_app_data (
  device_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (IMPORTANT for production)
ALTER TABLE gokul_app_data ENABLE ROW LEVEL SECURITY;

-- Create a policy allowing anyone to insert/update their own device data
-- This is a simple policy; adjust based on your security requirements
CREATE POLICY "Allow device access"
ON gokul_app_data
FOR ALL
USING (true)
WITH CHECK (true);
```

3. Get your credentials from **Project Settings** → **API**:
   - Project URL (e.g., `https://yourproject.supabase.co`)
   - Anon/Public Key

#### Step B: Configure the App

Edit `config.js` in your repository:

```javascript
window.AppConfig = {
  supabase: {
    url: 'https://yourproject.supabase.co',  // Your Supabase URL
    anonKey: 'your-anon-key-here',          // Your Supabase anon key
    autoSync: true                           // Enable automatic sync
  },
  app: {
    name: 'Gokul Sweets Cost Analytics',
    version: '2.0.0'
  }
};
```

**Important Security Notes:**
- The anon key is public and safe to commit to your repository
- **Always enable Row Level Security (RLS)** on your Supabase tables
- The simple policy above allows any device to access data - for production, implement proper authentication
- Consider using Supabase Auth for multi-user scenarios

#### Step C: Commit and Deploy

```bash
git add config.js
git commit -m "Configure Supabase credentials"
git push origin main
```

GitHub Pages will automatically redeploy your app with the new configuration.

## Features After Deployment

### ✅ Progressive Web App (PWA)
- **Install to Home Screen**: Users can install the app on their devices
- **Offline Support**: The app works offline after the first visit
- **App Icons**: Proper icons display on home screen and browser tabs
- **Automatic Updates**: Users are notified when a new version is available

### ✅ Cloud Sync (if configured)
- **Automatic Sync**: Data automatically loads from Supabase on app start (if `autoSync: true`)
- **Manual Override**: Users can still manually enter credentials in Settings
- **Device-based**: Each device has its own data identified by a unique device ID

## Testing Your Deployment

### Test PWA Installation

1. Open your deployed app in Chrome/Edge on desktop or mobile
2. Look for the install icon in the address bar
3. Click to install the app
4. Verify the app icon appears correctly

### Test Offline Mode

1. Open your app in Chrome
2. Open Developer Tools (F12)
3. Go to **Application** → **Service Workers**
4. Check "Offline" mode
5. Refresh the page - the app should still work

### Test Cloud Sync

1. Add some ingredients and recipes in the app
2. In Settings → Cloud Sync, click "☁️ Save to Cloud"
3. Open the app in a different browser or clear local storage
4. If auto-sync is enabled, data should load automatically
5. If not, manually click "⬇️ Load from Cloud" in Settings

## Troubleshooting

### Icons Not Showing

- Ensure PNG icons are generated: `icons/icon-192.png` and `icons/icon-512.png`
- Clear browser cache and service worker
- Check browser console for 404 errors

### PWA Not Installing

- Ensure you're accessing via HTTPS (required for PWA)
- GitHub Pages automatically provides HTTPS
- Check that `manifest.json` is accessible
- Verify all icon files exist

### Service Worker Issues

- Go to Chrome DevTools → Application → Service Workers
- Click "Unregister" to remove old service worker
- Refresh the page to register the new one
- Check "Update on reload" during development

### Cloud Sync Not Working

- Verify Supabase credentials are correct
- Check browser console for error messages
- Ensure the `gokul_app_data` table exists in Supabase
- Verify Row Level Security policies allow access

## Alternative Deployment Methods

### Netlify

1. Connect your GitHub repository to Netlify
2. No build command needed (static site)
3. Publish directory: `/` (root)
4. Edit `config.js` with your Supabase credentials
5. Deploy

### Vercel

1. Import your GitHub repository to Vercel
2. Framework: None (static)
3. Root directory: `./`
4. Deploy

### Custom Server

1. Copy all files to your web server
2. Ensure `.nojekyll` file exists
3. Configure web server to serve `index.html` for all routes
4. Edit `config.js` with your credentials

## Security Best Practices

1. **Always enable RLS on Supabase tables**
2. **Never commit service role keys** (only use anon keys in frontend)
3. **Implement proper authentication** for production use
4. **Monitor Supabase usage** to detect abuse
5. **Use environment-specific configs** (dev vs production)

## Environment Variables (Advanced)

For more secure credential management, you can use build-time environment variables:

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy PWA

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure app
        run: |
          sed -i "s|url: ''|url: '${{ secrets.SUPABASE_URL }}'|g" config.js
          sed -i "s|anonKey: ''|anonKey: '${{ secrets.SUPABASE_ANON_KEY }}'|g" config.js
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
```

Then add secrets in **Settings** → **Secrets and variables** → **Actions**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Support

For issues or questions:
- Check browser console for errors
- Review Supabase dashboard for API errors
- Ensure all files are deployed correctly
- Test in incognito mode to rule out caching issues
