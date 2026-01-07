# Supabase Setup Guide - Gokul Sweets Cost Analytics

This guide walks you through setting up Supabase authentication and secure data storage for the Gokul Sweets Cost Analytics application.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Database Schema Setup](#database-schema-setup)
4. [Row Level Security (RLS) Configuration](#row-level-security-rls-configuration)
5. [GitHub Secrets Configuration](#github-secrets-configuration)
6. [Netlify Deployment](#netlify-deployment)
7. [Testing the Setup](#testing-the-setup)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

---

## Prerequisites

- A free Supabase account (sign up at https://supabase.com)
- A GitHub repository with this code
- Basic knowledge of SQL (for database setup)

---

## Supabase Project Setup

### Step 1: Create a New Supabase Project

1. Go to https://supabase.com and sign in
2. Click **"New project"**
3. Fill in the details:
   - **Name**: `gokul-sweets-analytics` (or your preferred name)
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for most use cases
4. Click **"Create new project"**
5. Wait for the project to initialize (takes 1-2 minutes)

### Step 2: Get Your API Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **"API"** in the left menu
3. Copy and save these values:
   - **Project URL** (e.g., `https://yourproject.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

⚠️ **Important**: Keep these credentials secure. While the anon key is designed to be public, it should only be used with proper Row Level Security (RLS) policies enabled.

---

## Database Schema Setup

### Step 1: Create the Data Table

1. In your Supabase project, go to **SQL Editor**
2. Click **"New query"**
3. Paste the following SQL and click **"Run"**:

```sql
-- Create the main data table
CREATE TABLE IF NOT EXISTS gokul_app_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gokul_app_data_user_id ON gokul_app_data(user_id);
CREATE INDEX IF NOT EXISTS idx_gokul_app_data_device_id ON gokul_app_data(device_id);
CREATE INDEX IF NOT EXISTS idx_gokul_app_data_updated_at ON gokul_app_data(updated_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_gokul_app_data_updated_at
BEFORE UPDATE ON gokul_app_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Step 2: Verify Table Creation

1. Go to **Table Editor** in the sidebar
2. You should see `gokul_app_data` in the list
3. Click on it to view the structure

**Expected Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `device_id` (text)
- `payload` (jsonb) - stores all app data
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## Row Level Security (RLS) Configuration

RLS ensures each user can only access their own data. This is **critical** for security.

### Step 1: Enable RLS

In the SQL Editor, run:

```sql
-- Enable Row Level Security on the table
ALTER TABLE gokul_app_data ENABLE ROW LEVEL SECURITY;
```

### Step 2: Create RLS Policies

Run the following SQL to create policies that restrict access:

```sql
-- Policy: Users can view only their own data
CREATE POLICY "users_select_own_data"
ON gokul_app_data
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert only their own data
CREATE POLICY "users_insert_own_data"
ON gokul_app_data
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own data
CREATE POLICY "users_update_own_data"
ON gokul_app_data
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own data
CREATE POLICY "users_delete_own_data"
ON gokul_app_data
FOR DELETE
USING (auth.uid() = user_id);
```

### Step 3: Verify RLS is Working

1. Go to **Table Editor**
2. Click on `gokul_app_data`
3. Check the **Policies** tab
4. You should see 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

## GitHub Secrets Configuration

To deploy securely without exposing credentials, add them as GitHub Secrets.

### Step 1: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add the following secrets:

**Secret 1: SUPABASE_URL**
- Name: `SUPABASE_URL`
- Value: Your Supabase project URL (e.g., `https://yourproject.supabase.co`)

**Secret 2: SUPABASE_ANON_KEY**
- Name: `SUPABASE_ANON_KEY`
- Value: Your Supabase anon/public key (the long JWT token)

### Step 2: Verify Secrets

- Secrets should appear in the list (values are hidden for security)
- You should have exactly 2 secrets: `SUPABASE_URL` and `SUPABASE_ANON_KEY`

---

## Deployment

### Option A: GitHub Pages (Recommended)

The repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages.

#### Setup Steps:

1. **Enable GitHub Pages**:
   - Go to **Settings** → **Pages**
   - Under "Source", select **"GitHub Actions"**
   - Save

2. **Trigger Deployment**:
   - Push any commit to the `main` or `master` branch
   - Or manually trigger: **Actions** → **Deploy to GitHub Pages** → **Run workflow**

3. **Wait for Deployment**:
   - Go to **Actions** tab
   - Watch the workflow run (takes ~1-2 minutes)
   - If successful, your app is deployed!

4. **Access Your App**:
   - URL format: `https://[your-username].github.io/[repo-name]/`
   - Example: `https://iamvivek907.github.io/GokulsweetsCostAnalytics/`

#### How It Works:

The workflow (`.github/workflows/deploy.yml`):
1. Checks out your code
2. Injects Supabase credentials from GitHub Secrets
3. Replaces placeholders in `config.js`
4. Deploys to GitHub Pages

### Option B: Netlify

If you prefer Netlify for deployment:

#### Setup Steps:

1. **Connect Repository to Netlify**:
   - Go to https://netlify.com and log in
   - Click **"Add new site"** → **"Import an existing project"**
   - Connect to GitHub and select your repository

2. **Configure Build Settings**:
   - Build command: (leave empty, handled by `netlify.toml`)
   - Publish directory: `.` (root)
   - Click **"Show advanced"**

3. **Add Environment Variables**:
   - Click **"New variable"**
   - Add `SUPABASE_URL` = your Supabase URL
   - Add `SUPABASE_ANON_KEY` = your Supabase anon key

4. **Deploy**:
   - Click **"Deploy site"**
   - Wait for build to complete
   - Your app will be live at the Netlify URL

#### How It Works:

The `netlify.toml` file:
- Defines build command to inject credentials
- Sets up redirect rules for SPA routing
- Configures security headers
- Manages caching for performance

---

## Testing the Setup

### Test 1: Authentication Flow

1. **Open your deployed app**
2. **Sign Up**:
   - Enter email and password
   - Click "Sign Up"
   - Check your email for confirmation (if Supabase email confirmation is enabled)
3. **Log In**:
   - Enter credentials
   - Click "Login"
   - You should see the main app interface

### Test 2: Data Sync

1. **Add some test data**:
   - Go to Ingredients tab → Add an ingredient
   - Go to Recipes tab → Create a recipe
2. **Verify data in Supabase**:
   - Go to Supabase → **Table Editor** → `gokul_app_data`
   - You should see a row with your `user_id` and data in the `payload` column
3. **Test multi-device sync**:
   - Open app in different browser or incognito
   - Login with same credentials
   - Your data should appear automatically

### Test 3: RLS Security

1. **Create a second test account**
2. **Add different data to each account**
3. **Verify in Supabase**:
   - Each user should have separate rows
   - Each user should only see their own data in the app

---

## Troubleshooting

### Issue: "Auth system not initialized" Error

**Cause**: Supabase credentials not properly injected

**Solutions**:
1. Check GitHub Secrets are correctly named (`SUPABASE_URL` and `SUPABASE_ANON_KEY`)
2. Verify the workflow ran successfully (check Actions tab)
3. Look for placeholder values in deployed `config.js`

### Issue: "Invalid login credentials" Error

**Possible Causes**:
1. Incorrect email/password
2. Email not confirmed (if Supabase email confirmation is enabled)
3. User doesn't exist

**Solutions**:
1. Try signing up instead of logging in
2. Check Supabase → **Authentication** → **Users** to see if user exists
3. Disable email confirmation in Supabase settings (for testing)

### Issue: Data Not Syncing

**Possible Causes**:
1. RLS policies blocking access
2. Network connectivity issues
3. Invalid Supabase credentials

**Solutions**:
1. Check browser console for errors
2. Verify RLS policies in Supabase
3. Test Supabase connection in browser console:
   ```javascript
   await window.Auth.getSession()
   ```

### Issue: "Row Level Security" Errors

**Cause**: RLS policies not configured correctly

**Solutions**:
1. Verify all 4 policies exist (SELECT, INSERT, UPDATE, DELETE)
2. Check that `auth.uid() = user_id` is used in policies
3. Ensure table has RLS enabled: `ALTER TABLE gokul_app_data ENABLE ROW LEVEL SECURITY;`

### Issue: GitHub Actions Workflow Failing

**Possible Causes**:
1. Secrets not configured
2. Incorrect workflow syntax
3. Insufficient permissions

**Solutions**:
1. Check GitHub Secrets exist and are named correctly
2. Verify workflow has necessary permissions in `deploy.yml`
3. Check workflow logs for specific error messages

### Issue: "CORS" Errors

**Cause**: Supabase CORS not configured

**Solution**:
- Supabase automatically allows CORS for your domain
- If issues persist, check Supabase **API Settings**

---

## Security Best Practices

### ✅ DO:

1. **Always enable RLS** on all tables containing user data
2. **Use GitHub Secrets** or environment variables for credentials
3. **Never commit** actual Supabase credentials to your repository
4. **Use the anon key** in frontend code (not the service role key)
5. **Regularly review** Supabase logs for suspicious activity
6. **Keep dependencies updated** (especially Supabase client library)
7. **Enable email confirmation** for new signups (in Supabase settings)
8. **Set password requirements** in Supabase authentication settings
9. **Monitor usage** in Supabase dashboard to detect abuse

### ❌ DON'T:

1. **Never use** the service role key in frontend code
2. **Don't disable RLS** without understanding the security implications
3. **Don't use** `USING (true)` policies in production
4. **Don't commit** `.env` files with real credentials
5. **Don't share** your database password
6. **Don't ignore** security warnings in Supabase dashboard

### Additional Security Measures:

#### 1. Enable Email Confirmation

In Supabase:
- Go to **Authentication** → **Settings**
- Enable **"Enable email confirmations"**
- Users must verify email before accessing the app

#### 2. Add Rate Limiting

Consider adding rate limiting to prevent abuse:
- Use Supabase Edge Functions for custom rate limiting
- Monitor API usage in Supabase dashboard

#### 3. Regular Backups

Set up automated backups:
- Supabase Pro plan includes automatic backups
- Free tier: Use the export feature regularly
- Store backups securely

#### 4. Monitor Authentication Events

Check Supabase logs regularly:
- Go to **Logs** → **Auth Logs**
- Look for suspicious login attempts
- Set up alerts for unusual activity

---

## Advanced Configuration

### Custom Email Templates

Customize signup/login emails:
1. Go to Supabase → **Authentication** → **Email Templates**
2. Customize:
   - Confirmation email
   - Password reset email
   - Magic link email

### Multi-Factor Authentication (MFA)

Enable MFA for enhanced security:
1. Go to Supabase → **Authentication** → **Settings**
2. Enable **"Multi-Factor Authentication"**
3. Users can set up MFA in their profile

### Social Authentication

Add OAuth providers:
1. Go to Supabase → **Authentication** → **Providers**
2. Enable providers (Google, GitHub, etc.)
3. Configure OAuth credentials
4. Update app to include social login buttons

---

## Migration from Legacy System

If you were using the old device-based sync without authentication:

### Step 1: Backup Existing Data

1. Open the old app
2. Go to Settings → Export Backup
3. Save the JSON file

### Step 2: Sign Up in New System

1. Deploy the new authenticated version
2. Sign up with your email
3. Log in

### Step 3: Import Old Data

The app includes a migration path:
- Use Settings → Import Backup
- Select your exported JSON file
- Data will be saved to your authenticated account

---

## Support & Resources

### Official Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Auth Guide**: https://supabase.com/docs/guides/auth
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security

### Community Support

- **Supabase Discord**: https://discord.supabase.com
- **GitHub Issues**: Report bugs in this repository

### Monitoring & Debugging

**Browser Console**:
```javascript
// Check authentication status
await window.Auth.getSession()

// Check current user
window.Auth.getCurrentUser()

// Test Supabase connection
window.SupabaseConfig.getConfig()
```

**Supabase Dashboard**:
- Monitor **Logs** for errors
- Check **Database** → **Table Editor** for data
- View **Authentication** → **Users** for user list

---

## Summary Checklist

Before launching to production:

- [ ] Supabase project created
- [ ] Database table created with proper schema
- [ ] RLS enabled and policies configured
- [ ] GitHub Secrets added (SUPABASE_URL, SUPABASE_ANON_KEY)
- [ ] Workflow tested and deploying successfully
- [ ] Authentication flow tested (signup, login, logout)
- [ ] Data sync verified across devices
- [ ] RLS security tested with multiple accounts
- [ ] Email confirmation enabled (optional but recommended)
- [ ] Error handling tested
- [ ] Browser console checked for errors
- [ ] Documentation reviewed

---

**You're all set! Your app now has secure authentication and user-scoped data storage. 🎉**

For questions or issues, please check the Troubleshooting section or open an issue on GitHub.
