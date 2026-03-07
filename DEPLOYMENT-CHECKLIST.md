# 🚀 QUICK DEPLOYMENT CHECKLIST

## Prerequisites
- ✅ Supabase project setup
- ✅ Next.js app deployed on Vercel
- ✅ Database already has existing schema running

---

## Step 1: Apply Database Migration ⚡

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy Migration File**
   - Open `supabase/migration-v2-complete-features.sql`
   - Copy the ENTIRE file content

4. **Paste and Run**
   - Paste into Supabase SQL Editor
   - Click "Run" button
   - Wait for completion (should take 5-10 seconds)

5. **Verify Success**
   - No errors should appear
   - Check "Table Editor" to see new tables:
     - suppliers
     - purchases
     - purchase_items
     - restaurant_tables
     - tax_rates

### Option B: Via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase db reset
```

---

## Step 2: Initialize Default GST Rates 🧾

You need to run this **ONCE per shop** after migration.

### Method 1: Via Browser Console (Quick Test)

1. Go to your app (localhost or production)
2. Login as shop owner
3. Open browser DevTools (F12)
4. Go to Console tab
5. Run:

```javascript
// Replace 'your-shop-id' with your actual shop ID
fetch('/api/init-gst', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ shopId: 'your-shop-id' })
})
```

### Method 2: Add to Settings Page (Recommended)

Add a button in Settings that calls:

```typescript
import { initializeDefaultGSTRates } from '@/app/actions/tax-rates'

async function handleInitGST() {
  if (!shop) return
  
  const { error } = await initializeDefaultGSTRates(shop.id)
  
  if (error) {
    toast.error('Failed to initialize GST rates')
  } else {
    toast.success('GST rates initialized successfully!')
  }
}
```

### What This Creates:
```
✅ GST 0% (Tax Exempt)
✅ GST 5% (Essential goods)  
✅ GST 12% (Standard rate)
✅ GST 18% (Most common) ⭐ DEFAULT
✅ GST 28% (Luxury goods)
```

---

## Step 3: Verify Backend Works ✅

### Test 1: Check Tax Rates

```typescript
// In any page, add temporarily:
import { getTaxRates } from '@/app/actions/tax-rates'

useEffect(() => {
  testBackend()
}, [])

async function testBackend() {
  const { data, error } = await getTaxRates(shopId)
  console.log('Tax Rates:', data)
  console.log('Error:', error)
}
```

Expected output:
```javascript
Tax Rates: [
  { name: 'GST 0%', rate: 0, cgst: 0, sgst: 0 },
  { name: 'GST 5%', rate: 5, cgst: 2.5, sgst: 2.5 },
  { name: 'GST 12%', rate: 12, cgst: 6, sgst: 6 },
  { name: 'GST 18%', rate: 18, cgst: 9, sgst: 9, is_default: true },
  { name: 'GST 28%', rate: 28, cgst: 14, sgst: 14 }
]
```

### Test 2: Create Test Supplier

```typescript
import { createSupplier } from '@/app/actions/suppliers'

const testSupplier = await createSupplier(shopId, {
  name: 'Test Supplier',
  company_name: 'Test Company Ltd',
  phone: '9876543210',
  email: 'test@supplier.com',
  gst_number: '29ABCDE1234F1Z5'
})

console.log('Supplier created:', testSupplier)
```

### Test 3: Verify Stock Update Trigger

1. Create a test purchase order
2. Add a product
3. Mark status as "received"
4. Check product stock quantity increased

---

## Step 4: Deploy Code Changes 🚢

### If using Git + Vercel:

```bash
# Commit all changes
git add .
git commit -m "feat: Add Purchase Management, GST System, Restaurant Mode"
git push origin main
```

Vercel will automatically deploy.

### Manual Deploy:

```bash
# Build locally first to check
npm run build

# If successful, push to Vercel
vercel --prod
```

---

## Step 5: Post-Deployment Checks ✨

### 1. Test in Production

Go to your live app and verify:

- [ ] Login works
- [ ] Dashboard loads
- [ ] No console errors
- [ ] Existing features work (POS, Inventory, Sales)

### 2. Check Database

In Supabase Dashboard → Table Editor:

- [ ] `suppliers` table exists
- [ ] `purchases` table exists  
- [ ] `purchase_items` table exists
- [ ] `restaurant_tables` table exists
- [ ] `tax_rates` table exists and has 5 default rates

### 3. Check RLS Policies

In Table Editor:
- Click on any new table
- Go to "Policies" tab
- Should see policies like "Users can view shop suppliers"

### 4. Test New Actions

From browser console or test page:

```javascript
// Test fetching suppliers
const suppliers = await fetch('/api/test-suppliers').then(r => r.json())

// Should return empty array or error (if not initialized)
console.log(suppliers)
```

---

## 🎯 You're Done When:

✅ Migration ran without errors  
✅ New tables visible in Supabase  
✅ GST rates initialized (5 rates exist)  
✅ No errors in browser console  
✅ Existing features still work  
✅ Code deployed to Vercel  

---

## 🐛 Troubleshooting

### Migration Error: "relation already exists"

**Solution:** Tables might partially exist. Either:
1. Drop conflicting tables manually
2. Or modify migration to use `CREATE TABLE IF NOT EXISTS`

Already handled in our migration with `IF NOT EXISTS`.

### RLS Error: "new row violates row-level security policy"

**Cause:** User not authenticated or doesn't have shop access

**Solution:**
1. Ensure user is logged in
2. Check `user_roles` table has entry for user
3. Verify `shop_id` matches

### GST Rates Not Showing

**Cause:** Not initialized

**Solution:**
```typescript
await initializeDefaultGSTRates(shopId)
```

### Stock Not Updating on Purchase Receipt

**Cause:** Trigger might not have run

**Solution:**
1. Check trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_stock_on_purchase';
   ```
2. Check `inventory_logs` table for entries
3. Verify purchase status is exactly "received"

### "function generate_purchase_order_number does not exist"

**Cause:** Function not created

**Solution:**
Re-run the migration or manually create function:
```sql
-- Copy function definition from migration file
```

---

## 📞 Need Help?

1. **Check Logs:**
   - Supabase: Database → Logs
   - Vercel: Deployment → Logs
   - Browser: DevTools Console

2. **Common Issues:**
   - Authentication: Check Supabase Auth tab
   - Database: Check Table Editor
   - RLS: Check Policies tab per table

3. **Verify Data Flow:**
   ```
   User Login → Shop Loaded → Actions Called → Database Queried → RLS Checked → Data Returned
   ```

---

## ✅ Final Verification Script

Run this in browser console after deployment:

```javascript
async function verifyBackend() {
  console.log('🔍 Verifying backend...')
  
  // Check session
  const session = await fetch('/api/auth/session').then(r => r.json())
  console.log('✅ Session:', session ? 'Active' : '❌ None')
  
  // Check shop
  const shop = localStorage.getItem('shop-storage')
  console.log('✅ Shop:', shop ? JSON.parse(shop) : '❌ None')
  
  // Check tax rates (will fail if not initialized)
  try {
    const rates = await getTaxRates(shopId)
    console.log('✅ Tax Rates:', rates.data?.length || 0, 'rates found')
  } catch (e) {
    console.log('❌ Tax Rates Error:', e.message)
  }
  
  console.log('✅ Backend verification complete!')
}

verifyBackend()
```

Expected output:
```
🔍 Verifying backend...
✅ Session: Active
✅ Shop: {id: "...", name: "..."}
✅ Tax Rates: 5 rates found
✅ Backend verification complete!
```

---

## 🎉 Success!

If all checks pass, your backend is **production-ready**!

**Next:** Build UI components for the new features.

**Start with:** Updating POS to include GST calculator (easiest & most visible).

---

**Quick Links:**
- [Full Implementation Guide](./IMPLEMENTATION-GUIDE.md)
- [Phase 1 Summary](./PHASE-1-SUMMARY.md)
- [Migration File](./supabase/migration-v2-complete-features.sql)
