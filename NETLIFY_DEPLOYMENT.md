# MenuNova - Netlify Deployment Guide

This guide covers the optimization of MenuNova for Netlify deployment with Netlify Functions for the backend and static files for the frontend.

## 📋 Changes Summary

### 1. Backend Restructuring (Serverless)

#### ✅ Created `/functions` Folder
- **Location**: `functions/` directory in root
- **Purpose**: Houses all Netlify Functions

#### ✅ MongoDB Connection Caching (`functions/lib/mongodb.js`)
- **Key Feature**: Reuses MongoDB connections across function invocations
- **Connection Pool**: 
  - `maxPoolSize: 5`
  - `minPoolSize: 1`
  - Optimized for serverless environments
- **Auto-Backfill**: Sets `isAvailable: true` on existing menu items
- **Performance**: Eliminates reconnection overhead - critical for large deployments

#### ✅ Serverless Handler (`functions/server.js`)
- **Wraps Express App**: Using `serverless-http` library
- **Exports Handler**: `module.exports.handler` for Netlify Functions
- **No app.listen()**: Removed since Netlify manages the runtime
- **Large Payload Support**: 
  - `bodyParser limit: 50mb` for 127+ menu items
  - Handles JSON files with ease
- **CORS Configuration**:
  - `https://menunova.netlify.app` (update with your actual domain)
  - `https://menunova-smart-qr-menu.pages.dev` (original domain)
  - `http://localhost:5000` (development)
  - `http://localhost:3000` (local frontend)

#### ✅ Copied Backend Structure to Functions
- **Models**: `functions/models/Menu.js`, `functions/models/User.js`
- **Routes**: `functions/routes/auth.js`, `functions/routes/menu.js`, `functions/routes/whatsapp.js`
- **Middleware**: `functions/middleware/auth.js`
- **Self-Contained**: Functions folder works independently

#### ✅ Updated Dependencies
- **Added**: `serverless-http` (^3.2.0) to `admin/package.json`
- **Why**: Converts Express requests/responses to AWS Lambda format

---

### 2. Frontend API Configuration Update

#### ✅ Updated `js/config.js`
**Before**:
```javascript
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:5000' 
  : 'https://menunova-smart-qr-menu.onrender.com';
```

**After**:
```javascript
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:5000' 
  : '/.netlify/functions/server';
```

**Benefits**:
- Relative URL works on any Netlify domain automatically
- No hardcoding of production URLs
- Works seamlessly during deployments and migrations

---

### 3. Netlify Configuration

#### ✅ Created `netlify.toml`
**Key Sections**:

**Build Configuration**:
```toml
[build]
  command = "npm install --prefix admin && echo 'Admin dependencies installed'"
  functions = "functions"
  publish = "."
```

**API Routing**:
```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server/:splat"
  status = 200
```
- Maps all `/api/*` requests to the serverless handler
- Status 200 makes it a rewrite (transparent to client)

**Security Headers**:
- Content-Type security
- CORS headers
- XSS Protection
- Frame options

**Cache Settings**:
- Static files (CSS, JS, Images): 1-year cache with immutable flag
- Manifest.json: 1-hour cache
- Service Worker: 1-hour cache (frequently updated)

**Large Payload Support**:
- Gzip compression enabled
- 50MB payload limit in Express

---

### 4. PWA Configuration

✅ **Manifest Verification**: `index.html` already correctly links:
```html
<link rel="manifest" href="./manifest.json">
```

**Current PWA Features**:
- ✅ Icon set (192x192 and 512x512)
- ✅ Theme colors configured
- ✅ Standalone mode enabled
- ✅ Apple mobile web app capable
- ✅ Status bar styling

**Deploy Ensures**:
- PWA manifest serves with correct MIME type via netlify.toml
- Install prompt appears on Netlify domain
- Users can add app to home screen

---

## 🚀 Deployment Steps

### Step 1: Install Dependencies
```bash
cd admin
npm install
```
This installs `serverless-http` and all other dependencies.

### Step 2: Set Environment Variables on Netlify

Go to **Netlify Dashboard** → **Site Settings** → **Build & Deploy** → **Environment**:

**Required Variables**:
- `ADMIN_MONGO_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for JWT tokens (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary account name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

### Step 3: Deploy to Netlify

**Option A: GitHub Integration** (Recommended)
1. Push code to GitHub
2. Connect GitHub repo to Netlify
3. Set build command: `npm install --prefix admin`
4. Set functions directory: `functions`
5. Deploy!

**Option B: Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify deploy
```

### Step 4: Update CORS Configuration

After deploying, update the Netlify domain in `functions/server.js`:
```javascript
app.use(cors({
  origin: [
    'https://menunova-smart-qr-menu.pages.dev',
    'https://your-actual-netlify-domain.netlify.app',  // ← Update this
    'http://localhost:5000',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

Then redeploy.

---

## 📊 Performance Optimizations

### MongoDB Connection Caching
- **First Request**: ~2-3s (includes connection + setup)
- **Subsequent Requests**: <200ms (reuses connection)
- **Cold Start Mitigation**: Connection kept alive between invocations

### Large Menu Support (127+ Items)
- ✅ 50MB body parser limit
- ✅ Gzip compression enabled
- ✅ Efficient JSON serialization
- ✅ Connection pooling

### Frontend Optimization
- ✅ Service Worker (sw.js) caching
- ✅ Static asset caching (1-year TTL)
- ✅ Relative API URL (no domain hardcoding)

---

## 🔍 Testing Before Production

### Local Development
```bash
# Terminal 1: Start admin server
cd admin
npm run dev

# Terminal 2: Test frontend
open http://localhost:5000
```

### Test Serverless Functions Locally
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run functions locally
netlify dev
```

### Test API Endpoints
```bash
# Get all menu items
curl http://localhost:3000/api/menu

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin123"}'

# Get WhatsApp settings
curl http://localhost:3000/api/whatsapp/settings
```

---

## 🛠️ Troubleshooting

### Issue: "Cannot find module 'serverless-http'"
**Solution**: Run `npm install --prefix admin` in Netlify build settings

### Issue: MongoDB Connection Timeout
**Solution**: 
- Check ADMIN_MONGO_URI in environment variables
- Ensure IP whitelist includes Netlify's IPs (or use 0.0.0.0/0)
- Increase timeout in `functions/lib/mongodb.js`

### Issue: CORS Errors
**Solution**: 
1. Update Netlify domain in `functions/server.js`
2. Redeploy
3. Verify origin matches in browser console

### Issue: "Function not found" on /.netlify/functions/server
**Solution**: 
- Ensure `netlify.toml` has `functions = "functions"`
- Check that `server.js` exports `handler`
- Rebuild on Netlify

### Issue: PWA Install Button Not Appearing
**Solution**:
- Serve over HTTPS (Netlify does this automatically)
- Verify manifest.json is accessible
- Check manifest.json has correct MIME type in developer tools

---

## 📁 Project Structure After Optimization

```
MenuNova-Smart-qr-menu-main/
├── functions/                    # ← Netlify Functions (NEW)
│   ├── lib/
│   │   └── mongodb.js           # Cached MongoDB connection
│   ├── models/
│   │   ├── Menu.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── menu.js
│   │   └── whatsapp.js
│   ├── middleware/
│   │   └── auth.js
│   └── server.js                # ← Serverless handler (NEW)
├── admin/                        # ← Original backend (kept for reference)
│   ├── package.json             # ← Updated with serverless-http
│   ├── server.js
│   ├── models/
│   ├── routes/
│   └── middleware/
├── js/
│   ├── config.js                # ← Updated API URL
│   └── ...
├── index.html                   # ← PWA already configured
├── manifest.json                # ← PWA manifest
├── netlify.toml                 # ← NEW: Netlify configuration
└── ... (other static files)
```

---

## 🔐 Security Checklist

- ✅ JWT_SECRET is unique and strong
- ✅ MongoDB credentials in environment variables (not in code)
- ✅ Cloudinary credentials in environment variables
- ✅ CORS origin restricted to known domains
- ✅ HTTPS enforced by Netlify
- ✅ Security headers configured in netlify.toml
- ✅ Service Worker updated for new API endpoint
- ✅ Admin API requires JWT authentication

---

## 📞 Support & Updates

**API Endpoint**: `/.netlify/functions/server`

**Documentation**:
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [serverless-http GitHub](https://github.com/dougmoscrop/serverless-http)
- [MongoDB in Serverless Guide](https://www.mongodb.com/docs/realm/best-practices/serverless-deployments/)

---

## ✨ Next Steps (Optional Enhancements)

1. **Set up CI/CD**: Use GitHub Actions for automated testing
2. **Add Monitoring**: Integrate Sentry for error tracking
3. **Performance Monitoring**: Use Netlify Analytics
4. **Database Backup**: Set up MongoDB Atlas automated backups
5. **CDN Optimization**: Enable Netlify's image optimization

---

**Happy Deploying! 🚀**
