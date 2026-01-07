# Gokul Sweets Cost Analytics - PWA

A Progressive Web App for restaurant and sweets shop cost analytics, profit tracking, and recipe management with **secure user authentication** and cloud sync.

![Dashboard](https://github.com/user-attachments/assets/70f0cbae-ae21-4646-8beb-55b5bb50cc63)

## ✨ Features

### 🔐 User Authentication (NEW!)
- **Secure Login/Signup**: Email and password authentication via Supabase Auth
- **Protected Data**: Each user's data is isolated with Row Level Security (RLS)
- **Session Management**: Automatic login persistence across sessions
- **Multi-Device Sync**: Access your data from any device after logging in
- **Account Management**: Logout functionality and user profile display

### 📱 Progressive Web App (PWA)
- **Install to Home Screen**: Works like a native app on mobile and desktop
- **Offline Support**: Full functionality without internet connection
- **Fast Loading**: Service worker caches assets for instant loading
- **Auto-Updates**: Users are notified when new versions are available

### ☁️ Cloud Sync with Supabase
- **Authenticated Sync**: Automatic data sync when logged in
- **User-Scoped Data**: Each user can only access their own recipes and data
- **Auto-Save**: Changes automatically sync to cloud (debounced)
- **Secure Storage**: Data encrypted in transit and protected by RLS policies
- **Environment Configuration**: Credentials injected at deployment time (no secrets in code)

### 💼 Business Analytics
- **Ingredient Management**: Track raw materials and costs
- **Recipe Costing**: Calculate total cost including wastage and overhead
- **Profit Analysis**: Monitor profit margins and identify at-risk items
- **Staff Payroll**: Department-wise staff and salary tracking
- **Overhead Costs**: Separate tracking for restaurant and factory locations

## 🚀 Quick Start

### For Users

**Authentication Required**: To use cloud sync features, you'll need to create an account.

1. **Visit the deployed app**: [Your GitHub Pages URL]
2. **Create an account or Login**:
   - First-time users: Click "Sign up" and create an account
   - Returning users: Login with your credentials
3. **Add to Home Screen** (optional):
   - On iOS: Tap Share → Add to Home Screen
   - On Android: Tap Menu → Install App
4. **Start managing your business**: Add ingredients, create recipes, track staff
5. **Automatic Cloud Sync**: Your data automatically syncs across all your devices

### For Developers

#### Deploy to GitHub Pages with Authentication

**Prerequisites**: You need a Supabase project. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed setup instructions.

1. **Set up Supabase** (one-time setup):
   - Create a free Supabase project at https://supabase.com
   - Run the SQL schema from `SUPABASE_SETUP.md` to create tables and RLS policies
   - Get your Project URL and anon key

2. **Configure GitHub Secrets**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add `SUPABASE_URL` (your Supabase project URL)
   - Add `SUPABASE_ANON_KEY` (your Supabase anon key)

3. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: **GitHub Actions** (not "Deploy from a branch")
   - Save

4. **Deploy**:
   - Push any commit to `main` or `master` branch
   - GitHub Actions will automatically inject credentials and deploy
   - Your app will be live at: `https://<username>.github.io/<repo-name>/`

#### Configure Supabase (Required for Authentication)

To enable user authentication and cloud sync:

1. **Create a Supabase project** at https://supabase.com

2. **Create the data table** (run in SQL Editor):

```sql
CREATE TABLE gokul_app_data (
  device_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE gokul_app_data ENABLE ROW LEVEL SECURITY;

-- ⚠️ DEVELOPMENT ONLY - INSECURE ⚠️
-- This policy allows ANYONE with the anon key to access ALL data
-- Use ONLY for testing. For production, see production policies below.
CREATE POLICY "dev_allow_all"
ON gokul_app_data FOR ALL
USING (true) WITH CHECK (true);
```

**🔒 For Production with Multiple Users:**
```sql
-- Add user authentication column
ALTER TABLE gokul_app_data ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE gokul_app_data DROP CONSTRAINT gokul_app_data_pkey;
ALTER TABLE gokul_app_data ADD PRIMARY KEY (user_id, device_id);

-- Remove insecure policy
DROP POLICY "dev_allow_all" ON gokul_app_data;

-- Add secure per-user policies
CREATE POLICY "users_select_own" ON gokul_app_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON gokul_app_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own" ON gokul_app_data FOR UPDATE
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own" ON gokul_app_data FOR DELETE
USING (auth.uid() = user_id);
```

3. **Edit `config.js`** with your credentials:
```javascript
window.AppConfig = {
  supabase: {
    url: 'https://yourproject.supabase.co',
    anonKey: 'your-anon-key-here',
    autoSync: true  // Enable auto-sync on app load
  },
  app: {
    name: 'Gokul Sweets Cost Analytics',
    version: '2.0.0'
  }
};
```

4. **Commit and push** to trigger redeployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📖 Documentation

### User Guide

#### Managing Ingredients
1. Go to **Ingredients** tab
2. Add ingredients with name, unit, and price
3. Ingredients are used to build recipes

#### Creating Recipes
1. Go to **Recipes** tab
2. Enter dish name, category, selling price
3. Set wastage % and daily production volume
4. Add ingredients with quantities
5. View real-time cost breakdown
6. Save recipe

#### Staff Management
1. Go to **Settings** → Staff Payroll
2. Click "Manage Staff" to add individual staff members
3. Or use "Bulk Upload Staff" for multiple entries
4. Staff costs are automatically distributed across recipes

#### Cloud Sync
![Settings - Cloud Sync](https://github.com/user-attachments/assets/b21f2bb8-d99c-4917-b992-9abce6761608)

1. Go to **Settings** → Cloud Sync
2. Enter Supabase URL and Anon Key (or pre-configured)
3. Device ID is auto-generated
4. Click "☁️ Save to Cloud" to backup
5. Click "⬇️ Load from Cloud" to restore

### Technical Details

#### PWA Features
- **Manifest**: Defines app name, icons, and display mode
- **Service Worker**: Caches app shell for offline use
- **Cache Strategy**: Network-first for navigation, cache-first for assets
- **Update Flow**: Prompts user when new version is available

#### Security Notes
- Supabase anon key is safe to expose in frontend code
- **Always enable Row Level Security (RLS)** on your Supabase tables
- Consider implementing Supabase Auth for multi-user scenarios
- Current implementation uses device_id as simple identifier

#### Browser Support
- Chrome 67+ (recommended)
- Edge 79+
- Safari 11.1+
- Firefox 63+

## 🛠️ Development

### Local Testing

```bash
# Start a local server
python3 -m http.server 8888

# Or use Node.js
npx http-server -p 8888

# Open in browser
open http://localhost:8888
```

### Testing PWA Features

1. Open Chrome DevTools → Application
2. Check Service Workers tab
3. Test offline mode
4. Verify Cache Storage
5. Check Manifest

### File Structure

```
.
├── index.html              # Main app (single-page app)
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline support
├── config.js               # Configuration (can be customized for deployment)
├── supabase-client.js      # Supabase integration helper
├── icons/                  # App icons (PNG and SVG)
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-192.svg
│   └── icon-512.svg
├── .nojekyll               # GitHub Pages configuration
├── DEPLOYMENT.md           # Detailed deployment guide
└── README.md               # This file
```

## 🔒 Security

### ⚠️ CRITICAL: Current Development Setup is INSECURE

**The RLS policy in the basic setup allows ANYONE with the anon key to access ALL data!**

### Best Practices

**✅ Current Implementation (Secure)**
This app now includes:
- ✅ **Supabase Auth**: Email/password authentication implemented
- ✅ **Row Level Security (RLS)**: Users can only access their own data
- ✅ **GitHub Secrets**: Credentials injected at build time (not in code)
- ✅ **Protected Routes**: Main app only accessible after login
- ✅ **Secure by Default**: Safe to use in production with proper Supabase setup

**Deployment Security:**
- ✅ **Use GitHub Secrets**: Store credentials as repository secrets, not in code
- ✅ **Enable RLS**: Always enable Row Level Security in Supabase
- ✅ **Anon Key Only**: Never commit service role key (only use anon key in frontend)
- ✅ **Monitor Usage**: Check Supabase dashboard for unusual activity
- ✅ **Regular Backups**: Use Export feature to backup data

**⚠️ Important Notes:**
- The anon key is safe to expose **only** with RLS enabled
- Without RLS, anyone with the anon key can access all data
- Follow setup instructions in `SUPABASE_SETUP.md` carefully
- Test RLS policies with multiple test accounts before production use

### Data Storage
- **Local**: localStorage (persistent, works offline)
- **Cloud**: Supabase (authenticated, user-scoped, encrypted in transit)
- **Export**: JSON format (can be imported later)
- **Sync**: Automatic when authenticated, debounced to reduce API calls

## 📊 Features in Detail

### Cost Calculation
- **Raw Material Cost**: Sum of all ingredient costs
- **Wastage Cost**: Percentage of raw cost
- **Labour Cost**: Distributed from monthly payroll
- **Utilities Cost**: Distributed from overhead costs
- **Total Cost**: Sum of all costs
- **Profit %**: (Selling Price - Total Cost) / Selling Price × 100

### Data Management
- **Export Backup**: Download all data as JSON
- **Import Backup**: Restore from JSON file
- **Clear All Data**: Reset app (cannot be undone)
- **Cloud Sync**: Backup/restore via Supabase

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

[MIT License](LICENSE)

## 🆘 Support

### Common Issues

**PWA not installing?**
- Ensure you're using HTTPS (GitHub Pages provides this)
- Clear browser cache and reload
- Check browser console for errors

**Icons not showing?**
- PNG icons should be in `icons/` folder
- Check manifest.json paths are relative
- Verify service worker is registered

**Cloud sync not working?**
- Verify Supabase credentials
- Check browser console for errors
- Ensure gokul_app_data table exists
- Verify RLS policies allow access

**Service worker issues?**
- Go to DevTools → Application → Service Workers
- Click "Unregister" and reload
- Check "Update on reload" during development

**Authentication issues?**
- Check that GitHub Secrets are configured correctly
- Verify Supabase Auth is enabled in your project
- Check browser console for specific error messages
- Try creating a new account instead of logging in
- See `SUPABASE_SETUP.md` for detailed troubleshooting

For more help, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## 📸 Screenshots

### Authentication
| Login Screen | Signup Screen |
|--------------|---------------|
| ![Login](https://github.com/user-attachments/assets/26431fd9-0597-45b0-bdf3-d3e8a105d969) | ![Signup](https://github.com/user-attachments/assets/f2a039d5-1249-470d-b88d-e351d9167a1c) |

### Dashboard
![Dashboard](https://github.com/user-attachments/assets/24019f66-218c-49cb-9b09-5c07f88956de)

## 🎯 Roadmap

- [x] ~~Multi-user support with authentication~~ ✅ **COMPLETED**
- [x] ~~Secure cloud sync with RLS~~ ✅ **COMPLETED**
- [ ] Password reset functionality
- [ ] Social authentication (Google, GitHub)
- [ ] Recipe scaling calculator
- [ ] Export to PDF reports
- [ ] Chart visualizations
- [ ] Mobile-optimized recipe cards
- [ ] Barcode scanner for ingredients
- [ ] Team collaboration features
- [ ] Public recipe sharing

---

Made with ❤️ for restaurant and sweets shop owners
