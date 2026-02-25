# MenuNova: Smart QR Menu System 🚀

MenuNova is a high-performance, PWA-ready digital menu solution designed for modern restaurants. It allows customers to scan a QR code, browse the menu, and place orders directly via WhatsApp.

## ✨ Features
- **Speed-Optimized:** Hosted on Cloudflare Pages for global low-latency.
- **PWA Ready:** Works offline and can be "Installed" on customer phones.
- **Admin Dashboard:** Easy menu management (Add/Edit/Delete items).
- **WhatsApp Integration:** Instant order notifications for the restaurant.
- **Cloudinary Powered:** High-quality image hosting with auto-optimization.

## 🛠️ Tech Stack
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript.
- **Backend:** Node.js, Express.js (Hosted on Render).
- **Database:** MongoDB Atlas.
- **Storage:** Cloudinary (Images).

## 🔐 Admin Access (Demo)
To manage the menu, navigate to `/login` or `/admin.html`.
* **Username:** `Admin`
* **Password:** `Password`

> *Note: In a production environment, ensure these credentials are changed via environment variables.*

## 🚀 Deployment Instructions
1.  **Backend:** Deploy the `admin/` folder to Render. Set up `.env` with Mongo URI and Cloudinary credentials.
2.  **Frontend:** Update `js/config.js` with the Render URL.
3.  **Hosting:** Connect GitHub to Cloudflare Pages. Use `Framework: None` and `Root Directory: /`.

## 📱 Service Worker
The project includes a robust `sw.js` designed to handle Cloudflare's pretty-url redirects and skip partial video content caching for maximum stability.
