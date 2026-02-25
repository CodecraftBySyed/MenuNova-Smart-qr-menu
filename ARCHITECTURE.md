<!-- MenuNova Netlify Deployment - Architecture Overview -->

# 🏗️ MenuNova Netlify Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                              │
│                   (Any Netlify Domain)                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                   ┌───────────┼───────────┐
                   │           │           │
            ┌──────▼────┐  ┌───▼────┐  ┌──▼──────┐
            │ Static    │  │PWA     │  │Service  │
            │Assets     │  │Manifest│  │Worker   │
            │(index.    │  │        │  │(sw.js)  │
            │ html,CSS) │  │        │  │         │
            └───────────┘  └────────┘  └─────────┘
                   │           │           │
                   │           │           │
                   └───────────┼───────────┘
                               │
                   ┌───────────┼───────────┐
                   │           │           │
            ┌──────▼────┐  ┌───▼────┐     │
            │js/config. │  │api/*   │     │
            │js detects │  │requests│     │
            │localhost  │  │route   │     │
            └───┬───────┘  └────┬───┘     │
                │               │         │
        ┌───────▼──────┐    ┌───▼──────────────┐
        │Localhost     │    │Netlify Rewrite   │
        │API: http://  │    │/api/* → /.netlify│
        │localhost:5000│    │/functions/server │
        └──────────────┘    └────┬─────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  Netlify Functions Layer   │
                    ├────────────────────────────┤
                    │ functions/server.js        │
                    │ (Express + serverless-http)│
                    └────────┬───────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
       ┌────▼─────┐  ┌──────▼──────┐  ┌────▼──────┐
       │Routes    │  │Middleware   │  │Models     │
       │(auth,    │  │(JWT auth)   │  │(Menu,User)│
       │menu,     │  │             │  │           │
       │whatsapp) │  │             │  │           │
       └──────────┘  └─────────────┘  └────┬──────┘
                                            │
              ┌─────────────────────────────▼─────────────┐
              │    MongoDB Connection Cache Library       │
              │    (functions/lib/mongodb.js)             │
              │  - Reuses connections                     │
              │  - 5 connection pool                      │
              │  - Auto-backfill isAvailable              │
              └─────────────────────────┬───────────────┘
                                        │
                    ┌───────────────────▼────────────┐
                    │   MongoDB Atlas (Cloud)        │
                    │  ┌──────────────────────────┐  │
                    │  │ Collections:             │  │
                    │  │ - menu (127+ items)      │  │
                    │  │ - users (admin)          │  │
                    │  └──────────────────────────┘  │
                    └────────────────────────────────┘
```

## Request Flow Example

### 1️⃣ Frontend Requests Menu Items

```javascript
// js/config.js detects production
const API_BASE_URL = '/.netlify/functions/server'

// Frontend makes request
fetch('/.netlify/functions/server/api/menu')
  .then(res => res.json())
  .then(menu => displayMenuItems(menu))
```

### 2️⃣ Netlify Rewrite Rule

```toml
# netlify.toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server/:splat"
  status = 200
```
- Request: `/api/menu`
- Rewritten to: `/.netlify/functions/server/api/menu` (transparent rewrite)
- Status 200 = internal rewrite (URL doesn't change)

### 3️⃣ Serverless Function Handler

```javascript
// functions/server.js
import serverless from 'serverless-http'
import express from 'express'

const app = express()
app.use('/api/menu', menuRoutes) // routes handle /api/menu

export const handler = serverless(app)
```

### 4️⃣ Connection Pool Reuse

**First Request (Cold Start)**:
```
Request → MongoDB.connect() → Query → Response (2-3 seconds)
Cache: Store connection globally
```

**Second Request (Warm)**:
```
Request → Reuse cached connection → Query → Response (<200ms)
```

---

## Technology Stack

### Frontend
- **Framework**: Vanilla JavaScript (no framework required)
- **PWA**: Service Worker (sw.js) for offline support
- **Manifest**: PWA manifest.json for install prompt
- **Styling**: Tailwind CSS (src/output.css)
- **Icons**: Font Awesome

### Backend
- **Runtime**: Node.js 18.x on Netlify Functions
- **Framework**: Express.js (lightweight, serverless-compatible)
- **Database**: MongoDB Atlas (managed cloud)
- **Authentication**: JWT (JSON Web Tokens)
- **Image Storage**: Cloudinary CDN
- **File Upload**: Multer with Cloudinary storage driver

### Deployment
- **Platform**: Netlify (frontend + functions)
- **Database**: MongoDB Atlas
- **Images**: Cloudinary CDN
- **DNS**: Netlify managed domain

---

## Performance Characteristics

### Connection Lifecycle

```
Account Created
    ↓
First Visit
    ├─ Manifest downloads (manifest.json)
    ├─ Service Worker registers (sw.js)
    ├─ Static files cache (1 year)
    └─ First API call connects to MongoDB (2-3s)
    
Subsequent Visits
    ├─ Service Worker serves cached assets
    ├─ API calls reuse MongoDB connection (<200ms)
    ├─ Menu data (127+ items) loads instantly
    └─ User can work offline with cached data
```

### Payload Handling

- **Express Body Parser**: 50MB limit
- **Menu Items**: 127 items ≈ 100-300KB JSON
- **Images**: Served from Cloudinary CDN
- **Gzip Compression**: Enabled for all responses

---

## Scalability & Limits

| Component | Limit | Status |
|-----------|-------|--------|
| Netlify Functions | 10 seconds execution | ✅ API calls <1s typically |
| Request Payload | 50MB (Express) | ✅ Menu JSON ~200KB |
| Response Payload | No hard limit | ✅ Gzip compression enabled |
| MongoDB Connections | 500 per server (Atlas) | ✅ 5 pooled connections |
| Cloudinary Storage | 10GB (free plan) | ⚠️ Monitor for images |
| Netlify Requests | Unlimited | ✅ Pay-as-you-go |

---

## Code Organization

### Before Optimization
```
admin/
  ├── server.js (with app.listen - not serverless)
  ├── routes/
  ├── models/
  └── middleware/
```

### After Optimization
```
functions/                          ← NEW: Serverless
  ├── package.json                 ← Dependencies for functions
  ├── server.js (serverless wrapper)
  ├── routes/
  ├── models/
  ├── middleware/
  └── lib/
      └── mongodb.js (connection cache)

admin/                             ← KEPT: For reference/development
  ├── package.json (with serverless-http)
  ├── server.js (original, for local development)
  ├── routes/
  ├── models/
  └── middleware/

netlify.toml                       ← NEW: Netlify configuration
NETLIFY_DEPLOYMENT.md              ← NEW: Setup guide
NETLIFY_CHECKLIST.md               ← NEW: Deployment checklist
```

---

## Security Model

```
┌─────────────────────────────────────────────────────┐
│           Frontend (index.html, js/*, src/*)        │
│                    (Public)                          │
└──────────────────────────┬──────────────────────────┘
                           │
                  (HTTPS + CORS)
                           │
┌──────────────────────────▼──────────────────────────┐
│         Netlify Functions (API Gateway)              │
│  ├─ CORS validation (origin whitelist)              │
│  ├─ Request routing (/api/*)                        │
│  └─ Rate limiting (built-in)                        │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│        Express Server (functions/server.js)          │
│  ├─ Auth middleware (JWT required for mutations)    │
│  ├─ Input validation                                │
│  └─ Error handling                                  │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│   MongoDB Atlas (Encrypted Connection)               │
│  ├─ IP Whitelist (Netlify IPs)                      │
│  ├─ User authentication                             │
│  └─ Collection-level access control                 │
└─────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### Example 1: Fetching Menu (Public, No Auth)

```
Browser
  └─ GET /.netlify/functions/server/api/menu
      └─ Netlify Rewrite: /api/menu → /.netlify/functions/server/:splat
          └─ Express routes: GET /api/menu
              └─ Handler: Menu.find() from MongoDB
                  └─ Return: JSON array of menu items (127 items)
                      └─ Browser caches response in Service Worker
                          └─ Display menu items
```

### Example 2: Adding Menu Item (Requires Auth)

```
Browser
  └─ POST /.netlify/functions/server/api/menu
      ├─ Header: Authorization: <JWT_TOKEN>
      ├─ Body: { name: "...", category: "...", image: File }
      
      └─ Netlify Rewrite → Express Route
          └─ Auth Middleware: Verify JWT
              └─ Multer: Upload image to Cloudinary
                  └─ Handler: Menu.create() in MongoDB
                      └─ Return: Created menu item (201)
                          └─ Browser updates UI
                              └─ Invalidate cached menu list
```

### Example 3: Login (Admin Authentication)

```
Browser
  └─ POST /.netlify/functions/server/api/auth/login
      ├─ Body: { email: "admin", password: "admin123" }
      
      └─ Auth Route Handler
          ├─ Find user in MongoDB
          ├─ Verify password with bcrypt
          └─ Generate JWT token
              └─ Return: { token: "<JWT_TOKEN>" }
                  └─ Browser stores token in localStorage
                      └─ Use token for future requests
```

---

## Monitoring & Debugging

### View Function Logs
1. Netlify Dashboard → **Functions**
2. Click **Logs** button
3. See real-time function execution logs

### Monitor MongoDB
1. MongoDB Atlas → **Metrics**
2. Check:
   - Connection count (should be ≤ 5)
   - Query performance
   - Disk usage

### Monitor Cloudinary
1. Cloudinary Dashboard → **Analytics**
2. Check:
   - Image upload count
   - Storage used
   - Bandwidth

---

## Ready for Deployment? ✅

✅ All code changes implemented
✅ Serverless handler created
✅ MongoDB connection caching enabled
✅ CORS configured
✅ Large payload support (50MB)
✅ PWA fully configured
✅ netlify.toml created

**Next Step**: Follow [NETLIFY_CHECKLIST.md](./NETLIFY_CHECKLIST.md) to deploy!
