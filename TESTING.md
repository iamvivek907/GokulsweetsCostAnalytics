# Testing Guide for Shared Workspace

This guide provides testing scenarios and verification steps for the shared workspace implementation in Gokul Sweets Cost Analytics.

## 🎯 Overview

The app now uses a **TRUE shared workspace** model where:
- All users in the same organization see and edit the same data
- Changes made by one user are immediately visible to all other users
- Data is merged intelligently to prevent overwrites
- Last modifier is tracked for audit purposes

## 🧪 Testing Scenarios

### Scenario 1: Multi-User Recipe Sharing

**Test**: Verify that recipes created by one user are immediately visible to other users.

**Steps**:
1. **User A**: Login and create a new recipe "Gulab Jamun"
2. **User A**: Save the recipe
3. **User B**: Login from a different device/browser
4. **User B**: Check if "Gulab Jamun" recipe appears automatically

**Expected Result**: User B should see the recipe created by User A without manual refresh.

**Verification Query**:
```sql
SELECT 
  organization_id,
  jsonb_object_keys(payload->'recipes') as recipes,
  user_id as last_modified_by,
  updated_at
FROM gokul_app_data 
WHERE organization_id = 'gokul_sweets';
```

---

### Scenario 2: Simultaneous Edits

**Test**: Verify that concurrent edits from multiple users don't cause data loss.

**Steps**:
1. **User A**: Add ingredient "Sugar - 50 kg"
2. **User B** (simultaneously): Add ingredient "Milk - 20 liters"
3. **Both users**: Save changes
4. **Verify**: Both ingredients should be present in the database

**Expected Result**: Both ingredients should be visible to all users. The merge strategy should combine both additions.

**Verification Query**:
```sql
SELECT 
  jsonb_pretty(payload->'ingredients') as all_ingredients
FROM gokul_app_data 
WHERE organization_id = 'gokul_sweets';
```

---

### Scenario 3: Real-Time Sync

**Test**: Verify real-time updates work across devices.

**Steps**:
1. **User A**: Login and enable real-time sync
2. **User B**: Login from different device
3. **User B**: Add new staff member "Ramesh - Chef"
4. **User A**: Observe without refreshing

**Expected Result**: User A should see the new staff member appear automatically via real-time update.

**Debug Console Output**:
```
🔔 Real-time update received: {eventType: 'UPDATE', ...}
🔄 Processing UPDATE event
```

---

### Scenario 4: Last Modifier Tracking

**Test**: Verify that the system tracks who made the last change.

**Steps**:
1. **User A** (ID: user-123): Make a change and save
2. **Check database**: `user_id` should be 'user-123'
3. **User B** (ID: user-456): Make another change and save
4. **Check database**: `user_id` should now be 'user-456'

**Verification Query**:
```sql
SELECT 
  organization_id,
  user_id as last_modified_by,
  updated_at as last_modified_at
FROM gokul_app_data 
WHERE organization_id = 'gokul_sweets';
```

---

## 🔐 RLS Policy Verification

### Verify Policies Are Active

Run this query in Supabase SQL Editor to confirm RLS policies:

```sql
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd as operation,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'gokul_app_data'
ORDER BY policyname;
```

**Expected Policies**:
1. `Organization members can insert shared data`
2. `Organization members can update shared data`
3. `Organization members can view shared data`
4. `Organization members can delete shared data`

All policies should:
- Apply to `authenticated` role
- Use `organization_id = 'gokul_sweets'` as condition

---

## 📊 Single Shared Record Verification

### Verify Only One Record Per Organization

```sql
SELECT 
  organization_id,
  device_id,
  COUNT(*) as record_count,
  MAX(updated_at) as latest_update
FROM gokul_app_data 
WHERE organization_id = 'gokul_sweets'
GROUP BY organization_id, device_id;
```

**Expected Result**: Exactly **1 row** with:
- `organization_id`: 'gokul_sweets'
- `device_id`: 'shared_workspace'
- `record_count`: 1

---

## 🔍 Data Merge Testing

### Test Ingredient Merge

**Before**:
- User A has: `{"sugar": {...}, "milk": {...}}`
- User B has: `{"flour": {...}, "ghee": {...}}`

**After Migration**:
```sql
SELECT 
  jsonb_object_keys(payload->'ingredients') as ingredient_names
FROM gokul_app_data 
WHERE organization_id = 'gokul_sweets';
```

**Expected**: Should return all 4 ingredients: sugar, milk, flour, ghee

### Test Recipe Merge

```sql
SELECT 
  COUNT(*) as total_recipes,
  jsonb_object_keys(payload->'recipes') as recipe_names
FROM gokul_app_data 
WHERE organization_id = 'gokul_sweets';
```

**Expected**: All recipes from all users should be combined.

---

## ⚠️ Common Issues and Troubleshooting

### Issue 1: Users See Empty Data

**Symptoms**: User logs in but sees no recipes/ingredients.

**Diagnosis**:
```sql
-- Check if shared record exists
SELECT * FROM gokul_app_data 
WHERE organization_id = 'gokul_sweets' 
  AND device_id = 'shared_workspace';
```

**Fix**: If no record exists, run the migration script to create the shared workspace.

---

### Issue 2: RLS Policy Blocks Access

**Symptoms**: Error "new row violates row-level security policy"

**Diagnosis**:
```sql
-- Check user authentication
SELECT auth.uid() as current_user_id;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'gokul_app_data';
```

**Fix**: Ensure user is authenticated and RLS policies allow `organization_id = 'gokul_sweets'`.

---

### Issue 3: Data Not Syncing in Real-Time

**Symptoms**: Changes by User A don't appear for User B without refresh.

**Diagnosis**: Check browser console for:
```
✅ Real-time sync active
🔔 Real-time update received: ...
```

**Fix**:
1. Verify Supabase Realtime is enabled for `gokul_app_data` table
2. Check network tab for WebSocket connection
3. Ensure `initRealtimeSync()` is called after login

---

### Issue 4: Merge Conflicts

**Symptoms**: Data from one user overwrites data from another user.

**Diagnosis**: Check console logs:
```
🔄 Merging with existing shared data...
📊 Merged counts: {ingredients: X, recipes: Y, staff: Z}
```

**Fix**: The merge strategy should combine data. If overwriting occurs, verify the `saveData` method uses spread operator `{...existing, ...new}`.

---

## 🎯 Performance Testing

### Load Time Test

**Test**: Measure time to load shared workspace data.

```javascript
console.time('loadSharedWorkspace');
const data = await window.SupabaseSync.loadData(deviceId, userId);
console.timeEnd('loadSharedWorkspace');
```

**Expected**: < 2 seconds for typical data size (100 recipes, 200 ingredients).

---

### Concurrent User Test

**Test**: Simulate 5 users making changes simultaneously.

**Setup**:
1. Open 5 browser tabs
2. Login with 5 different users
3. Each user adds different data simultaneously
4. Verify all data is merged correctly

**Verification**:
```sql
SELECT 
  (SELECT COUNT(*) FROM jsonb_object_keys(payload->'ingredients')) as ingredients,
  (SELECT COUNT(*) FROM jsonb_object_keys(payload->'recipes')) as recipes,
  (SELECT COUNT(*) FROM jsonb_object_keys(payload->'staff')) as staff
FROM gokul_app_data 
WHERE organization_id = 'gokul_sweets';
```

**Expected**: Total count should equal sum of all individual additions.

---

## 📝 Manual Test Checklist

- [ ] User A creates recipe → User B sees it
- [ ] User B adds ingredient → User A sees it
- [ ] Real-time sync shows updates without refresh
- [ ] Last modifier is tracked correctly
- [ ] Only one shared record exists in database
- [ ] RLS policies allow all authenticated users
- [ ] Data merge works correctly (no overwrites)
- [ ] Concurrent edits don't cause data loss
- [ ] Console shows "SHARED workspace" in logs
- [ ] Migration script completes without errors

---

## 🔧 Debug Commands

### Enable Verbose Logging

In browser console:
```javascript
// Monitor real-time events
window.SupabaseSync.onDataSync((eventType, data) => {
  console.log('📡 SYNC EVENT:', eventType, data);
});

// Enable detailed console logging
localStorage.setItem('debug', 'supabase:*');
```

### Force Reload from Cloud

```javascript
const data = await window.SupabaseSync.loadData('shared_workspace', currentUserId);
console.log('Loaded:', data);
```

### Check Current Shared Data

```javascript
const { data } = await window.SupabaseSync.client
  .from('gokul_app_data')
  .select('*')
  .eq('organization_id', 'gokul_sweets')
  .single();
console.log('Current shared workspace:', data);
```

---

## ✅ Success Criteria

The shared workspace implementation is successful when:

1. ✅ All users see the same data
2. ✅ Changes sync in real-time across devices
3. ✅ No data loss from concurrent edits
4. ✅ Last modifier is tracked for audit
5. ✅ Only one shared record exists per organization
6. ✅ RLS policies allow organization-wide access
7. ✅ Migration merges existing user data correctly
8. ✅ Console logs show "SHARED workspace" messages

---

## 📚 Additional Resources

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL JSONB Functions](https://www.postgresql.org/docs/current/functions-json.html)
