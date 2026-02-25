import express from 'express';
const router = express.Router();
import auth from '../middleware/auth.js';
import Menu from '../models/Menu.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Cloudinary configuration via environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// Storage configuration for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'qr-menu',
    resource_type: 'image'
  })
});

// Only accept images
function imageFileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|webp/;
  const mimetypeOk = allowed.test(file.mimetype.toLowerCase());
  if (mimetypeOk) return cb(null, true);
  cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed'));
}

const upload = multer({ 
  storage, 
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// @route   GET /api/menu
// @desc    Get all menu items
// @access  Public
router.get('/', async (req, res) => {
  try {
    const menu = await Menu.find();
    res.json(menu);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/menu
// @desc    Add new menu item
// @access  Private (Admin only)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ msg: 'Cloudinary is not configured on server' });
    }
    console.log('POST /api/menu body:', req.body);
    console.log('POST /api/menu file meta:', req.file ? {
      fieldname: req.file.fieldname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : null);
    const imageUrl = req.file && (req.file.path || req.file.secure_url);
    if (!imageUrl) return res.status(400).json({ msg: 'Image file is required' });
    const payload = { ...req.body };
    // Normalize tags if sent as JSON string or plain string
    if (typeof payload.tags === 'string') {
      try {
        const parsed = JSON.parse(payload.tags);
        payload.tags = Array.isArray(parsed) ? parsed : [String(parsed)];
      } catch {
        payload.tags = payload.tags ? [String(payload.tags)] : [];
      }
    }
    payload.image = imageUrl; // Cloudinary secure URL
    const newMenu = new Menu(payload);
    const menu = await newMenu.save();
    res.json(menu);
  } catch (err) {
    console.error('POST /api/menu error:', err);
    return res.status(400).json({ msg: err.message || 'Upload failed' });
  }
});

// @route   PUT /api/menu/:id
// @desc    Update menu item
// @access  Private (Admin only)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    // Only require Cloudinary config if a new file is uploaded
    if (req.file && !isCloudinaryConfigured()) {
      return res.status(500).json({ msg: 'Cloudinary is not configured on server' });
    }
    console.log(`PUT /api/menu/${req.params.id} body:`, req.body);
    console.log(`PUT /api/menu/${req.params.id} file meta:`, req.file ? {
      fieldname: req.file.fieldname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : null);
    const item = await Menu.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ msg: 'Menu item not found' });
    }

    // Merge fields from body
    const fields = ['name', 'category', 'price', 'rating', 'desc', 'tags', 'special', 'isAvailable', 'image'];
    fields.forEach(f => {
      if (typeof req.body[f] !== 'undefined' && f !== 'image') {
        if (f === 'tags' && typeof req.body[f] === 'string') {
          try {
            const parsed = JSON.parse(req.body[f]);
            item[f] = Array.isArray(parsed) ? parsed : [String(parsed)];
          } catch {
            item[f] = req.body[f] ? [String(req.body[f])] : [];
          }
        } else if ((f === 'price' || f === 'rating') && req.body[f] !== null) {
          const num = Number(req.body[f]);
          if (!Number.isNaN(num)) item[f] = num;
        } else if ((f === 'special' || f === 'isAvailable')) {
          if (typeof req.body[f] === 'string') {
            item[f] = req.body[f] === 'true';
          } else {
            item[f] = Boolean(req.body[f]);
          }
        } else {
          item[f] = req.body[f];
        }
      }
    });

    // Handle image: replace only if new file provided; otherwise keep existing
    if (req.file) {
      const imageUrl = req.file.path || req.file.secure_url;
      if (imageUrl) item.image = imageUrl;
    }

    const updated = await item.save();
    res.json(updated);
  } catch (err) {
    console.error(`PUT /api/menu/${req.params.id} error:`, err);
    return res.status(400).json({ msg: err.message || 'Upload failed' });
  }
});

// Multer/Cloudinary error handler for this router
router.use((err, req, res, next) => {
  if (err) {
    console.error('Multer/Cloudinary error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ msg: 'Image too large. Max size is 5MB' });
    }
    const message = (err && err.message) ? err.message : 'Upload error';
    return res.status(400).json({ msg: message });
  }
  next();
});

// @route   PUT /api/menu/:id/toggle-availability
// @desc    Toggle availability of a menu item (flip isAvailable)
// @access  Private (Admin only)
router.put('/:id/toggle-availability', auth, async (req, res) => {
  try {
    const item = await Menu.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ msg: 'Menu item not found' });
    }
    const current = item.isAvailable !== false;
    item.isAvailable = !current;
    await item.save();
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/menu/:id
// @desc    Delete menu item
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      return res.status(404).json({ msg: 'Menu item not found' });
    }
    
    await Menu.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Menu item removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router;
