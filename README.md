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

## 🔒 Security & Configuration
**Note:** This repository contains the source code for educational and review purposes. 
- The `.env` file is **not included** in this repository to protect sensitive API keys and database credentials.
- To run this locally, you must provide your own `.env` file with `MONGO_URI`, `CLOUDINARY_URL`, and `JWT_SECRET`.



## 🔐 Admin Access (Demo Settings)
To manage the menu, navigate to `/login`.
* **Username:** `Admin`
* **Password:** `Password`

## 🚀 Deployment Overview
1.  **Backend:** Deploy the `admin/` folder to Render.
2.  **Frontend:** Connect the root directory to Cloudflare Pages.
3.  **Service Worker:** Optimized for Cloudflare's "Pretty URLs" and bypasses caching for video `206` responses.

## 📜 License
This project is licensed under the **MIT License**. You are free to use, modify, and distribute this software, provided that all copies include the original copyright notice and license.

---
*Created with ❤️ Codecraft by syed*
