import mongoose from 'mongoose';

// Simple User schema for Admin
const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  whatsappEnabled: {
    type: Boolean,
    default: false
  },
  whatsappNumber: {
    type: String,
    default: null
  }
}, {
  collection: 'users' // Explicitly set collection name to 'users'
});

export default mongoose.model('User', userSchema);
