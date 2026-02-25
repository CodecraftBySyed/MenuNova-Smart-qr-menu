import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const seedAdmin = async () => {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    // 2. Check if admin already exists
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('⚠️ Admin user already exists. No changes made.');
      process.exit();
    }

    // 3. Create Admin User
    const username = 'admin';
    const password = 'admin123';

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save to DB
    const newUser = new User({
      email: username, // Using 'email' field for username as per schema
      password: hashedPassword
    });

    await newUser.save();

    console.log('🎉 Success! Admin user created.');
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Password: ${password}`);

    process.exit();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

seedAdmin();
