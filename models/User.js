import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  image: String
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
