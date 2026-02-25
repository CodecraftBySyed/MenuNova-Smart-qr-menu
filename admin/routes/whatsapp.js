import express from 'express';
const router = express.Router();
import auth from '../middleware/auth.js';
import User from '../models/User.js';

// @route   GET /api/whatsapp/settings
// @desc    Get WhatsApp settings
// @access  Public
router.get('/settings', async (req, res) => {
  try {
    const user = await User.findOne({});
    if (!user) {
      return res.json({ enabled: false, number: null });
    }
    res.json({ 
      enabled: user.whatsappEnabled || false, 
      number: user.whatsappNumber || null 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/whatsapp/settings
// @desc    Save WhatsApp settings
// @access  Private (Admin only)
router.post('/settings', auth, async (req, res) => {
  const { enabled, number } = req.body;

  try {
    let user = await User.findOne({});
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Validate number format if enabled
    if (enabled && number) {
      if (!/^\d{10,15}$/.test(number)) {
        return res.status(400).json({ msg: 'Invalid WhatsApp number format' });
      }
      user.whatsappNumber = number;
    }

    user.whatsappEnabled = enabled;
    await user.save();

    res.json({ 
      msg: 'WhatsApp settings updated', 
      enabled: user.whatsappEnabled, 
      number: user.whatsappNumber 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/whatsapp/settings
// @desc    Delete WhatsApp number
// @access  Private (Admin only)
router.delete('/settings', auth, async (req, res) => {
  try {
    const user = await User.findOne({});
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.whatsappEnabled = false;
    user.whatsappNumber = null;
    await user.save();

    res.json({ msg: 'WhatsApp settings deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router;
