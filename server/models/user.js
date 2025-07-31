import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: String, // Clerk user ID as _id
  name: String,
  email: String,
  image: String,
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
});

const User = mongoose.model("User", userSchema);
export default User;
