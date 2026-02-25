import mongoose from 'mongoose';

// Schema matches the JSON structure provided by the user
// strict: false allows for flexible schema if fields change in future
const menuSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  rating: Number,
  desc: String,
  image: String, // Storing Image URL as string
  tags: [String],
  special: Boolean,
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { 
  strict: false,
  collection: 'menu' // Explicitly set collection name to 'menu' (singular)
});

export default mongoose.model('Menu', menuSchema);
