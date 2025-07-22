import mongoose from 'mongoose';

const connectDB = async () => {
  // If already connected, skip
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
};

export default connectDB;
