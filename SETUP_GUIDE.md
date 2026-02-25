# 🚀 MenuNova Client Deployment Checklist

**Client Name:** ____________________  
**Deployment Date:** ________________  
**Model:** [ ] Static (₹1999) | [ ] Dynamic (₹3999)

---

## 1. Infrastructure Provisioning
- [ ] **Cloudinary:** - Create folder: `clients/[client-name]`.
    - Upload initial menu images.
    - Copy `Cloud Name`, `API Key`, and `API Secret`.
- [ ] **MongoDB Atlas:** - Create a new Database: `menunova-[client-name]`.
    - Create a Database User with read/write access.
    - Whitelist IP addresses (`0.0.0.0/0` for Render).
- [ ] **Render (Backend):** - Deploy Node.js Web Service.
    - Set Environment Variables:
        - `PORT=5000`
        - `MONGODB_URI=...`
        - `JWT_SECRET=...`
        - `CLOUDINARY_NAME=...`

## 2. Frontend Configuration
- [ ] **API URL:** Update `js/config.js` to point to the new Render URL.
- [ ] **Branding:** Update `index.html` title and footer with the client’s name.
- [ ] **Service Worker:** Bump version in `sw.js` (e.g., `v1` -> `v2`) to clear old cache.

## 3. Final Testing & Handover
- [ ] **QR Test:** Scan generated QR code; verify images load from Cloudinary.
- [ ] **WhatsApp Test:** Add an item to cart and verify it opens WhatsApp with the correct message.
- [ ] **Admin Test:** Login to `admin.html`, add a test item, and delete it.
- [ ] **Handover:** Send the client their Admin credentials and the high-resolution QR image for printing.