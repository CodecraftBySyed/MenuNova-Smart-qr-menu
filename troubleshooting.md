# MenuNova Deployment Guide & Error Fixes

### 1. The "Cold Start" Delay
* **Problem:** Menu items don't show up for the first 30-60 seconds after opening the site.
* **Cause:** Render Free Tier puts the server to sleep after inactivity.
* **Fix:** This is normal for free hosting. Tell clients to wait 1 minute on the first load, or upgrade to a Render "Starter" plan ($7/mo) for instant loading.

### 2. CORS (Security Gate)
* **Problem:** Website loads but menu items are blank; Console shows "CORS Error."
* **Fix:** In `admin/server.js`, you MUST add the new Cloudflare URL to the allowed origins:
    ```javascript
    origin: ['[https://client-name.pages.dev](https://client-name.pages.dev)', 'http://localhost:5000']
    ```

### 3. API Pathing
* **Problem:** 404 Not Found for menu requests.
* **Fix:** Ensure `js/config.js` includes the `/api` suffix.
    * *Correct:* `https://your-backend.onrender.com/api`

### 4. Cloudflare "Pretty URLs" vs Service Worker
* **Problem:** Clicking "Login" gives a "redirect mode is not follow" error.
* **Cause:** Cloudflare redirects `login.html` to `/login`.
* **Fix:** 1.  Always link to `/login` instead of `login.html` in your HTML files.
    2.  Use the `sw.js` logic that handles `if (response.redirected)`.

### 5. Video/Partial Content (Status 206)
* **Problem:** Service Worker crashes with "Partial response unsupported."
* **Fix:** Do NOT cache `.webm` or `.mp4` files in `sw.js`. Skip them in the `fetch` listener.

### 6. Cloudinary Image 404s
* **Problem:** Item text shows, but images are broken.
* **Fix:** Ensure the Cloudinary folder name matches the one in your Backend `.env` and that a `placeholder.png` exists in the `qr-menu` folder.