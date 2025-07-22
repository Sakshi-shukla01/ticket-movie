import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  _id: {
    type: String, // usually Clerk user ID or similar external UID
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true // optional: trims whitespace
  },
  email: {
    type: String,
    required: true,
    lowercase: true, // ensures consistency
    unique: true // optional: avoids duplicates
  },
  image: {
    type: String,
    required: true
  }
}, { timestamps: true }); // optional: adds createdAt & updatedAt

const User = mongoose.model('User', userSchema);

export default User;
