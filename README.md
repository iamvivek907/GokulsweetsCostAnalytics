# Gokul Sweets Cost Analytics - PWA

A Progressive Web App for restaurant and sweets shop cost analytics, profit tracking, and recipe management.

![Dashboard](https://github.com/user-attachments/assets/70f0cbae-ae21-4646-8beb-55b5bb50cc63)

## ✨ Features

### 📱 Progressive Web App (PWA)
- **Install to Home Screen**: Works like a native app on mobile and desktop
- **Offline Support**: Full functionality without internet connection
- **Fast Loading**: Service worker caches assets for instant loading
- **Auto-Updates**: Users are notified when new versions are available

### ☁️ Cloud Sync with Supabase
- **Automatic Sync**: Configure once, sync automatically on app load
- **Manual Sync**: Save and load data on-demand
- **Device-Based**: Each device has its own unique data store
- **Environment Configuration**: Set credentials at deployment time

### 💼 Business Analytics
- **Ingredient Management**: Track raw materials and costs
- **Recipe Costing**: Calculate total cost including wastage and overhead
- **Profit Analysis**: Monitor profit margins and identify at-risk items
- **Staff Payroll**: Department-wise staff and salary tracking
- **Overhead Costs**: Separate tracking for restaurant and factory locations

## 🚀 Quick Start

### For Users

1. **Visit the deployed app**: [Your GitHub Pages URL]
2. **Add to Home Screen**:
   - On iOS: Tap Share → Add to Home Screen
   - On Android: Tap Menu → Install App
3. **Start adding data**: Ingredients, recipes, and staff
4. **Optional - Cloud Sync**: Configure Supabase in Settings to enable cloud backup

### For Developers

#### Deploy to GitHub Pages

1. **Fork or clone** this repository
2. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` or your working branch
   - Folder: `/ (root)`
   - Save

3. **Your app will be live at**: `https://<username>.github.io/<repo-name>/`

#### Configure Supabase (Optional)

To enable automatic cloud sync:

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

-- Create policy (adjust for your security needs)
CREATE POLICY "Allow device access"
ON gokul_app_data FOR ALL
USING (true) WITH CHECK (true);
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

### Best Practices
- ✅ Use anon key only (not service role key) in frontend
- ✅ Enable Row Level Security on Supabase tables
- ✅ Implement authentication for production
- ✅ Monitor Supabase usage for abuse
- ✅ Regular backups using Export feature

### Data Storage
- **Local**: IndexedDB/localStorage (persistent)
- **Cloud**: Supabase (optional, encrypted in transit)
- **Export**: JSON format (can be imported later)

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

For more help, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🎯 Roadmap

- [ ] Multi-user support with authentication
- [ ] Recipe scaling calculator
- [ ] Export to PDF reports
- [ ] Chart visualizations
- [ ] Mobile-optimized recipe cards
- [ ] Barcode scanner for ingredients

---

Made with ❤️ for restaurant and sweets shop owners
