<!-- 
NETLIFY DEPLOYMENT CHECKLIST
Ensure all these steps are completed before deploying MenuNova to Netlify
-->

# MenuNova - Netlify Pre-Deployment Checklist

## ✅ Code Changes (COMPLETED)

- [x] Created `/functions` folder with serverless handler
- [x] Created `functions/server.js` with serverless-http wrapper
- [x] Created `functions/lib/mongodb.js` with cached connection
- [x] Copied models to `functions/models/`
- [x] Copied routes to `functions/routes/`
- [x] Copied middleware to `functions/middleware/`
- [x] Updated `js/config.js` with `/.netlify/functions/server` URL
- [x] Added `serverless-http` to `admin/package.json`
- [x] Created `netlify.toml` with build, functions, redirects, and headers
- [x] Verified `manifest.json` link in `index.html`

## 🔧 Development Setup

- [ ] Run `cd admin && npm install` to install serverless-http
- [ ] Test locally with `npm run dev` from admin folder
- [ ] Test API endpoints on `http://localhost:5000/api/*`
- [ ] Verify PWA installation prompt locally

## 🌐 Netlify Dashboard Setup

### Site Settings
- [ ] Create new Netlify site or connect existing GitHub repository
- [ ] Set **Build command**: `npm install --prefix admin`
- [ ] Set **Publish directory**: `.` (root, since we're serving static files)
- [ ] Set **Functions directory**: `functions`

### Environment Variables
Add these to **Site Settings → Build & Deploy → Environment**:

- [ ] `ADMIN_MONGO_URI` = `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`
- [ ] `MONGO_URI` = (same as above, or leave if not needed)
- [ ] `JWT_SECRET` = (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] `CLOUDINARY_CLOUD_NAME` = your-cloud-name
- [ ] `CLOUDINARY_API_KEY` = your-api-key
- [ ] `CLOUDINARY_API_SECRET` = your-api-secret

### MongoDB Atlas Setup
- [ ] Log in to MongoDB Atlas
- [ ] Go to **Security → Network Access**
- [ ] Add IP **0.0.0.0/0** (or specific Netlify IP ranges)
  - Netlify IPs: https://docs.netlify.com/functions/overview/#netlify-function-builder
- [ ] Ensure database user has correct read/write permissions

### Cloudinary Setup
- [ ] Verify Cloudinary account is active
- [ ] Confirm API credentials are correct
- [ ] Ensure upload folder `qr-menu` exists or will be auto-created

## 🚀 Deployment

### Pre-Deploy Checklist
- [ ] All environment variables set in Netlify
- [ ] MongoDB connection string is correct
- [ ] Cloudinary credentials work
- [ ] JWT_SECRET is unique (use crypto to generate)
- [ ] Git repo is up-to-date with all changes

### Deploy Steps
- [ ] Push code to GitHub (if using GitHub integration)
- [ ] Go to Netlify → **Deploys** → **Deploy site**
- [ ] Monitor build log for errors
- [ ] Wait for "Deploy preview ready"
- [ ] Check function status in Netlify Functions tab

## ✨ Post-Deployment

### API Testing
- [ ] Open `https://your-site.netlify.app/api/menu` - should return menu items as JSON
- [ ] Test login: `POST https://your-site.netlify.app/api/auth/login` with `{"email":"admin","password":"admin123"}`
- [ ] Test WhatsApp settings: `GET https://your-site.netlify.app/api/whatsapp/settings`

### Frontend Testing
- [ ] Open `https://your-site.netlify.app` in browser
- [ ] Verify menu items load correctly
- [ ] Test PWA: Open DevTools → Application → Manifest
  - [ ] Manifest is served with MIME type `application/manifest+json`
  - [ ] "Install" button appears in address bar (on Chrome/Edge)
  - [ ] Add app to home screen works

### Admin Panel Testing
- [ ] Login works with default admin credentials
- [ ] Can add new menu item (with image upload via Cloudinary)
- [ ] Can edit existing menu item
- [ ] Can delete menu item
- [ ] Toggle availability works
- [ ] WhatsApp settings save correctly

### CORS Testing
- [ ] No CORS errors in DevTools Console
- [ ] All API requests succeed
- [ ] Verify origin header matches allowed domains

### Performance Testing
- [ ] Second API request responds <200ms (connection caching)
- [ ] Menu with 127+ items loads without timeout
- [ ] Large JSON payloads (50MB limit) work correctly

## 🔄 Redeploy After Changes

If you update `functions/server.js` CORS origins:
1. [ ] Update the origin array with your actual Netlify domain
2. [ ] Commit and push to GitHub
3. [ ] Netlify auto-deploys or manually trigger deploy

## 🆘 Troubleshooting

If deployment fails:

### Build Fails
- [ ] Check build logs in Netlify
- [ ] Verify `npm install --prefix admin` works locally
- [ ] Ensure `functions/server.js` has no syntax errors

### Functions Not Found
- [ ] Verify `netlify.toml` has `functions = "functions"`
- [ ] Check `server.js` exports `handler`
- [ ] Ensure file is in correct path: `functions/server.js`

### API Returns 404
- [ ] Verify redirect in `netlify.toml`: `/api/*` → `/.netlify/functions/server/:splat`
- [ ] Check function logs in Netlify UI
- [ ] Verify routes are imported correctly in `functions/server.js`

### MongoDB Connection Fails
- [ ] Check ADMIN_MONGO_URI in environment variables
- [ ] Verify IP whitelist in MongoDB Atlas (add 0.0.0.0/0)
- [ ] Test connection string locally with `mongosh`

### CORS Errors
- [ ] Update CORS origin in `functions/server.js`
- [ ] Ensure origin matches browser's domain exactly
- [ ] Redeploy after changes

### Menu Items Not Loading
- [ ] Check API response: Open DevTools → Network → api/menu
- [ ] Verify MongoDB is connected
- [ ] Check function logs for errors
- [ ] Ensure menu collection has data

### PWA Install Button Missing
- [ ] Verify site uses HTTPS (Netlify provides this)
- [ ] Check manifest.json loads: Open `https://your-site.netlify.app/manifest.json`
- [ ] Verify `sw.js` is registered
- [ ] Check DevTools → Application → Manifest for errors
- [ ] Service Worker should be active and running

## 📋 Quick Reference

| Component | Location | Status |
|-----------|----------|--------|
| Serverless Handler | `functions/server.js` | ✅ Created |
| MongoDB Cache | `functions/lib/mongodb.js` | ✅ Created |
| API Routes | `functions/routes/` | ✅ Copied |
| Frontend Config | `js/config.js` | ✅ Updated |
| Netlify Config | `netlify.toml` | ✅ Created |
| PWA Manifest | `manifest.json` | ✅ Linked |
| Dependencies | `admin/package.json` | ✅ Updated |

## 🎉 Success Indicators

When everything is working correctly:
- ✅ API calls from frontend work without CORS errors
- ✅ Menu items display instantly
- ✅ Admin panel login succeeds
- ✅ Menu items can be added/edited/deleted
- ✅ PWA install button appears
- ✅ App runs offline with cached data
- ✅ Second API requests are <200ms (cached DB connection)

---

**Questions?** Check [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) for detailed instructions.
